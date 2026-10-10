"use client";

import Link from "next/link";
import { PrintButton } from "./PrintButton";

type SiteTabsProps = {
  active:
    | "daily"
    | "month"
    | "inbox"
    | "habits"
    | "collections"
    | "wishlist"
    | "guide"
    | "settings";
};

const items = [
  { key: "daily", href: "/", label: "デイリー" },
  { key: "month", href: "/month", label: "マンスリー" },
  { key: "inbox", href: "/inbox", label: "INBOX" },
  { key: "habits", href: "/habits", label: "ハビット" },
  { key: "collections", href: "/collections", label: "コレクション" },
  { key: "wishlist", href: "/wishlist", label: "ほしい物" },
  { key: "guide", href: "/guide", label: "使い方" },
  { key: "settings", href: "/settings", label: "設定" },
] as const;

export function SiteTabs({ active }: SiteTabsProps) {
  return (
    <div className="site-navigation">
      <nav className="site-tabs" aria-label="ハチワレ手帳のページ">
        {items.map((item) => (
          <Link
            href={item.href}
            prefetch={true}
            key={item.key}
            className={active === item.key ? "active" : ""}
            aria-current={active === item.key ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="site-navigation-actions">
        <PrintButton />
      </div>
    </div>
  );
}
