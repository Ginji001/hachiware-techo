"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PrintButton } from "../components/PrintButton";
import { listEntitiesWithMedia, listRecords } from "../local-store";

type InboxItem = {
  id: string;
  text: string;
  category: string;
  url: string;
  completed: boolean;
  createdAt: string;
};

type MediaAsset = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  url: string;
};

type Collection = {
  id: string;
  title: string;
  url: string;
  media: MediaAsset[];
};

type DashboardData = {
  inbox: InboxItem[];
  collections: Collection[];
  calendar: CalendarEvent[];
};

type CalendarEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
};

const emptyData: DashboardData = { inbox: [], collections: [], calendar: [] };

async function fetchDashboard(): Promise<DashboardData> {
  const [inbox, collections, calendar] = await Promise.all([
    listRecords<InboxItem>("inbox"),
    listEntitiesWithMedia<Collection>("collection"),
    listRecords<CalendarEvent>("calendar"),
  ]);
  return {
    inbox,
    collections,
    calendar,
  };
}

const dateKeyInTokyo = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${
    parts.find((part) => part.type === "month")?.value
  }-${parts.find((part) => part.type === "day")?.value}`;
};

export default function MonitorPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [status, setStatus] = useState("接続中…");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);

    let active = true;
    const refresh = () => {
      fetchDashboard()
        .then((next) => {
          if (active) {
            setData(next);
            setLastUpdated(new Date());
            setStatus("端末内のデータ");
          }
        })
        .catch(() => {
          if (active) setStatus("データを更新できませんでした");
        });
    };
    refresh();
    const updater = window.setInterval(refresh, 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(clock);
      window.clearInterval(updater);
    };
  }, []);

  const dateKey = now ? dateKeyInTokyo(now) : "";
  const todayEvents = data.calendar.filter((event) => event.date === dateKey);
  const openInbox = data.inbox.filter((item) => !item.completed).slice(0, 6);
  const latestMedia = useMemo(
    () =>
      data.collections
        .flatMap((collection) =>
          collection.media.map((media) => ({
            ...media,
            collectionTitle: collection.title,
          })),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [data.collections],
  );

  const enterFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <main className="monitor-shell" id="main-content">
      <header className="monitor-header">
        <div className="monitor-brand">
          <span className="brand-mark cat-mark" aria-hidden="true">八</span>
          <div>
            <strong>ハチワレ手帳</strong>
            <span>PERSONAL MONITOR</span>
          </div>
        </div>
        <div className="monitor-status">
          <span className="sync-dot" aria-hidden="true" />
          <span>{status}</span>
        </div>
        <nav>
          <PrintButton />
          <Link href="/">通常画面</Link>
          <button type="button" onClick={() => void enterFullscreen()}>
            全画面
          </button>
        </nav>
      </header>

      <section className="monitor-time" aria-label="現在時刻">
        <p>
          {now
            ? new Intl.DateTimeFormat("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
                timeZone: "Asia/Tokyo",
              }).format(now)
            : "読み込み中"}
        </p>
        <time dateTime={now?.toISOString()}>
          {now
            ? new Intl.DateTimeFormat("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Asia/Tokyo",
              }).format(now)
            : "--:--"}
        </time>
        <span aria-hidden="true">&nbsp;</span>
      </section>

      <section className="monitor-card monitor-schedule" aria-labelledby="monitor-schedule-title">
        <div className="monitor-card-heading">
          <div>
            <p>CALENDAR</p>
            <h2 id="monitor-schedule-title">今日の予定</h2>
          </div>
          <strong>{String(todayEvents.length).padStart(2, "0")}</strong>
        </div>
        <div className="monitor-list">
          {todayEvents.length === 0 ? (
            <div className="monitor-empty">
              <span>○</span>
              <p>今日は予定のない、余白のある一日です。</p>
            </div>
          ) : (
            todayEvents.map((event) => (
              <article key={`${event.date}-${event.time}-${event.title}`}>
                <time>{event.time}</time>
                <strong>{event.title}</strong>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="monitor-card monitor-inbox" aria-labelledby="monitor-inbox-title">
        <div className="monitor-card-heading">
          <div>
            <p>INBOX</p>
            <h2 id="monitor-inbox-title">未完了</h2>
          </div>
          <strong>{String(data.inbox.filter((item) => !item.completed).length).padStart(2, "0")}</strong>
        </div>
        <div className="monitor-list">
          {openInbox.length === 0 ? (
            <div className="monitor-empty">
              <span>✓</span>
              <p>未完了の項目はありません。</p>
            </div>
          ) : (
            openInbox.map((item) => (
              <article key={item.id}>
                <span className="monitor-bullet" aria-hidden="true">□</span>
                <strong>{item.text}</strong>
                <small>{item.category}</small>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    URLを開く
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="monitor-card monitor-media" aria-labelledby="monitor-media-title">
        <div className="monitor-card-heading">
          <div>
            <p>COLLECTION</p>
            <h2 id="monitor-media-title">最近の一枚</h2>
          </div>
          <strong>{String(data.collections.length).padStart(2, "0")}</strong>
        </div>
        {latestMedia ? (
          <figure>
            <a
              className="media-original-link"
              href={latestMedia.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${latestMedia.filename}を別窓で開く`}
            >
              {latestMedia.contentType.startsWith("video/") ? (
                <video autoPlay muted loop playsInline>
                  <source src={latestMedia.url} type={latestMedia.contentType} />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={latestMedia.url} alt={latestMedia.filename} />
              )}
            </a>
            <figcaption>
              <strong>{latestMedia.collectionTitle}</strong>
              <span>{latestMedia.filename}</span>
            </figcaption>
          </figure>
        ) : (
          <div className="monitor-empty">
            <span>□</span>
            <p>コレクションに画像や動画を追加すると表示されます。</p>
          </div>
        )}
      </section>

      <footer className="monitor-footer">
        <span>5分ごとに自動更新</span>
        <span>
          最終更新{" "}
          {lastUpdated
            ? new Intl.DateTimeFormat("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Tokyo",
              }).format(lastUpdated)
            : "--:--"}
        </span>
      </footer>
    </main>
  );
}
