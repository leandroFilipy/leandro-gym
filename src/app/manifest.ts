import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leandro Gym",
    short_name: "Gym",
    description: "Treino, dieta e evolução física",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0c0b",
    theme_color: "#0c0c0b",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Segurar o ícone do app (Android/Chrome e Windows) abre este menu — o "widget" possível num PWA.
    shortcuts: [
      { name: "Treino de hoje", short_name: "Treino", url: "/treino", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Beber água", short_name: "Água", url: "/agua", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Registrar refeição", short_name: "Dieta", url: "/dieta", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Registrar peso", short_name: "Peso", url: "/progresso/peso", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
