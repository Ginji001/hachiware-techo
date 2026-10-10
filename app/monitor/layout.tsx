import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "個人モニター",
  description: "所有者専用の読み取り専用モニター表示。",
};

export default function MonitorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
