import type { Metadata, Viewport } from "next";
import { PWAProvider } from "./components/PWAProvider";
import { appPath } from "./url-utils";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ginji001.github.io/hachiware-techo/"),
  title: {
    default: "ハチワレ手帳 — 日々の記録を、端末の中に。",
    template: "%s | ハチワレ手帳",
  },
  description: "予定や記録、習慣をまとめる無料のデジタル手帳。ログイン不要で、データは端末内に保存されます。",
  applicationName: "ハチワレ手帳",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ハチワレ手帳" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
  icons: { icon: appPath("/favicon.png"), apple: appPath("/favicon.png") },
  openGraph: {
    title: "ハチワレ手帳 — 日々の記録を、端末の中に。",
    description: "無料・ログイン不要。記録は端末内に保存されます。",
    siteName: "ハチワレ手帳",
    type: "website",
    locale: "ja_JP",
    images: ["https://ginji001.github.io/hachiware-techo/og.png"],
  },
  twitter: {
    card: "summary",
    title: "ハチワレ手帳",
    description: "無料・ログイン不要。記録は端末内に保存されます。",
    images: ["https://ginji001.github.io/hachiware-techo/og.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#3154d6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main-content">本文へ移動</a>
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
