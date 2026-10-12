// Studio photo 100 % local : aucune image ne quitte le téléphone. Détourage par IA (modèle hébergé avec l’appli), avec repli sur une détection de fond uni.
// Principe : on estime la couleur du fond à partir des bords de la photo, on isole
// l'article (tout ce qui est connecté aux bords et proche de cette couleur = fond),
// puis on corrige la lumière, on recadre et on remplace le fond.
// Ça marche bien sur un fond assez uniforme (drap, mur, sol) ; si l'article a la
// même couleur que le fond, on se rabat sur une simple correction de lumière.

export type BgStyle =
  | "original"
  | "moquette"
  | "tapis"
  | "blanc"
  | "lin"
  | "beton"
  | "noir"
  | "bois";

export const DEFAULT_BG: BgStyle = "moquette";

export const BG_STYLES: { value: BgStyle; label: string }[] = [
  { value: "moquette", label: "Moquette" },
  { value: "tapis", label: "Tapis vintage" },
  { value: "blanc", label: "Studio blanc" },
  { value: "original", label: "Original" },
  { value: "lin", label: "Lin beige" },
  { value: "beton", label: "Béton" },
  { value: "noir", label: "Studio noir" },
  { value: "bois", label: "Bois" },
];

export interface EnhanceOptions {
  bg: BgStyle;
  crop: boolean;
  levels: boolean;
  /** Atténue les ombres des plis (rendu "repassé"). Optionnel pour rester compatible. */
  iron?: boolean;
}

// Détourage par IA (modèle ONNX hébergé avec l'appli, exécuté sur le téléphone).
// Résultat mis en cache par photo : changer de fond ne relance pas le calcul.
const aiCache = new Map<string, Promise<HTMLImageElement | null>>();
// Dernière erreur du détourage IA, affichée à l'utilisateur pour savoir quoi corriger.
let lastAiError: string | null = null;
// Le modèle travaille en 1024 px : inutile (et risqué en mémoire sur iPhone) de lui donner plus.
const AI_INPUT_SIDE = 1024;

function aiCutout(src: string): Promise<HTMLImageElement | null> {
  let p = aiCache.get(src);
  if (!p) {
    p = (async () => {
      try {
        const input = await downscale(src, AI_INPUT_SIDE, 0.92);
        const { removeBackground } = await import("@imgly/background-removal");
        const run = (proxyToWorker: boolean) =>
          removeBackground(input, {
            publicPath: `${window.location.origin}/imgly/`,
            model: "small",
            proxyToWorker,
            output: { format: "image/png" },
          });
        let blob: Blob;
        try {
          blob = await run(true);
        } catch (e) {
          // Safari iOS refuse parfois le worker : on retente dans le fil principal.
          console.warn("Détourage IA (worker) en échec, nouvel essai sans worker", e);
          blob = await run(false);
        }
        lastAiError = null;
        const url = URL.createObjectURL(blob);
        try {
          return await loadImage(url);
        } finally {
          // l'image est déjà décodée une fois onload passé
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (e) {
        console.warn("Détourage IA indisponible", e);
        lastAiError = e instanceof Error ? e.message : String(e);
        aiCache.delete(src);
        return null;
      }
    })();
    aiCache.set(src, p);
  }
  return p;
}

/** Transforme la sortie de l'IA (PNG transparent) en masque de la même forme que computeMask. */
function maskFromCutout(
  cutout: HTMLImageElement,
  W: number,
  H: number,
  sw: number,
  sh: number
): { mask: Mask; maskCanvas: HTMLCanvasElement } | null {
  const full = makeCanvas(W, H);
  full.ctx.drawImage(cutout, 0, 0, W, H);
  const fd = full.ctx.getImageData(0, 0, W, H);
  // Masque plein format : blanc + alpha de l'IA (bords doux conservés).
  for (let i = 0; i < fd.data.length; i += 4) {
    fd.data[i] = 255;
    fd.data[i + 1] = 255;
    fd.data[i + 2] = 255;
  }
  full.ctx.putImageData(fd, 0, 0);

  const small = makeCanvas(sw, sh);
  small.ctx.drawImage(full.canvas, 0, 0, sw, sh);
  const sd = small.ctx.getImageData(0, 0, sw, sh).data;
  const data = new Uint8Array(sw * sh);
  let count = 0;
  let x0 = sw;
  let y0 = sh;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (sd[(y * sw + x) * 4 + 3] > 128) {
        data[y * sw + x] = 1;
        count++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const fraction = count / (sw * sh);
  if (fraction < 0.02 || x1 < 0) return null;
  return {
    mask: { data, w: sw, h: sh, bbox: { x0, y0, x1, y1 }, fraction },
    maskCanvas: full.canvas,
  };
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
// Cadrage : objet principal, redressement, boîte englobante
// ---------------------------------------------------------------------------

/** Ne garde que l'article (plus grande zone) et les morceaux importants qui le touchent presque. */
function keepMainObject(mask: Mask): Mask {
  const { w, h, data } = mask;
  const label = new Int32Array(w * h);
  const queue = new Int32Array(w * h);
  const comps: { size: number; x0: number; y0: number; x1: number; y1: number }[] = [
    { size: 0, x0: 0, y0: 0, x1: 0, y1: 0 },
  ];
  for (let start = 0; start < data.length; start++) {
    if (!data[start] || label[start]) continue;
    const id = comps.length;
    const c = { size: 0, x0: w, y0: h, x1: -1, y1: -1 };
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    label[start] = id;
    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx - x) / w;
      c.size++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      // 8-connexité : les fines bretelles / lacets restent attachés
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const n = yy * w + xx;
          if (data[n] && !label[n]) {
            label[n] = id;
            queue[tail++] = n;
          }
        }
      }
    }
    comps.push(c);
  }
  if (comps.length <= 2) return mask;
  let main = 1;
  for (let i = 2; i < comps.length; i++) if (comps[i].size > comps[main].size) main = i;
  const M = comps[main];
  const gap = Math.round(Math.max(w, h) * 0.04);
  const keep = comps.map(
    (c, i) =>
      i === main ||
      (i > 0 &&
        c.size >= M.size * 0.12 &&
        c.x1 >= M.x0 - gap &&
        c.x0 <= M.x1 + gap &&
        c.y1 >= M.y0 - gap &&
        c.y0 <= M.y1 + gap)
  );
  const out = new Uint8Array(w * h);
  let count = 0;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < out.length; i++) {
    if (!keep[label[i]]) continue;
    out[i] = 1;
    count++;
    const x = i % w;
    const y = (i - x) / w;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { data: out, w, h, bbox: { x0, y0, x1, y1 }, fraction: count / (w * h) };
}

