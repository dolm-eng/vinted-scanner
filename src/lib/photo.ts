// Studio photo 100 % local : aucune image ne quitte le téléphone.
// Principe : on estime la couleur du fond à partir des bords de la photo, on isole
// l'article (tout ce qui est connecté aux bords et proche de cette couleur = fond),
// puis on corrige la lumière, on recadre et on remplace le fond.
// Ça marche bien sur un fond assez uniforme (drap, mur, sol) ; si l'article a la
// même couleur que le fond, on se rabat sur une simple correction de lumière.

export type BgStyle = "original" | "blanc" | "lin" | "beton" | "noir" | "bois";

export const BG_STYLES: { value: BgStyle; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "blanc", label: "Studio blanc" },
  { value: "lin", label: "Lin beige" },
  { value: "beton", label: "Béton" },
  { value: "noir", label: "Studio noir" },
  { value: "bois", label: "Bois" },
];

export interface EnhanceOptions {
  bg: BgStyle;
  crop: boolean;
  levels: boolean;
}

export interface EnhanceResult {
  dataUrl: string;
  isolated: boolean; // l'article a pu être détecté
  note?: string;
}

const MAX_SIDE = 1400;
const MASK_SIDE = 480;
const OUT_W = 1200;
const OUT_H = 1500;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = src;
  });
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas indisponible");
  return { canvas, ctx };
}

/** Réduit une image pour limiter le poids stocké sur le téléphone. */
export async function downscale(
  src: string,
  maxSide = MAX_SIDE,
  quality = 0.85
): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Détection de l'article
// ---------------------------------------------------------------------------

interface Mask {
  data: Uint8Array; // 1 = article, 0 = fond
  w: number;
  h: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  fraction: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function computeMask(rgba: Uint8ClampedArray, w: number, h: number): Mask | null {
  const ring = Math.max(2, Math.round(0.03 * Math.min(w, h)));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < ring || x >= w - ring || y < ring || y >= h - ring) {
        const i = (y * w + x) * 4;
        rs.push(rgba[i]);
        gs.push(rgba[i + 1]);
        bs.push(rgba[i + 2]);
      }
    }
  }
  const bgR = median(rs);
  const bgG = median(gs);
  const bgB = median(bs);

  const dist = new Float32Array(w * h);
  let ringSum = 0;
  let ringCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dr = rgba[i] - bgR;
      const dg = rgba[i + 1] - bgG;
      const db = rgba[i + 2] - bgB;
      const d = Math.sqrt(dr * dr + dg * dg + db * db);
      dist[y * w + x] = d;
      if (x < ring || x >= w - ring || y < ring || y >= h - ring) {
        ringSum += d;
        ringCount++;
      }
    }
  }
  const ringMean = ringSum / Math.max(1, ringCount);
  const threshold = Math.min(70, Math.max(30, ringMean * 2.2 + 22));

  // Fond = pixels proches de la couleur du bord ET connectés au bord.
  const isBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (idx: number) => {
    if (isBg[idx] === 0 && dist[idx] <= threshold) {
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + (w - 1));
  }
  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) push(idx - 1);
    if (x < w - 1) push(idx + 1);
    if (y > 0) push(idx - w);
    if (y < h - 1) push(idx + w);
  }

  // Article = tout le reste ; on garde les composantes significatives.
  const subject = new Uint8Array(w * h);
  for (let i = 0; i < subject.length; i++) subject[i] = isBg[i] ? 0 : 1;

  const label = new Int32Array(w * h);
  const sizes: number[] = [0];
  let nextLabel = 1;
  for (let start = 0; start < subject.length; start++) {
    if (subject[start] === 0 || label[start] !== 0) continue;
    let size = 0;
    head = 0;
    tail = 0;
    queue[tail++] = start;
    label[start] = nextLabel;
    while (head < tail) {
      const idx = queue[head++];
      size++;
      const x = idx % w;
      const y = (idx - x) / w;
      const neighbours = [
        x > 0 ? idx - 1 : -1,
        x < w - 1 ? idx + 1 : -1,
        y > 0 ? idx - w : -1,
        y < h - 1 ? idx + w : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && subject[n] === 1 && label[n] === 0) {
          label[n] = nextLabel;
          queue[tail++] = n;
        }
      }
    }
    sizes.push(size);
    nextLabel++;
  }
  const largest = Math.max(...sizes);
  if (largest <= 0) return null;
  const keep = sizes.map((s) => s >= largest * 0.08);

  const data = new Uint8Array(w * h);
  let count = 0;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = label[y * w + x];
      if (l > 0 && keep[l]) {
        data[y * w + x] = 1;
        count++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const fraction = count / (w * h);
  if (fraction < 0.04 || fraction > 0.92 || x1 < 0) return null;

  // Érosion d'un pixel : évite le liseré de couleur du fond autour de l'article.
  const eroded = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (
        data[i] &&
        data[i - 1] &&
        data[i + 1] &&
        data[i - w] &&
        data[i + w]
      ) {
        eroded[i] = 1;
      }
    }
  }

  return { data: eroded, w, h, bbox: { x0, y0, x1, y1 }, fraction };
}

