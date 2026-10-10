import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ほしい物リスト",
  description: "ほしい物を縦に並べ、「未」「済」で管理するページ。",
};

export default function WishlistLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
