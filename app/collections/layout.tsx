import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "コレクション",
  description: "画像や動画と一緒に、残しておきたいものを集めるページ。",
};

export default function CollectionsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