function dilate(mask: Mask, r: number): Mask {
  const { w, h, data } = mask;
  let cur = data;
  for (let k = 0; k < r; k++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        next[i] =
          cur[i] ||
          (x > 0 && cur[i - 1]) ||
          (x < w - 1 && cur[i + 1]) ||
          (y > 0 && cur[i - w]) ||
          (y < h - 1 && cur[i + w])
            ? 1
            : 0;
      }
    }
    cur = next;
  }
  return { ...mask, data: cur };
}

/**
 * Angle (radians) qui rend la silhouette symétrique gauche/droite : un vêtement posé
 * à plat l'est presque toujours. Renvoie 0 si l'article n'est pas symétrique
 * (chaussure de profil, sac…) ou déjà droit.
 */
function symmetryAngle(mask: Mask): number {
  const { w, h, data } = mask;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x]) {
        sx += x;
        sy += y;
        n++;
      }
    }
  }
  if (n < 200) return 0;
  const cx = sx / n;
  const cy = sy / n;
  const step = Math.max(1, Math.round(Math.sqrt(n / 6000)));
  const score = (a: number) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    let hit = 0;
    let tot = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (!data[y * w + x]) continue;
        const px = x - cx;
        const py = y - cy;
        // position une fois redressé, puis miroir, puis retour dans l'image d'origine
        const qx = -(px * c - py * s);
        const qy = px * s + py * c;
        const mx = Math.round(cx + qx * c + qy * s);
        const my = Math.round(cy - qx * s + qy * c);
        tot++;
        if (mx >= 0 && my >= 0 && mx < w && my < h && data[my * w + mx]) hit++;
      }
    }
    return tot ? hit / tot : 0;
  };
  const deg = Math.PI / 180;
  const s0 = score(0);
  let best = 0;
  let bestScore = s0;
  for (let a = -20; a <= 20; a += 1) {
    const sc = score(a * deg);
    if (sc > bestScore) {
      bestScore = sc;
      best = a;
    }
  }
  for (let a = best - 0.75; a <= best + 0.75; a += 0.25) {
    const sc = score(a * deg);
    if (sc > bestScore) {
      bestScore = sc;
      best = a;
    }
  }
  // On ne tourne que si la silhouette devient franchement symétrique.
  if (Math.abs(best) < 1.5 || bestScore < 0.86 || bestScore - s0 < 0.025) return 0;
  return best * deg;
}

