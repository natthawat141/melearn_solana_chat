import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Melearn Chat",
    short_name: "Melearn",
    description: "ฝึกภาษาอังกฤษและคณิตศาสตร์กับครู AI",
    start_url: "/chat",
    scope: "/",
    display: "standalone",
    background_color: "#f4f8ff",
    theme_color: "#eaf7ff",
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
