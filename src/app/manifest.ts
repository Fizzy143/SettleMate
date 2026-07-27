import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SettleMate - 朋友分帳工具",
    short_name: "SettleMate",
    description: "建立群組、邀請朋友、記錄支出，最後用最少筆轉帳結清。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      {
        src: "/assets/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/assets/app-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/assets/app-cover-settlemate-style.png",
        sizes: "1290x2796",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
  };
}