/** Boîte englobante des pixels opaques d'un canevas (analyse en basse résolution). */
function alphaBBox(canvas: HTMLCanvasElement): { x: number; y: number; w: number; h: number } | null {
  const scale = Math.min(1, 500 / Math.max(canvas.width, canvas.height));
  const sw = Math.max(1, Math.round(canvas.width * scale));
  const sh = Math.max(1, Math.round(canvas.height * scale));
  const small = makeCanvas(sw, sh);
  small.ctx.drawImage(canvas, 0, 0, sw, sh);
  const d = small.ctx.getImageData(0, 0, sw, sh).data;
  let x0 = sw;
  let y0 = sh;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (d[(y * sw + x) * 4 + 3] > 96) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const X0 = Math.max(0, Math.floor((x0 - 1) / scale));
  const Y0 = Math.max(0, Math.floor((y0 - 1) / scale));
  const X1 = Math.min(canvas.width, Math.ceil((x1 + 2) / scale));
  const Y1 = Math.min(canvas.height, Math.ceil((y1 + 2) / scale));
  return { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 };
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
// Défroissage
// ---------------------------------------------------------------------------

/** Flou boîte séparable (3 passes ≈ gaussien), en place. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src;
  let a: Float32Array = src;
  const b: Float32Array = new Float32Array(w * h);
  const win = 2 * r + 1;
  for (let pass = 0; pass < 3; pass++) {
    // horizontal a -> b
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / win;
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    // vertical b -> a
    if (a === src) a = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / win;
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

/**
 * "Repassage" numérique : les plis sont des ombres douces (la luminosité varie mais
 * pas la couleur). On compare la luminosité locale à celle du tissu autour et on
 * compense l'écart, sauf sur les imprimés, coutures et zones d'une autre couleur
 * (contours nets ou teinte différente), qui restent intacts.
 */
function ironGarment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number
) {
  if (w < 16 || h < 16) return;
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const n = w * h;
  const S = Math.max(w, h);
  const L = new Float32Array(n);
  const cb = new Float32Array(n);
  const cr = new Float32Array(n);
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    const r = d[k];
    const g = d[k + 1];
    const b = d[k + 2];
    L[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    cb[i] = b - L[i];
    cr[i] = r - L[i];
    m[i] = d[k + 3] > 200 ? 1 : 0;
  }

  // Flou normalisé : ignore le fond transparent (pas de halo sur les bords).
  const nblur = (v: Float32Array, wgt: Float32Array, r: number) => {
    const vw = new Float32Array(n);
    for (let i = 0; i < n; i++) vw[i] = v[i] * wgt[i];
    const num = boxBlur(vw, w, h, r);
    const den = boxBlur(Float32Array.from(wgt), w, h, r);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = den[i] > 1e-3 ? num[i] / den[i] : v[i];
    return out;
  };

  const EPS = 6;
  const rFine = Math.max(1, Math.round(S * 0.002));
  const rMid = Math.max(2, Math.round(S * 0.005));
  const rLarge = Math.max(4, Math.round(S * 0.07));

  // 1) Détails nets (imprimés, coutures, boutons) : contraste fort sur quelques pixels.
  //    Un pli, lui, est une ombre progressive : il n'est presque pas détecté ici.
  const fine = nblur(L, m, rFine);
  const edge = new Float32Array(n);
  for (let i = 0; i < n; i++) edge[i] = (m[i] * Math.abs(L[i] - fine[i])) / (fine[i] + 40);
  const edgeDensity = boxBlur(edge, w, h, Math.max(2, Math.round(S * 0.006)));
  const keep = new Float32Array(n); // tissu "neutre" servant de référence
  for (let i = 0; i < n; i++) keep[i] = m[i] * (1 - smoothstep(0.06, 0.16, edgeDensity[i]));

  // 2) Niveau local (rayures et grain lissés) vs. niveau du tissu autour (imprimés exclus).
  const Ls = nblur(L, m, rMid);
  const Lb = nblur(L, keep, rLarge);
  const cbS = nblur(cb, m, rMid);
  const crS = nblur(cr, m, rMid);
  const cbB = nblur(cb, keep, rLarge);
  const crB = nblur(cr, keep, rLarge);

  // 3) Champ de correction (log), lissé pour ne jamais créer de contour.
  const strength = 0.88;
  const corr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    const lr = Math.log((Ls[i] + EPS) / (Lb[i] + EPS));
    // Écart trop fort ou teinte différente = autre zone du vêtement, pas un pli.
    const plausible = 1 - smoothstep(0.42, 0.62, Math.abs(lr));
    const dc = Math.hypot(cbS[i] - cbB[i], crS[i] - crB[i]);
    const sameColor = 1 - smoothstep(9, 20, dc);
    const nearPrint = smoothstep(0.08, 0.2, edgeDensity[i]);
    corr[i] = -lr * strength * plausible * sameColor * (1 - 0.85 * nearPrint);
  }
  const field = nblur(corr, m, Math.max(1, Math.round(S * 0.003)));
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    const f = Math.exp(Math.max(-0.5, Math.min(0.5, field[i])));
    const k = i * 4;
    d[k] = Math.min(255, d[k] * f);
    d[k + 1] = Math.min(255, d[k + 1] * f);
    d[k + 2] = Math.min(255, d[k + 2] * f);
  }
  ctx.putImageData(img, x0, y0);
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

