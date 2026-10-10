import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "マンスリー",
  description: "日曜始まりで予定を保存し、Googleカレンダーへ追加できるマンスリーログ。",
};

export default function MonthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
