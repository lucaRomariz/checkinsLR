import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Check-ins", short_name: "Check-ins",
    description: "Planejar. Fazer. Celebrar.",
    start_url: "/", scope: "/", display: "standalone",
    background_color: "#0a0a0a", theme_color: "#0a0a0a", lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
