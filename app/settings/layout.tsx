import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "設定",
  description: "保存状況、プライバシー、全データ削除を管理します。",
};

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
