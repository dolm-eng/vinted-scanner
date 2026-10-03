import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Griffe — scan & revente Vinted",
    short_name: "Griffe",
    description:
      "Scanne un article, estime son prix et suis tes ventes Vinted.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2eee3",
    theme_color: "#211d19",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
