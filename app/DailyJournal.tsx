"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SiteTabs } from "./components/SiteTabs";
import { deleteMedia, loadDay, saveDay } from "./local-store";
import {
  defaultDayState,
  type DayState,
  type EntryType,
  type JournalEntry,
} from "./daily-state";
import { appPath, normalizeHttpUrl } from "./url-utils";

const moodLabels = ["しずか", "ゆっくり", "おだやか", "軽やか", "晴れやか"];
const energyLabels = ["とても低い", "低い", "ふつう", "高い", "とても高い"];

const typeMeta: Record<
  EntryType,
  { symbol: string; label: string; action: string }
> = {
  note: { symbol: "🐾", label: "メモ", action: "記録" },
  task: { symbol: "□", label: "タスク", action: "やること" },
  event: { symbol: "○", label: "予定", action: "できごと" },
  important: { symbol: "!", label: "重要", action: "忘れない" },
};

const todayInTokyo = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day, 12));
};

const makeDateKey = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function DailyJournal() {
  const [activeDate, setActiveDate] = useState(() => todayInTokyo());
  const [day, setDay] = useState<DayState>(() => defaultDayState());
  const [loadedKey, setLoadedKey] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("note");
  const [entryTime, setEntryTime] = useState("12:00");
  const [entryText, setEntryText] = useState("");
  const [entryUrl, setEntryUrl] = useState("");
  const [editingEntryId, setEditingEntryId] = useState("");
  const [editEntryTime, setEditEntryTime] = useState("");
  const [editEntryType, setEditEntryType] = useState<EntryType>("note");
  const [editEntryText, setEditEntryText] = useState("");
  const [editEntryDetail, setEditEntryDetail] = useState("");
  const [editEntryUrl, setEditEntryUrl] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState("端末内の記録を読み込み中…");
  const [saveTick, setSaveTick] = useState(0);

  const dayRef = useRef(day);
  const currentDateRef = useRef("");
  const loadedKeyRef = useRef("");
  const lastSavedJsonRef = useRef("");
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRequestRef = useRef(0);

  const dateKey = makeDateKey(activeDate);
  const energyLevel = Math.min(5, Math.max(1, day.energy || 1));

  useEffect(() => {
    dayRef.current = day;
  }, [day]);

  useEffect(() => {
    currentDateRef.current = dateKey;
  }, [dateKey]);

  useEffect(() => {
    loadedKeyRef.current = loadedKey;
  }, [loadedKey]);

  const flushSave = useCallback(async () => {
    const date = currentDateRef.current;
    if (loadedKeyRef.current !== date) return;
    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const snapshot = dayRef.current;
    const snapshotJson = JSON.stringify(snapshot);
    if (snapshotJson === lastSavedJsonRef.current) return;

    savingRef.current = true;
    setSaveMessage("端末内に保存中…");
    try {
      await saveDay(date, snapshot);
      if (date !== currentDateRef.current) return;
      lastSavedJsonRef.current = snapshotJson;
      setSaveMessage("端末内に保存済み");
    } catch {
      if (date === currentDateRef.current) {
        setSaveMessage("保存できませんでした。空き容量を確認してください");
      }
    } finally {
      savingRef.current = false;
      if (
        pendingSaveRef.current &&
        loadedKeyRef.current === currentDateRef.current
      ) {
        pendingSaveRef.current = false;
        setSaveTick((current) => current + 1);
      }
    }
  }, []);

  useEffect(() => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    lastSavedJsonRef.current = "";

    const load = async () => {
      await Promise.resolve();
      if (requestId !== loadRequestRef.current) return;
      setLoadedKey("");
      setEditingEntryId("");
      setSaveMessage("端末内の記録を読み込み中…");
      try {
        const saved = await loadDay(dateKey);
        if (requestId !== loadRequestRef.current) return;
        lastSavedJsonRef.current = JSON.stringify(saved);
        setDay(saved);
        setSaveMessage("端末内に保存済み");
      } catch {
        if (requestId !== loadRequestRef.current) return;
        const empty = defaultDayState();
        lastSavedJsonRef.current = JSON.stringify(empty);
        setDay(empty);
        setSaveMessage("端末内の保存領域を開けませんでした");
      } finally {
        if (requestId === loadRequestRef.current) setLoadedKey(dateKey);
      }
    };
    void load();
  }, [dateKey]);

  useEffect(() => {
    if (loadedKey !== dateKey) return;
    const json = JSON.stringify(day);
    if (json === lastSavedJsonRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(), 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [day, dateKey, flushSave, loadedKey, saveTick]);

  const sortedEntries = useMemo(
    () => [...day.entries].sort((a, b) => a.time.localeCompare(b.time)),
    [day.entries],
  );

  const taskEntries = day.entries.filter((entry) => entry.type === "task");
  const completedTasks = taskEntries.filter((entry) => entry.completed).length;
  const progress =
    taskEntries.length === 0
      ? 0
      : Math.round((completedTasks / taskEntries.length) * 100);

  const formatted = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "UTC",
  }).format(activeDate);

  const shortMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  })
    .format(activeDate)
    .toUpperCase();

  const moveDate = (amount: number) => {
    setActiveDate((current) => {
      const next = new Date(current);
      next.setUTCDate(current.getUTCDate() + amount);
      return next;
    });
  };

  const updateEntry = (id: string, patch: Partial<JournalEntry>) => {
    setDay((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  const removeEntry = async (id: string) => {
    const entry = day.entries.find((item) => item.id === id);
    if (entry?.media?.length) {
      await Promise.all(entry.media.map((media) => deleteMedia(media.id)));
    }
    setDay((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
  };

  const startEditingEntry = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setEditEntryTime(entry.time);
    setEditEntryType(entry.type);
    setEditEntryText(entry.text);
    setEditEntryDetail(entry.detail ?? "");
    setEditEntryUrl(entry.url ?? "");
  };

  const saveEditedEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = editEntryText.trim();
    if (!editingEntryId || !text) return;
    const url = normalizeHttpUrl(editEntryUrl);
    if (url === null) {
      setSaveMessage("URLを確認してください");
      return;
    }
    const original = day.entries.find((entry) => entry.id === editingEntryId);
    updateEntry(editingEntryId, {
      time: editEntryTime,
      type: editEntryType,
      text,
      detail: editEntryDetail.trim(),
      url: url || undefined,
      completed:
        editEntryType === "task"
          ? original?.type === "task"
            ? original.completed
            : false
          : undefined,
    });
    setEditingEntryId("");
    setSaveMessage("編集しました");
  };

  const addEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = entryText.trim();
    if (!text) return;
    const url = normalizeHttpUrl(entryUrl);
    if (url === null) {
      setSaveMessage("URLを確認してください");
      return;
    }
    const id = makeId();
    const nextDay: DayState = {
      ...dayRef.current,
      entries: [
        ...dayRef.current.entries,
        {
          id,
          time: entryTime,
          type: entryType,
          text,
          completed: entryType === "task" ? false : undefined,
          detail: typeMeta[entryType].label,
          ...(url ? { url } : {}),
          media: [],
        },
      ],
    };
    dayRef.current = nextDay;
    setDay(nextDay);
    setEntryText("");
    setEntryUrl("");
    const savedJson = JSON.stringify(nextDay);
    setSaveMessage("端末内に保存中…");
    void saveDay(dateKey, nextDay).then(() => {
      if (currentDateRef.current !== dateKey) return;
      lastSavedJsonRef.current = savedJson;
      setSaveMessage("端末内に保存済み");
    }).catch(() => setSaveMessage("保存できませんでした。空き容量を確認してください"));
  };

  const deleteEntryMedia = async (entryId: string, mediaId: string) => {
    try {
      await deleteMedia(mediaId);
    } catch {
      setSaveMessage("画像・動画を削除できませんでした");
      return;
    }
    const entry = day.entries.find((item) => item.id === entryId);
    updateEntry(entryId, {
      media: (entry?.media ?? []).filter((media) => media.id !== mediaId),
    });
    setSaveMessage("画像・動画を削除しました");
  };

  const updateGratitude = (index: number, value: string) => {
    setDay((current) => ({
      ...current,
      gratitude: current.gratitude.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  };

  return (
    <main
      className={`app-shell ${focusMode ? "focus-mode" : ""}`}
      id="main-content"
    >
      <aside className="date-rail" aria-label="日付とページ内メニュー">
        <div className="brand">
          <span className="brand-mark cat-mark" aria-hidden="true">
            八
          </span>
          <span>ハチワレ手帳 / DAILY</span>
        </div>

        <div className="rail-date">
          <span className="month">
            {shortMonth} {activeDate.getUTCFullYear()}
          </span>
          <strong className="day">{activeDate.getUTCDate()}</strong>
          <span className="weekday">
            {new Intl.DateTimeFormat("ja-JP", {
              weekday: "long",
              timeZone: "UTC",
            }).format(activeDate)}
          </span>
        </div>

        <div className="rail-progress">
          <div className="rail-progress-label">
            <span>今日の進み</span>
            <strong>
              {completedTasks} / {taskEntries.length}
            </strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="今日のタスク進捗"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <nav className="rail-nav" aria-label="ページ内リンク">
          <a href="#records">
            <span>記録一覧</span>
            <span className="symbol">01</span>
          </a>
          <a href="#reflection">
            <span>今日を閉じる</span>
            <span className="symbol">02</span>
          </a>
        </nav>
      </aside>

      <div className="journal">
        <div className="journal-inner">
          <SiteTabs active="daily" />
          <header className="topbar">
            <div>
              <p className="eyebrow">DIGITAL BULLET JOURNAL</p>
              <h1>ハチワレの肉球記録</h1>
              <p className="date-line">{formatted}</p>
            </div>
            <div className="top-actions" aria-label="日付操作">
              <button
                className="text-button"
                type="button"
                onClick={() => moveDate(-1)}
                aria-label="前の日へ"
              >
                ← 前日
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => setActiveDate(todayInTokyo())}
              >
                今日
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => moveDate(1)}
                aria-label="次の日へ"
              >
                翌日 →
              </button>
              <button
                className="focus-button"
                type="button"
                aria-pressed={focusMode}
                onClick={() => setFocusMode((current) => !current)}
              >
                {focusMode ? "全体表示" : "集中表示"}
              </button>
              <a className="monitor-link" href={appPath("/monitor/")}>
                モニター
              </a>
            </div>
          </header>

          <section className="summary-strip" aria-label="今日の状態">
            <div className="summary-cell">
              <span className="summary-label">MOOD / 気分</span>
              <div className="mood-picker" aria-label="今日の気分">
                {moodLabels.map((label, index) => (
                  <button
                    type="button"
                    key={label}
                    className={day.mood === index ? "selected" : ""}
                    aria-label={label}
                    aria-pressed={day.mood === index}
                    onClick={() =>
                      setDay((current) => ({ ...current, mood: index }))
                    }
                  >
                    <span aria-hidden="true">
                      {["—", "⌒", "•", "◡", "☼"][index]}
                    </span>
                  </button>
                ))}
                <strong>{moodLabels[day.mood]}</strong>
              </div>
            </div>

            <div className="summary-cell">
              <span className="summary-label">
                ENERGY / エネルギー
              </span>
              <div
                className="energy-picker"
                role="group"
                aria-label="今日のエネルギー"
              >
                {energyLabels.map((label, index) => {
                  const value = index + 1;
                  return (
                    <button
                      type="button"
                      key={label}
                      className={`${energyLevel >= value ? "filled" : ""} ${
                        energyLevel === value ? "selected" : ""
                      }`}
                      aria-label={`${label}、5段階の${value}`}
                      aria-pressed={energyLevel === value}
                      onClick={() =>
                        setDay((current) => ({ ...current, energy: value }))
                      }
                    >
                      <span aria-hidden="true" />
                    </button>
                  );
                })}
                <strong>{energyLabels[energyLevel - 1]}</strong>
              </div>
            </div>

            <div className="summary-cell intention-cell">
              <label className="summary-label" htmlFor="intention">
                INTENTION / 今日の軸
              </label>
              <input
                id="intention"
                value={day.intention}
                onChange={(event) =>
                  setDay((current) => ({
                    ...current,
                    intention: event.target.value,
                  }))
                }
              />
            </div>
          </section>

          <section className="quick-capture" aria-labelledby="capture-title">
            <div className="capture-heading">
              <div>
                <p className="eyebrow">QUICK CAPTURE</p>
                <h2 id="capture-title">今を記録する</h2>
              </div>
              <div className="legend" aria-label="記号の意味">
                {Object.values(typeMeta).map((meta) => (
                  <span key={meta.label}>
                    <b>{meta.symbol}</b> {meta.label}
                  </span>
                ))}
              </div>
            </div>
            <form className="capture-form" onSubmit={addEntry}>
              <label>
                <span>種類</span>
                <select
                  value={entryType}
                  onChange={(event) =>
                    setEntryType(event.target.value as EntryType)
                  }
                >
                  {Object.entries(typeMeta).map(([value, meta]) => (
                    <option value={value} key={value}>
                      {meta.symbol} {meta.action}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>時刻</span>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(event) => setEntryTime(event.target.value)}
                />
              </label>
              <label className="capture-text">
                <span>内容</span>
                <input
                  value={entryText}
                  onChange={(event) => setEntryText(event.target.value)}
                />
              </label>
              <label className="capture-url">
                <span>URL（任意）</span>
                <input
                  type="url"
                  inputMode="url"
                  maxLength={2048}
                  value={entryUrl}
                  onChange={(event) => setEntryUrl(event.target.value)}
                />
              </label>
              <button className="primary-button" type="submit">
                記録する
              </button>
            </form>
          </section>

          <p className="local-storage-notice">
            <strong>端末内に保存</strong>
            記録はこの端末のブラウザに保存されます。オフラインでも編集できます。
          </p>

          <div className="stream daily-records" id="records" aria-label="記録一覧">
            <div className="entry-list">
              {sortedEntries.map((entry) => {
                          const meta = typeMeta[entry.type];
                          return (
                            <article
                              className={`log-entry ${entry.type} ${
                                entry.completed ? "completed" : ""
                              } ${
                                editingEntryId === entry.id ? "is-editing" : ""
                              }`}
                              key={entry.id}
                            >
                              {editingEntryId === entry.id ? (
                                <form
                                  className="daily-entry-edit"
                                  onSubmit={saveEditedEntry}
                                >
                                  <label>
                                    <span>時刻</span>
                                    <input
                                      type="time"
                                      value={editEntryTime}
                                      onChange={(event) =>
                                        setEditEntryTime(event.target.value)
                                      }
                                      required
                                    />
                                  </label>
                                  <label>
                                    <span>種類</span>
                                    <select
                                      value={editEntryType}
                                      onChange={(event) =>
                                        setEditEntryType(
                                          event.target.value as EntryType,
                                        )
                                      }
                                    >
                                      {Object.entries(typeMeta).map(
                                        ([value, itemMeta]) => (
                                          <option value={value} key={value}>
                                            {itemMeta.symbol} {itemMeta.label}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </label>
                                  <label className="daily-edit-text">
                                    <span>内容</span>
                                    <input
                                      value={editEntryText}
                                      onChange={(event) =>
                                        setEditEntryText(event.target.value)
                                      }
                                      required
                                    />
                                  </label>
                                  <label className="daily-edit-detail">
                                    <span>補足</span>
                                    <input
                                      value={editEntryDetail}
                                      onChange={(event) =>
                                        setEditEntryDetail(event.target.value)
                                      }
                                    />
                                  </label>
                                  <label className="daily-edit-url">
                                    <span>URL（任意）</span>
                                    <input
                                      type="url"
                                      inputMode="url"
                                      maxLength={2048}
                                      value={editEntryUrl}
                                      onChange={(event) =>
                                        setEditEntryUrl(event.target.value)
                                      }
                                    />
                                  </label>
                                  <div className="inline-edit-actions">
                                    <button
                                      className="primary-button"
                                      type="submit"
                                    >
                                      保存
                                    </button>
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      onClick={() => setEditingEntryId("")}
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <time>{entry.time}</time>
                                  {entry.type === "task" ? (
                                    <button
                                      className="entry-symbol task-toggle"
                                      type="button"
                                      aria-label={`${entry.text}を${
                                        entry.completed ? "未完了" : "完了"
                                      }にする`}
                                      aria-pressed={entry.completed}
                                      onClick={() =>
                                        updateEntry(entry.id, {
                                          completed: !entry.completed,
                                        })
                                      }
                                    >
                                      {entry.completed ? "✓" : meta.symbol}
                                    </button>
                                  ) : (
                                    <span
                                      className="entry-symbol"
                                      aria-label={meta.label}
                                    >
                                      {meta.symbol}
                                    </span>
                                  )}
                                  <div className="entry-copy">
                                    <strong>{entry.text}</strong>
                                    {entry.detail && <span>{entry.detail}</span>}
                                    {entry.url && (
                                      <a
                                        className="record-url-link"
                                        href={entry.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        URLを開く
                                      </a>
                                    )}
                                    {entry.media?.length ? (
                                      <div className="record-media">
                                        {entry.media.map((media) => (
                                          <figure key={media.id}>
                                            <a
                                              className="media-original-link"
                                              href={media.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              aria-label={`${media.filename}を別窓で開く`}
                                            >
                                              {media.contentType.startsWith("video/") ? (
                                                <video muted playsInline preload="metadata">
                                                  <source src={media.url} type={media.contentType} />
                                                </video>
                                              ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                  src={media.url}
                                                  alt={media.filename}
                                                  loading="lazy"
                                                />
                                              )}
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void deleteEntryMedia(entry.id, media.id)
                                              }
                                            >
                                              削除
                                            </button>
                                          </figure>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="entry-actions">
                                    <button
                                      className="edit-button"
                                      type="button"
                                      onClick={() => startEditingEntry(entry)}
                                    >
                                      編集
                                    </button>
                                    <button
                                      className="delete-button"
                                      type="button"
                                      onClick={() => void removeEntry(entry.id)}
                                      aria-label={`${entry.text}を削除`}
                                    >
                                      削除
                                    </button>
                                  </div>
                                </>
                              )}
                            </article>
                          );
                        })}
            </div>
          </div>

          <section className="habits-section" aria-labelledby="habits-title">
            <div className="section-kicker">
              <p className="eyebrow">HABIT TRACE</p>
              <h2 id="habits-title">今日のリズム</h2>
            </div>
            <div className="habit-grid">
              {day.habits.map((habit) => (
                <button
                  type="button"
                  className={habit.done ? "habit done" : "habit"}
                  key={habit.id}
                  aria-pressed={habit.done}
                  onClick={() =>
                    setDay((current) => ({
                      ...current,
                      habits: current.habits.map((item) =>
                        item.id === habit.id
                          ? { ...item, done: !item.done }
                          : item,
                      ),
                    }))
                  }
                >
                  <span className="habit-dot" aria-hidden="true">
                    {habit.done ? "✓" : ""}
                  </span>
                  <span>
                    <strong>{habit.label}</strong>
                    <small>{habit.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section
            className="closing-section"
            id="reflection"
            aria-labelledby="closing-title"
          >
            <div className="closing-heading">
              <div>
                <p className="eyebrow">CLOSE THE DAY</p>
                <h2 id="closing-title">今日を閉じる</h2>
              </div>
              <span>{saveMessage}</span>
            </div>
            <div className="closing-grid">
              <div className="gratitude-panel">
                <h3>感謝したいこと</h3>
                <ol>
                  {day.gratitude.map((item, index) => (
                    <li key={index}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <textarea
                        value={item}
                        rows={2}
                        aria-label={`感謝したいこと ${index + 1}`}
                        onChange={(event) =>
                          updateGratitude(index, event.target.value)
                        }
                      />
                    </li>
                  ))}
                </ol>
              </div>
              <div className="reflection-panel">
                <label htmlFor="reflection-text">今日のふりかえり</label>
                <textarea
                  id="reflection-text"
                  value={day.reflection}
                  rows={8}
                  onChange={(event) =>
                    setDay((current) => ({
                      ...current,
                      reflection: event.target.value,
                    }))
                  }
                />
                <p>書いた内容はこの端末のブラウザに保存されます。</p>
              </div>
            </div>
          </section>

          <footer>
            <span>ハチワレ手帳 / HACHIWARE TECHO</span>
            <button type="button" onClick={() => window.scrollTo({ top: 0 })}>
              上へ戻る ↑
            </button>
          </footer>
        </div>
      </div>
    </main>
  );
}