function maskToCanvas(mask: Mask): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(mask.w, mask.h);
  const img = ctx.createImageData(mask.w, mask.h);
  // Léger flou 3x3 pour adoucir les bords une fois agrandi.
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < mask.w && yy >= 0 && yy < mask.h) {
            sum += mask.data[yy * mask.w + xx];
            n++;
          }
        }
      }
      const i = (y * mask.w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round((sum / n) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------------------
// Lumière
// ---------------------------------------------------------------------------

function applyLevels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  smallRGBA: Uint8ClampedArray,
  mask: Mask | null
) {
  // Percentiles de luminance mesurés sur l'article (ou toute l'image à défaut).
  const hist = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < smallRGBA.length; i += 4) {
    if (mask && mask.data[i / 4] === 0) continue;
    const lum = Math.round(
      0.299 * smallRGBA[i] + 0.587 * smallRGBA[i + 1] + 0.114 * smallRGBA[i + 2]
    );
    hist[lum]++;
    total++;
  }
  if (total === 0) return;
  const percentile = (p: number) => {
    const target = total * p;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= target) return v;
    }
    return 255;
  };
  // On limite l'étirement pour ne pas "griser" un vêtement volontairement sombre.
  const lo = Math.min(percentile(0.02), 30);
  const hi = Math.max(percentile(0.98), 200);
  if (hi - lo < 40) return;

  const scale = 255 / (hi - lo);
  const saturation = 1.08;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - lo) * scale;
    let g = (d[i + 1] - lo) * scale;
    let b = (d[i + 2] - lo) * scale;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------------------
// Fonds
// ---------------------------------------------------------------------------

