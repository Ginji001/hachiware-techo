import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "INBOX",
  description: "メモ、タスク、アイデアをすばやく受け止めるINBOX。",
};

export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