/** Bruit doux : petite grille aléatoire agrandie (taches nuageuses). `stretch` > 1 étire en largeur. */
function smoothNoise(
  w: number,
  h: number,
  cells: number,
  rand: () => number,
  stretch = 1
): Float32Array {
  const gw = cells;
  const gh = Math.max(2, Math.round((cells * h * stretch) / w));
  const grid = makeCanvas(gw, gh);
  const gd = grid.ctx.createImageData(gw, gh);
  for (let i = 0; i < gd.data.length; i += 4) {
    const v = Math.round(rand() * 255);
    gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v;
    gd.data[i + 3] = 255;
  }
  grid.ctx.putImageData(gd, 0, 0);
  const big = makeCanvas(w, h);
  big.ctx.imageSmoothingEnabled = true;
  big.ctx.imageSmoothingQuality = "high";
  big.ctx.drawImage(grid.canvas, 0, 0, w, h);
  const bd = big.ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = bd[i * 4] / 255;
  return out;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Moquette berbère beige/crème finement marbrée, comme sur les annonces "flat lay". */
function paintMoquette(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const n1 = smoothNoise(w, h, 70, rand, 0.55);
  const n2 = smoothNoise(w, h, 170, rand, 0.5);
  const n3 = smoothNoise(w, h, 380, rand, 0.6);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const dark = [201, 191, 177];
  const light = [236, 231, 222];
  for (let i = 0; i < w * h; i++) {
    const v = n1[i] * 0.4 + n2[i] * 0.4 + n3[i] * 0.2;
    const t = smoothstep(0.4, 0.6, v);
    const grain = (rand() - 0.5) * 18;
    const k = i * 4;
    d[k] = dark[0] + (light[0] - dark[0]) * t + grain;
    d[k + 1] = dark[1] + (light[1] - dark[1]) * t + grain;
    d[k + 2] = dark[2] + (light[2] - dark[2]) * t + grain * 0.9;
    d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Boucles de laine : petits points clairs/foncés.
  for (let i = 0; i < 30000; i++) {
    const isLight = rand() > 0.5;
    ctx.fillStyle = isLight
      ? `rgba(248,244,236,${0.12 + rand() * 0.22})`
      : `rgba(160,146,128,${0.08 + rand() * 0.14})`;
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, 0.8 + rand() * 1.8, 0.6 + rand() * 1.2, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Légère lumière naturelle venant du haut.
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(60,45,30,0.08)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Tapis persan délavé, dessiné nœud par nœud (1 pixel = 1 nœud) puis agrandi :
 * les losanges "en escalier" viennent naturellement de la grille, comme un vrai tissage.
 */
function paintTapis(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const K = 5; // taille d'un nœud en pixels
  const lw = Math.round(w / K);
  const lh = Math.round(h / K);
  type RGB = [number, number, number];
  const P: Record<string, RGB> = {
    field: [205, 140, 120],
    rose: [222, 168, 146],
    cream: [236, 222, 198],
    sand: [222, 196, 160],
    blue: [128, 160, 180],
    navy: [82, 110, 132],
    rust: [178, 96, 74],
  };
  const ringColors: RGB[] = [P.rust, P.cream, P.navy, P.sand, P.blue, P.cream, P.rose, P.navy, P.cream];

  const small = makeCanvas(lw, lh);
  const img = small.ctx.createImageData(lw, lh);
  const d = img.data;
  const cx = (lw - 1) / 2;
  const cy = (lh - 1) / 2;
  const medR = Math.min(lw, lh) * 0.36;
  const B0 = 3; // bordure extérieure
  const B1 = 5; // filet crème
  const B2 = 19; // grande bordure
  const B3 = 23; // galon
  // "Abrash" : variations de teinte par rangée, typiques des tapis noués main.
  const abrash = Array.from({ length: lh }, () => (rand() - 0.5) * 10);

  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const e = Math.min(x, y, lw - 1 - x, lh - 1 - y);
      let c: RGB;
      if (e < B0) c = P.navy;
      else if (e < B1) c = P.cream;
      else if (e < B2) {
        // grande bordure : losanges répétés le long du bord
        const along = e === y || e === lh - 1 - y ? x : y;
        const across = e - B1;
        const mid = (B2 - B1 - 1) / 2;
        const dd = Math.abs((along % 16) - 8) + Math.abs(across - mid);
        if (dd <= 1) c = P.rust;
        else if (dd <= 3) c = P.cream;
        else if (dd <= 5) c = P.navy;
        else if (dd === 6) c = P.cream;
        else c = (along + across) % 4 === 0 ? P.sand : P.rose;
      } else if (e < B3) {
        // galon à damier
        c = e === B2 || e === B3 - 1 ? P.cream : (x + y) % 2 === 0 ? P.blue : P.cream;
      } else {
        // champ central
        const md = Math.abs(x - cx) + Math.abs(y - cy) * 0.8;
        const fx = Math.min(x - B3, lw - 1 - B3 - x);
        const fy = Math.min(y - B3, lh - 1 - B3 - y);
        const cd = fx + fy; // distance aux coins du champ
        if (md < medR) {
          c = ringColors[Math.floor(md / 3.2) % ringColors.length];
        } else if (cd < medR * 0.75) {
          c = ringColors[(Math.floor(cd / 3.2) + 2) % ringColors.length];
        } else {
          const gx = (x - B3) % 10;
          const gy = (y - B3) % 10;
          const sd = Math.abs(gx - 5) + Math.abs(gy - 5);
          c = sd <= 1 ? P.navy : sd === 2 ? P.sand : P.field;
        }
      }
      const k = (y * lw + x) * 4;
      const j = (rand() - 0.5) * 14 + abrash[y];
      d[k] = c[0] + j;
      d[k + 1] = c[1] + j;
      d[k + 2] = c[2] + j;
      d[k + 3] = 255;
    }
  }
  small.ctx.putImageData(img, 0, 0);

  // Agrandissement doux = aspect laine
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small.canvas, 0, 0, w, h);

  // Délavage vintage (zones usées irrégulières) + grain de tissage
  const wear = smoothNoise(w, h, 18, rand);
  const wear2 = smoothNoise(w, h, 60, rand);
  const out = ctx.getImageData(0, 0, w, h);
  const o = out.data;
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    const fade = 0.18 + smoothstep(0.5, 0.85, wear[i] * 0.7 + wear2[i] * 0.3) * 0.3;
    const x = i % w;
    const y = (i - x) / w;
    const weave = (x % K === 0 ? -7 : 0) + (y % K === 0 ? -5 : 0) + (rand() - 0.5) * 20;
    o[k] = o[k] + (238 - o[k]) * fade + weave;
    o[k + 1] = o[k + 1] + (226 - o[k + 1]) * fade + weave;
    o[k + 2] = o[k + 2] + (210 - o[k + 2]) * fade + weave;
  }
  ctx.putImageData(out, 0, 0);
}