function rng(seed: number) {
  // mulberry32 : bruit reproductible, le rendu ne "scintille" pas entre deux aperçus.
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: Exclude<BgStyle, "original">
) {
  const rand = rng(42);
  switch (style) {
    case "blanc": {
      const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.1, w / 2, h * 0.5, h * 0.85);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#e6e3dc");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "lin": {
      ctx.fillStyle = "#d9ccb3";
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = `rgba(120,100,70,${0.025 + rand() * 0.03})`;
        ctx.fillRect(0, y, w, 1);
      }
      for (let x = 0; x < w; x += 3) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.03})`;
        ctx.fillRect(x, 0, 1, h);
      }
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = `rgba(90,70,40,${rand() * 0.07})`;
        ctx.fillRect(rand() * w, rand() * h, 2, 2);
      }
      break;
    }
    case "beton": {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#a2a29d");
      g.addColorStop(1, "#7f7f7a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 16000; i++) {
        const v = rand() > 0.5 ? 255 : 0;
        ctx.fillStyle = `rgba(${v},${v},${v},${rand() * 0.09})`;
        const s = 1 + rand() * 3;
        ctx.fillRect(rand() * w, rand() * h, s, s);
      }
      break;
    }
    case "noir": {
      const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.05, w / 2, h * 0.5, h * 0.8);
      g.addColorStop(0, "#34312e");
      g.addColorStop(1, "#0d0c0b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "bois": {
      const planks = 6;
      const ph = h / planks;
      const tones = ["#a77d52", "#9d7449", "#b08558", "#a07650", "#aa8056", "#98704a"];
      for (let p = 0; p < planks; p++) {
        ctx.fillStyle = tones[p % tones.length];
        ctx.fillRect(0, p * ph, w, ph);
        for (let i = 0; i < 60; i++) {
          const y = p * ph + rand() * ph;
          const x = rand() * w;
          const len = 120 + rand() * 520;
          ctx.fillStyle =
            rand() > 0.5
              ? `rgba(60,35,15,${0.05 + rand() * 0.07})`
              : `rgba(255,230,190,${0.04 + rand() * 0.05})`;
          ctx.fillRect(x, y, len, 1 + rand() * 2);
        }
        ctx.fillStyle = "rgba(40,22,8,0.55)";
        ctx.fillRect(0, p * ph, w, 3);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

export async function enhance(
  src: string,
  opts: EnhanceOptions
): Promise<EnhanceResult> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.max(1, Math.round(img.naturalWidth * scale));
  const H = Math.max(1, Math.round(img.naturalHeight * scale));

  const base = makeCanvas(W, H);
  base.ctx.drawImage(img, 0, 0, W, H);

  // Analyse en basse résolution.
  const ms = Math.min(1, MASK_SIDE / Math.max(W, H));
  const sw = Math.max(8, Math.round(W * ms));
  const sh = Math.max(8, Math.round(H * ms));
  const small = makeCanvas(sw, sh);
  small.ctx.drawImage(base.canvas, 0, 0, sw, sh);
  const smallData = small.ctx.getImageData(0, 0, sw, sh).data;

  const needsMask = opts.bg !== "original" || opts.crop;
  const mask = needsMask ? computeMask(smallData, sw, sh) : null;

  if (opts.levels) {
    applyLevels(base.ctx, W, H, smallData, mask);
  }

  // Cas "article non isolable" : on ne touche qu'à la lumière.
  if (needsMask && !mask) {
    return {
      dataUrl: base.canvas.toDataURL("image/jpeg", 0.88),
      isolated: false,
      note: "Le fond est trop proche de l'article pour l'isoler : seule la lumière a été corrigée. Essaie sur un drap ou un mur uni de couleur différente.",
    };
  }

  if (!mask) {
    return { dataUrl: base.canvas.toDataURL("image/jpeg", 0.88), isolated: false };
  }

  const bx0 = Math.max(0, Math.floor((mask.bbox.x0 / sw) * W));
  const by0 = Math.max(0, Math.floor((mask.bbox.y0 / sh) * H));
  const bx1 = Math.min(W, Math.ceil(((mask.bbox.x1 + 1) / sw) * W));
  const by1 = Math.min(H, Math.ceil(((mask.bbox.y1 + 1) / sh) * H));
  const bw = bx1 - bx0;
  const bh = by1 - by0;

  // Fond d'origine conservé : simple recadrage autour de l'article.
  if (opts.bg === "original") {
    if (!opts.crop) {
      return { dataUrl: base.canvas.toDataURL("image/jpeg", 0.88), isolated: true };
    }
    const pad = Math.round(Math.max(bw, bh) * 0.08);
    const cx0 = Math.max(0, bx0 - pad);
    const cy0 = Math.max(0, by0 - pad);
    const cx1 = Math.min(W, bx1 + pad);
    const cy1 = Math.min(H, by1 + pad);
    const out = makeCanvas(cx1 - cx0, cy1 - cy0);
    out.ctx.drawImage(base.canvas, cx0, cy0, cx1 - cx0, cy1 - cy0, 0, 0, cx1 - cx0, cy1 - cy0);
    return { dataUrl: out.canvas.toDataURL("image/jpeg", 0.88), isolated: true };
  }

  // Détourage : photo ∩ masque agrandi.
  const maskCanvas = maskToCanvas(mask);
  const cut = makeCanvas(W, H);
  cut.ctx.drawImage(base.canvas, 0, 0);
  cut.ctx.globalCompositeOperation = "destination-in";
  cut.ctx.imageSmoothingEnabled = true;
  cut.ctx.imageSmoothingQuality = "high";
  cut.ctx.drawImage(maskCanvas, 0, 0, W, H);

  const out = makeCanvas(OUT_W, OUT_H);
  paintBackground(out.ctx, OUT_W, OUT_H, opts.bg);

  const fit = Math.min((OUT_W * 0.84) / bw, (OUT_H * 0.84) / bh);
  const dw = bw * fit;
  const dh = bh * fit;
  const dx = (OUT_W - dw) / 2;
  const dy = (OUT_H - dh) / 2 - OUT_H * 0.015;

  out.ctx.save();
  out.ctx.shadowColor = opts.bg === "noir" ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.28)";
  out.ctx.shadowBlur = 36;
  out.ctx.shadowOffsetY = 16;
  out.ctx.imageSmoothingEnabled = true;
  out.ctx.imageSmoothingQuality = "high";
  out.ctx.drawImage(cut.canvas, bx0, by0, bw, bh, dx, dy, dw, dh);
  out.ctx.restore();

  return { dataUrl: out.canvas.toDataURL("image/jpeg", 0.9), isolated: true };
}
