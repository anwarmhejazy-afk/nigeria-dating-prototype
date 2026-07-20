import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AfroLove — Pan-African Dating",
    short_name: "AfroLove",
    description:
      "A premium pan-African dating experience for genuine connections across Africa and the diaspora.",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#07080b",
    theme_color: "#07080b",
    categories: ["social", "lifestyle"],
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Discover",
        short_name: "Discover",
        description: "Find compatible AfroLove members",
        url: "/app?tab=discover",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Likes",
        short_name: "Likes",
        description: "See your AfroLove activity",
        url: "/app?tab=likes",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Chat",
        short_name: "Chat",
        description: "Open your AfroLove conversations",
        url: "/app?tab=chat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Profile",
        short_name: "Profile",
        description: "Manage your AfroLove profile",
        url: "/app?tab=profile",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