// Les fonds texturés coûtent quelques centaines de ms : on les peint une seule fois.
const bgCache = new Map<BgStyle, HTMLCanvasElement>();
function getBackground(style: Exclude<BgStyle, "original">): HTMLCanvasElement {
  let c = bgCache.get(style);
  if (!c) {
    const b = makeCanvas(OUT_W, OUT_H);
    paintBackground(b.ctx, OUT_W, OUT_H, style);
    c = b.canvas;
    bgCache.set(style, c);
  }
  return c;
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: Exclude<BgStyle, "original">
) {
  const rand = rng(42);
  switch (style) {
    case "moquette":
      paintMoquette(ctx, w, h, rand);
      break;
    case "tapis":
      paintTapis(ctx, w, h, rand);
      break;
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
  let mask: Mask | null = null;
  let aiMaskCanvas: HTMLCanvasElement | null = null;
  if (needsMask) {
    const cutout = await aiCutout(src);
    const ai = cutout ? maskFromCutout(cutout, W, H, sw, sh) : null;
    if (ai) {
      mask = keepMainObject(ai.mask);
      // On efface aussi du détourage IA les objets parasites écartés.
      const clean = maskToCanvas(dilate(mask, 2));
      const mc = ai.maskCanvas.getContext("2d");
      if (mc) {
        mc.globalCompositeOperation = "destination-in";
        mc.imageSmoothingEnabled = true;
        mc.drawImage(clean, 0, 0, ai.maskCanvas.width, ai.maskCanvas.height);
        mc.globalCompositeOperation = "source-over";
      }
      aiMaskCanvas = ai.maskCanvas;
    } else {
      const m = computeMask(smallData, sw, sh);
      mask = m ? keepMainObject(m) : null;
    }
  }

  if (opts.levels) {
    applyLevels(base.ctx, W, H, smallData, mask);
  }

  // Cas "article non isolable" : on ne touche qu'à la lumière.
  if (needsMask && !mask) {
    return {
      dataUrl: base.canvas.toDataURL("image/jpeg", 0.88),
      isolated: false,
      note: lastAiError
        ? `L'IA de détourage n'a pas pu tourner sur ce téléphone, et le fond de ta photo est trop chargé pour s'en passer : seule la lumière a été corrigée. Réessaie (connexion Wi-Fi, appli fermée puis rouverte) ou pose l'article sur un drap uni. Détail : ${lastAiError.slice(0, 160)}`
        : "Le fond est trop proche de l'article pour l'isoler : seule la lumière a été corrigée. Essaie sur un drap ou un mur uni de couleur différente.",
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
  const maskCanvas = aiMaskCanvas ?? maskToCanvas(mask);
  const cut = makeCanvas(W, H);
  cut.ctx.drawImage(base.canvas, 0, 0);
  cut.ctx.globalCompositeOperation = "destination-in";
  cut.ctx.imageSmoothingEnabled = true;
  cut.ctx.imageSmoothingQuality = "high";
  cut.ctx.drawImage(maskCanvas, 0, 0, W, H);
  cut.ctx.globalCompositeOperation = "source-over";
  if (opts.iron) ironGarment(cut.ctx, bx0, by0, bw, bh);

  // Redressement automatique, puis cadrage serré sur l'article réellement détouré.
  let piece = cut.canvas;
  const angle = symmetryAngle(mask);
  if (angle !== 0) {
    const cxp = bx0 + bw / 2;
    const cyp = by0 + bh / 2;
    const diag = Math.ceil(Math.hypot(bw, bh)) + 4;
    const rot = makeCanvas(diag, diag);
    rot.ctx.imageSmoothingEnabled = true;
    rot.ctx.imageSmoothingQuality = "high";
    rot.ctx.translate(diag / 2, diag / 2);
    rot.ctx.rotate(angle);
    rot.ctx.drawImage(cut.canvas, -cxp, -cyp);
    piece = rot.canvas;
  }
  const box = alphaBBox(piece) ?? { x: bx0, y: by0, w: bw, h: bh };

  const out = makeCanvas(OUT_W, OUT_H);
  out.ctx.drawImage(getBackground(opts.bg), 0, 0);

  // "Flat lay" : l'article posé à plat remplit l'image, avec une ombre courte au contact.
  const flatLay = opts.bg === "moquette" || opts.bg === "tapis";
  const fill = flatLay ? 0.92 : 0.84;
  const fit = Math.min((OUT_W * fill) / box.w, (OUT_H * fill) / box.h);
  const dw = box.w * fit;
  const dh = box.h * fit;
  const dx = (OUT_W - dw) / 2;
  const dy = (OUT_H - dh) / 2 - (flatLay ? 0 : OUT_H * 0.015);

  out.ctx.save();
  out.ctx.shadowColor =
    opts.bg === "noir" ? "rgba(0,0,0,0.65)" : flatLay ? "rgba(40,28,15,0.32)" : "rgba(0,0,0,0.28)";
  out.ctx.shadowBlur = flatLay ? 16 : 36;
  out.ctx.shadowOffsetY = flatLay ? 6 : 16;
  out.ctx.imageSmoothingEnabled = true;
  out.ctx.imageSmoothingQuality = "high";
  out.ctx.drawImage(piece, box.x, box.y, box.w, box.h, dx, dy, dw, dh);
  out.ctx.restore();

  return { dataUrl: out.canvas.toDataURL("image/jpeg", 0.9), isolated: true };
}
