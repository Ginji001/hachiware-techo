"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { SiteTabs } from "../components/SiteTabs";
import { createId, deleteRecord, listRecords, putRecord, recordKey } from "../local-store";

type CalendarEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  location?: string;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

const currentMonthInTokyo = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
};

const compactDateTime = (value: Date) =>
  [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
    "T",
    String(value.getUTCHours()).padStart(2, "0"),
    String(value.getUTCMinutes()).padStart(2, "0"),
    "00",
  ].join("");

function googleCalendarUrl(event: CalendarEvent) {
  const [year, month, day] = event.date.split("-").map(Number);
  const [hour, minute] = event.time.split(":").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compactDateTime(start)}/${compactDateTime(end)}`,
    ctz: "Asia/Tokyo",
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function MonthPage() {
  const [cursor, setCursor] = useState(currentMonthInTokyo);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [saveState, setSaveState] = useState("予定を読み込み中");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addToGoogleAfterSave, setAddToGoogleAfterSave] = useState(false);
  const editTitleRef = useRef<HTMLInputElement>(null);

  const loadCalendar = async () => {
    const events = await listRecords<CalendarEvent>("calendar");
    setCalendarEvents(events.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)));
    setSaveState("端末内に保存");
  };

  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      try {
        await loadCalendar();
      } catch {
        setSaveState("予定を読み込めませんでした");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!editingEventId) return;
    const focusTimer = window.setTimeout(() => editTitleRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isEditing && !isDeleting) {
        setEditingEventId("");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [editingEventId, isDeleting, isEditing]);

  const addEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const googleWindow = addToGoogleAfterSave
      ? window.open("about:blank", "_blank")
      : null;
    if (googleWindow) googleWindow.opener = null;
    setIsSaving(true);
    setError("");
    setSaveState("保存中");
    try {
      const createdEvent: CalendarEvent = {
        id: createId(), date: String(formData.get("date") ?? ""),
        time: String(formData.get("time") ?? "12:00"),
        title: String(formData.get("title") ?? "").trim(),
        location: String(formData.get("location") ?? "").trim(),
      };
      if (!createdEvent.date || !createdEvent.title) throw new Error("日付とタイトルを入力してください");
      await putRecord(recordKey("calendar", createdEvent.id), createdEvent);
      form.reset();
      setCalendarEvents((events) =>
        [...events, createdEvent].sort((left, right) =>
          `${left.date}T${left.time}`.localeCompare(
            `${right.date}T${right.time}`,
          ),
        ),
      );
      const [year, month] = createdEvent.date.split("-").map(Number);
      setCursor({ year, month });
      if (addToGoogleAfterSave) {
        const url = googleCalendarUrl(createdEvent);
        if (googleWindow) {
          googleWindow.location.replace(url);
        } else {
          window.location.assign(url);
        }
        setSaveState("保存しました・Google側で追加を確定してください");
      } else {
        setSaveState("保存しました");
      }
    } catch (caught) {
      googleWindow?.close();
      setError(caught instanceof Error ? caught.message : "予定を保存できませんでした");
      setSaveState("保存できませんでした");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (isDeleting || !window.confirm("この予定を削除しますか？\n削除後は元に戻せません。")) return;
    setIsDeleting(true);
    setError("");
    setSaveState("削除中");
    try {
      await deleteRecord(recordKey("calendar", id));
      setCalendarEvents((events) => events.filter((event) => event.id !== id));
      if (editingEventId === id) setEditingEventId("");
      setSaveState("削除しました");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予定を削除できませんでした");
      setSaveState("削除できませんでした");
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditingEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEditDate(event.date);
    setEditTime(event.time);
    setEditTitle(event.title);
    setEditLocation(event.location ?? "");
    setError("");
  };

  const saveEditedEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEventId || !editTitle.trim() || isEditing) return;
    setIsEditing(true);
    setError("");
    setSaveState("編集中");
    try {
      const existing = calendarEvents.find((item) => item.id === editingEventId);
      if (!existing) throw new Error("予定が見つかりませんでした");
      const updatedEvent = {
        ...existing, date: editDate, time: editTime,
        title: editTitle.trim(), location: editLocation.trim(),
      };
      await putRecord(recordKey("calendar", updatedEvent.id), updatedEvent);
      setCalendarEvents((events) =>
        events
          .map((item) =>
            item.id === editingEventId ? updatedEvent : item,
          )
          .sort((left, right) =>
            `${left.date}T${left.time}`.localeCompare(
              `${right.date}T${right.time}`,
            ),
          ),
      );
      const [year, month] = updatedEvent.date.split("-").map(Number);
      setCursor({ year, month });
      setEditingEventId("");
      setSaveState("編集しました");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予定を更新できませんでした");
      setSaveState("編集できませんでした");
    } finally {
      setIsEditing(false);
    }
  };

  const days = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
    const count = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
    const sundayOffset = first.getUTCDay();
    return [
      ...Array.from({ length: sundayOffset }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [cursor]);

  const moveMonth = (amount: number) => {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month - 1 + amount, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
    });
  };

  const visibleEvents = calendarEvents.filter((event) =>
    event.date.startsWith(monthKey(cursor.year, cursor.month)),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());

  return (
    <main className="page-shell" id="main-content">
      <aside className="section-rail" aria-label="マンスリーログ">
        <div className="brand">
          <span className="brand-mark cat-mark" aria-hidden="true">八</span>
          <span>ハチワレ手帳 / MONTHLY</span>
        </div>
        <div className="rail-month">
          <span>{cursor.year}</span>
          <strong>{String(cursor.month).padStart(2, "0")}</strong>
          <small>MONTHLY LOG</small>
        </div>
        <div className="sync-stamp">
          <span className="sync-dot" aria-hidden="true" />
          <div>
            <strong>Cloud連携なし</strong>
            <small>{saveState}・{calendarEvents.length}件</small>
          </div>
        </div>
      </aside>

      <div className="content-page">
        <div className="content-inner">
          <SiteTabs active="month" />
          <header className="page-header">
            <div>
              <p className="eyebrow">MONTHLY LOG / PERSONAL PLAN</p>
              <h1>{cursor.year}年{cursor.month}月</h1>
              <p className="date-line">自分の予定を、シンプルに見渡す。</p>
            </div>
            <div className="top-actions">
              <button className="text-button" type="button" onClick={() => moveMonth(-1)}>← 前月</button>
              <button className="icon-button" type="button" onClick={() => setCursor(currentMonthInTokyo())}>今月</button>
              <button className="text-button" type="button" onClick={() => moveMonth(1)}>翌月 →</button>
            </div>
          </header>

          <section className="sync-banner" aria-label="Googleカレンダーへの追加方法">
            <div>
              <span className="sync-dot" aria-hidden="true" />
              <strong>Google Cloud・iCalは使用しません</strong>
            </div>
            <p>予定はハチワレ手帳内に保存</p>
            <small>Googleの追加画面で「保存」を押すとカレンダーに反映されます。</small>
          </section>

          <form className="calendar-entry-form" onSubmit={addEvent}>
            <div className="calendar-entry-heading">
              <div>
                <p className="eyebrow">ADD PERSONAL PLAN</p>
                <h2>予定を追加</h2>
              </div>
              <small>{saveState}</small>
            </div>
            <label>
              <span>日付</span>
              <input name="date" type="date" required />
            </label>
            <label>
              <span>時刻</span>
              <input name="time" type="time" required />
            </label>
            <label className="calendar-title-field">
              <span>予定</span>
              <input name="title" type="text" maxLength={120} required />
            </label>
            <label>
              <span>場所（任意）</span>
              <input name="location" type="text" maxLength={120} />
            </label>
            <label className="calendar-google-option">
              <input
                type="checkbox"
                checked={addToGoogleAfterSave}
                onChange={(event) => setAddToGoogleAfterSave(event.target.checked)}
              />
              <span>予定情報をGoogleカレンダーへ渡して追加画面を開く</span>
            </label>
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving
                ? "保存中…"
                : addToGoogleAfterSave
                  ? "保存してGoogleへ"
                  : "予定を保存"}
            </button>
          </form>

          {editingEventId && (
            <div
              className="calendar-edit-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  !isEditing &&
                  !isDeleting
                ) {
                  setEditingEventId("");
                }
              }}
            >
              <form
                className="calendar-edit-form"
                onSubmit={saveEditedEvent}
                role="dialog"
                aria-modal="true"
                aria-labelledby="calendar-edit-title"
              >
                <div className="calendar-entry-heading">
                  <div>
                    <p className="eyebrow">EDIT PERSONAL PLAN</p>
                    <h2 id="calendar-edit-title">予定を編集</h2>
                  </div>
                  <small>保存後の予定を変更できます</small>
                </div>
                <label>
                  <span>日付</span>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(event) => setEditDate(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>時刻</span>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(event) => setEditTime(event.target.value)}
                    required
                  />
                </label>
                <label className="calendar-title-field">
                  <span>予定</span>
                  <input
                    ref={editTitleRef}
                    type="text"
                    maxLength={120}
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>場所（任意）</span>
                  <input
                    type="text"
                    maxLength={120}
                    value={editLocation}
                    onChange={(event) => setEditLocation(event.target.value)}
                  />
                </label>
                <div className="inline-edit-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isEditing || isDeleting}
                  >
                    {isEditing ? "保存中…" : "変更を保存"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setEditingEventId("")}
                  >
                    キャンセル
                  </button>
                  <button
                    className="calendar-edit-delete"
                    type="button"
                    disabled={isEditing || isDeleting}
                    onClick={() => void deleteEvent(editingEventId)}
                  >
                    {isDeleting ? "削除中…" : "この予定を削除"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {error && (
            <p className="calendar-sync-error" role="alert">{error}</p>
          )}

          <section className="month-board" aria-label={`${cursor.year}年${cursor.month}月のカレンダー`}>
            <div className="weekday-row" aria-hidden="true">
              {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
            </div>
            <div className="month-grid">
              {days.map((day, index) => {
                if (!day) return <div className="calendar-cell outside" key={`outside-${index}`} />;
                const date = `${monthKey(cursor.year, cursor.month)}-${String(day).padStart(2, "0")}`;
                const events = visibleEvents.filter((event) => event.date === date);
                const isToday = date === today;
                return (
                  <article className={`calendar-cell ${isToday ? "today" : ""}`} key={date}>
                    <div className="day-number">
                      <time dateTime={date}>{day}</time>
                      {isToday && <span>今日</span>}
                    </div>
                    <div className="calendar-events">
                      {events.map((event) => (
                        <article className="calendar-event-card" key={event.id}>
                          <a
                            href={googleCalendarUrl(event)}
                            target="_blank"
                            rel="noreferrer"
                            title="Googleカレンダーへ追加"
                          >
                            <time>{event.time}</time>
                            <strong>{event.title}</strong>
                            {event.location && <small>{event.location}</small>}
                          </a>
                          <button
                            type="button"
                            onClick={() => startEditingEvent(event)}
                          >
                            編集
                          </button>
                        </article>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="month-agenda" aria-label={`${cursor.year}年${cursor.month}月の予定一覧`}>
            {visibleEvents.length > 0 ? (
              visibleEvents.map((event) => {
                const date = new Date(`${event.date}T12:00:00+09:00`);
                return (
                  <article className="agenda-item" key={event.id}>
                    <time dateTime={event.date} className="agenda-date">
                      <strong>{date.getDate()}</strong>
                      <span>
                        {new Intl.DateTimeFormat("ja-JP", {
                          weekday: "short",
                          timeZone: "Asia/Tokyo",
                        }).format(date)}
                      </span>
                    </time>
                    <div className="agenda-details">
                      <time>{event.time}</time>
                      <strong>{event.title}</strong>
                      {event.location && <small>{event.location}</small>}
                      <div className="agenda-actions">
                        <button type="button" onClick={() => startEditingEvent(event)}>
                          編集
                        </button>
                        <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
                          Googleカレンダーへ追加
                        </a>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => void deleteEvent(event.id)}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="month-empty">この月は予定がありません。</p>
            )}
          </section>

          {visibleEvents.length === 0 && (
            <p className="month-empty desktop-month-empty">この月は予定がありません。</p>
          )}
        </div>
      </div>
    </main>
  );
}
