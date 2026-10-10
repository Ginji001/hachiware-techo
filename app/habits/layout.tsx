import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ハビット",
  description: "自分で決めた習慣を、1か月ごとに記録するハビットトラッカー。",
};

export default function HabitsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
