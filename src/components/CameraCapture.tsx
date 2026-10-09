"use client";

import { useEffect, useRef, useState } from "react";
import { downscale, readFileAsDataURL } from "@/lib/photo";

export default function CameraCapture({
  onCapture,
}: {
  onCapture: (dataUrls: string[]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        setCameraError(true);
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const small = await downscale(canvas.toDataURL("image/jpeg", 0.92));
    onCapture([small]);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setLoadingFiles(true);
    try {
      const urls = await Promise.all(
        files.map(async (f) => downscale(await readFileAsDataURL(f)))
      );
      onCapture(urls);
    } finally {
      setLoadingFiles(false);
    }
  }

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-ink">
      {!cameraError && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
      )}

      {cameraError && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-paper">
          <p className="text-sm text-paper/80">
            Caméra indisponible ici. Choisis tes photos dans la galerie.
          </p>
        </div>
      )}

      {!cameraError && !cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-paper/70">
          Ouverture de la caméra…
        </div>
      )}

      {loadingFiles && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/70 text-sm text-paper">
          Import des photos…
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 pb-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-sm border border-paper/40 bg-ink/40 px-3 py-2 text-xs font-medium text-paper"
        >
          Depuis ta galerie
        </button>

        {!cameraError && (
          <button
            type="button"
            onClick={capture}
            disabled={!cameraReady}
            aria-label="Prendre la photo"
            className="h-16 w-16 rounded-full border-4 border-paper bg-chalk-red disabled:opacity-40"
          />
        )}
      </div>
    </div>
  );
}
