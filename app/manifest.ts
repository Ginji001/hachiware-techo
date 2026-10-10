import type { MetadataRoute } from "next";
import { appPath } from "./url-utils";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: appPath("/"),
    name: "ハチワレ手帳",
    short_name: "ハチワレ手帳",
    description: "日々のすべてを、静かな時系列の中に。",
    start_url: appPath("/"),
    scope: `${appPath("/")}`,
    display: "standalone",
    background_color: "#f6f4fb",
    theme_color: "#3154d6",
    lang: "ja",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: appPath("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: appPath("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: appPath("/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "デイリー", short_name: "デイリー", url: appPath("/") },
      { name: "マンスリー", short_name: "マンスリー", url: appPath("/month/") },
      { name: "INBOX", short_name: "INBOX", url: appPath("/inbox/") },
      { name: "ハビット", short_name: "ハビット", url: appPath("/habits/") },
    ],
  };
}
