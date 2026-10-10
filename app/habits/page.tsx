"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SiteTabs } from "../components/SiteTabs";
import { createId, deleteRecord, listRecords, putRecord, recordKey } from "../local-store";

type Habit = {
  id: string;
  name: string;
  note: string;
  createdAt: string;
};

type HabitCheckin = {
  habitId: string;
  date: string;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function todayInTokyo() {
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
}

function dateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function datesInMonth(year: number, month: number) {
  const count = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) => new Date(Date.UTC(year, month - 1, index + 1, 12)),
  );
}

const checkinKey = (habitId: string, date: string) => `${habitId}:${date}`;

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("読み込み中…");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editingSaving, setEditingSaving] = useState(false);
  const today = useMemo(() => todayInTokyo(), []);
  const [cursor, setCursor] = useState({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth() + 1,
  });
  const monthDates = useMemo(
    () => datesInMonth(cursor.year, cursor.month),
    [cursor],
  );
  const todayKey = dateKey(today);

  useEffect(() => {
    let active = true;
    Promise.all([listRecords<Habit>("habit"), listRecords<HabitCheckin>("checkin")])
      .then(([savedHabits, checkins]) => {
        if (!active) return;
        setHabits(savedHabits.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        setCompletedKeys(
          new Set(
            checkins.map((item) =>
              checkinKey(item.habitId, item.date),
            ),
          ),
        );
        setMessage("端末内に保存済み");
      })
      .catch(() => {
        if (active) setMessage("ハビットを読み込めませんでした");
      });
    return () => {
      active = false;
    };
  }, []);

  const addHabit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = name.trim();
    if (!value || saving) return;
    setSaving(true);
    setMessage("保存中…");
    try {
      const habit: Habit = {
        id: createId(), name: value, note: note.trim(), createdAt: new Date().toISOString(),
      };
      await putRecord(recordKey("habit", habit.id), habit);
      setHabits((current) => [...current, habit]);
      setName("");
      setNote("");
      setMessage("項目を追加しました");
    } catch {
      setMessage("保存できませんでした。もう一度お試しください");
    } finally {
      setSaving(false);
    }
  };

  const toggleCheckin = async (habitId: string, date: string) => {
    const key = checkinKey(habitId, date);
    const completed = !completedKeys.has(key);
    setCompletedKeys((current) => {
      const next = new Set(current);
      if (completed) next.add(key);
      else next.delete(key);
      return next;
    });
    setMessage("保存中…");

    try {
      const storeKey = recordKey("checkin", key);
      if (completed) await putRecord(storeKey, { habitId, date });
      else await deleteRecord(storeKey);
      setMessage("端末内に保存済み");
    } catch {
      setCompletedKeys((current) => {
        const next = new Set(current);
        if (completed) next.delete(key);
        else next.add(key);
        return next;
      });
      setMessage("更新できませんでした");
    }
  };

  const startEditing = (habit: Habit) => {
    setEditingId(habit.id);
    setEditName(habit.name);
    setEditNote(habit.note);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditNote("");
  };

  const saveHabitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = editName.trim();
    if (!editingId || !value || editingSaving) return;
    setEditingSaving(true);
    setMessage("変更を保存中…");
    try {
      const existing = habits.find((item) => item.id === editingId);
      if (!existing) throw new Error("習慣が見つかりませんでした");
      const updated = { ...existing, name: value, note: editNote.trim() };
      await putRecord(recordKey("habit", updated.id), updated);
      setHabits((current) =>
        current.map((habit) =>
          habit.id === updated.id ? updated : habit,
        ),
      );
      cancelEditing();
      setMessage("変更を保存しました");
    } catch {
      setMessage("変更できませんでした。もう一度お試しください");
    } finally {
      setEditingSaving(false);
    }
  };

  const deleteHabit = async (habit: Habit) => {
    if (!window.confirm(`「${habit.name}」を削除しますか？`)) return;
    try {
      const checkins = await listRecords<HabitCheckin>("checkin");
      await Promise.all([
        deleteRecord(recordKey("habit", habit.id)),
        ...checkins
          .filter((item) => item.habitId === habit.id)
          .map((item) => deleteRecord(recordKey("checkin", checkinKey(item.habitId, item.date)))),
      ]);
    } catch {
      setMessage("削除できませんでした");
      return;
    }
    setHabits((current) => current.filter((item) => item.id !== habit.id));
    setCompletedKeys((current) => {
      const next = new Set(
        Array.from(current).filter((key) => !key.startsWith(`${habit.id}:`)),
      );
      return next;
    });
    setMessage("項目を削除しました");
  };

  const todayCompleted = habits.filter((habit) =>
    completedKeys.has(checkinKey(habit.id, todayKey)),
  ).length;
  const currentMonthNumber =
    today.getUTCFullYear() * 12 + today.getUTCMonth() + 1;
  const cursorMonthNumber = cursor.year * 12 + cursor.month;
  const trackedDates =
    cursorMonthNumber < currentMonthNumber
      ? monthDates
      : cursorMonthNumber === currentMonthNumber
        ? monthDates.filter((date) => dateKey(date) <= todayKey)
        : [];
  const completedThroughToday = habits.reduce(
    (total, habit) =>
      total +
      trackedDates.filter((date) =>
        completedKeys.has(checkinKey(habit.id, dateKey(date))),
      ).length,
    0,
  );
  const opportunities = habits.length * trackedDates.length;
  const monthRate =
    opportunities === 0
      ? 0
      : Math.round((completedThroughToday / opportunities) * 100);
  const monthLabel = `${cursor.year}年${cursor.month}月`;

  const moveMonth = (delta: number) => {
    setCursor((current) => {
      const date = new Date(
        Date.UTC(current.year, current.month - 1 + delta, 1, 12),
      );
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
      };
    });
  };

  return (
    <main className="page-shell habits-shell" id="main-content">
      <aside className="section-rail habits-rail" aria-label="ハビット">
        <div className="brand">
          <span className="brand-mark cat-mark" aria-hidden="true">八</span>
          <span>ハチワレ手帳 / HABITS</span>
        </div>
        <div className="rail-month">
          <span>{cursor.year}</span>
          <strong>{String(cursor.month).padStart(2, "0")}</strong>
          <small>HABIT TRACKER</small>
        </div>
        <div className="habit-rail-progress" aria-label={`今月の達成率 ${monthRate}%`}>
          <div><span style={{ width: `${monthRate}%` }} /></div>
          <p><strong>{monthRate}%</strong><span>今月の達成率</span></p>
        </div>
        <p className="rail-note">
          続けたいことを、自分の言葉で。小さな印を毎日ひとつずつ。
        </p>
      </aside>

      <div className="content-page">
        <div className="content-inner habits-inner">
          <SiteTabs active="habits" />
          <header className="page-header habits-header">
            <div>
              <p className="eyebrow">HABIT TRACKER / MONTHLY TRACE</p>
              <h1>続けたいことを、育てる。</h1>
              <p className="date-line">
                {monthLabel}
                {cursorMonthNumber === currentMonthNumber
                  ? `・今日 ${todayCompleted} / ${habits.length} 達成`
                  : ""}
              </p>
            </div>
            <div className="habit-month-actions">
              <div className="top-actions" aria-label="表示する月">
                <button className="text-button" type="button" onClick={() => moveMonth(-1)}>
                  ← 前月
                </button>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() =>
                    setCursor({
                      year: today.getUTCFullYear(),
                      month: today.getUTCMonth() + 1,
                    })
                  }
                >
                  今月
                </button>
                <button className="text-button" type="button" onClick={() => moveMonth(1)}>
                  翌月 →
                </button>
              </div>
              <span className="save-state">{message}</span>
            </div>
          </header>

          <form className="habit-create-form" onSubmit={addHabit}>
            <div className="habit-create-heading">
              <span>＋</span>
              <div>
                <p className="eyebrow">NEW HABIT</p>
                <h2>自由に項目を追加</h2>
              </div>
            </div>
            <label>
              <span>続けたいこと</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label>
              <span>ひとこと（任意）</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={240}
              />
            </label>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "追加中…" : "項目を追加"}
            </button>
          </form>

          {habits.length > 0 && (
            <section className="habit-manager" aria-labelledby="habit-manager-title">
              <div className="habit-manager-heading">
                <p className="eyebrow">YOUR HABITS</p>
                <h2 id="habit-manager-title">登録項目を編集・削除</h2>
                <p>項目名やメモは、いつでも変更できます。</p>
              </div>
              <div className="habit-manager-list">
                {habits.map((habit, index) => (
                  <article
                    className={editingId === habit.id ? "editing" : ""}
                    key={habit.id}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {editingId === habit.id ? (
                      <form className="habit-edit-form" onSubmit={saveHabitEdit}>
                        <label>
                          <span>続けたいこと</span>
                          <input
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            maxLength={80}
                            autoFocus
                            required
                          />
                        </label>
                        <label>
                          <span>ひとこと（任意）</span>
                          <input
                            value={editNote}
                            onChange={(event) => setEditNote(event.target.value)}
                            maxLength={240}
                          />
                        </label>
                        <div className="habit-edit-actions">
                          <button
                            className="habit-edit-save"
                            type="submit"
                            disabled={editingSaving}
                          >
                            {editingSaving ? "保存中…" : "変更を保存"}
                          </button>
                          <button type="button" onClick={cancelEditing}>
                            キャンセル
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <strong>{habit.name}</strong>
                          {habit.note && <small>{habit.note}</small>}
                        </div>
                        <div className="habit-manager-actions">
                          <button
                            className="habit-manager-edit"
                            type="button"
                            onClick={() => startEditing(habit)}
                          >
                            編集する
                          </button>
                          <button
                            className="habit-manager-delete"
                            type="button"
                            onClick={() => void deleteHabit(habit)}
                          >
                            削除
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="habit-board-section" aria-labelledby="habit-board-title">
            <div className="habit-board-heading">
              <div>
                <p className="eyebrow">MONTHLY TRACE</p>
                <h2 id="habit-board-title">{monthLabel}の記録</h2>
              </div>
              <span>{completedThroughToday} CHECKS</span>
            </div>

            {habits.length === 0 ? (
              <div className="habit-empty">
                <span aria-hidden="true">○</span>
                <strong>最初の習慣を決めましょう。</strong>
                <p>上の欄に、続けたいことを自由に入力してください。</p>
              </div>
            ) : (
              <div
                className="habit-vertical-calendar"
                aria-label={`${monthLabel}のハビットカレンダー`}
              >
                {monthDates.map((date) => {
                  const key = dateKey(date);
                  const completedCount = habits.filter((habit) =>
                    completedKeys.has(checkinKey(habit.id, key)),
                  ).length;
                  return (
                    <article
                      className={`habit-day-row ${
                        key === todayKey ? "today" : ""
                      }`}
                      key={key}
                    >
                      <header className="habit-day-date">
                        <time dateTime={key}>
                          <strong>{date.getUTCDate()}</strong>
                          <span>{weekdays[date.getUTCDay()]}曜日</span>
                        </time>
                        <div>
                          {key === todayKey && <b>今日</b>}
                          <small>
                            {completedCount} / {habits.length}
                          </small>
                        </div>
                      </header>
                      <div className="habit-day-checks">
                        {habits.map((habit) => {
                          const completed = completedKeys.has(
                            checkinKey(habit.id, key),
                          );
                          return (
                            <button
                              type="button"
                              className={completed ? "completed" : ""}
                              aria-pressed={completed}
                              aria-label={`${habit.name}の${date.getUTCMonth() + 1}月${date.getUTCDate()}日を${completed ? "未完了" : "完了"}にする`}
                              onClick={() => void toggleCheckin(habit.id, key)}
                              key={habit.id}
                            >
                              <span aria-hidden="true">
                                {completed ? "✓" : ""}
                              </span>
                              <strong>{habit.name}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <p className="habit-footnote">
            項目も達成記録も、この端末のブラウザ内に保存されます。
          </p>
        </div>
      </div>
    </main>
  );
}
