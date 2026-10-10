"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SiteTabs } from "../components/SiteTabs";
import { createId, deleteRecord, listRecords, putRecord, recordKey } from "../local-store";

type WishlistItem = {
  id: string;
  title: string;
  note: string;
  url: string;
  completed: boolean;
  createdAt: string;
};

type Filter = "すべて" | "未" | "済";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState<Filter>("すべて");
  const [message, setMessage] = useState("読み込み中…");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editUrl, setEditUrl] = useState("");

  useEffect(() => {
    let active = true;
    listRecords<WishlistItem>("wishlist")
      .then((savedItems) => {
        if (active) {
          setItems(savedItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          setMessage("端末内に保存済み");
        }
      })
      .catch(() => {
        if (active) setMessage("ほしい物リストを読み込めませんでした");
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    if (filter === "未") return items.filter((item) => !item.completed);
    if (filter === "済") return items.filter((item) => item.completed);
    return items;
  }, [filter, items]);

  const remainingCount = items.filter((item) => !item.completed).length;

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setMessage("保存中…");
    try {
      const item: WishlistItem = {
        id: createId(), title: title.trim(), note: note.trim(), url: url.trim(),
        completed: false, createdAt: new Date().toISOString(),
      };
      await putRecord(recordKey("wishlist", item.id), item);
      setItems((current) => [item, ...current]);
      setTitle("");
      setNote("");
      setUrl("");
      setFilter("すべて");
      setMessage("ほしい物を追加しました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "追加できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (item: WishlistItem, completed: boolean) => {
    if (item.completed === completed || updatingId) return;
    setUpdatingId(item.id);
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, completed } : currentItem,
      ),
    );
    try {
      await putRecord(recordKey("wishlist", item.id), { ...item, completed });
      setMessage(completed ? "「済」に変更しました" : "「未」に戻しました");
    } catch {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, completed: item.completed }
            : currentItem,
        ),
      );
      setMessage("状態を更新できませんでした");
    } finally {
      setUpdatingId("");
    }
  };

  const startEditing = (item: WishlistItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditNote(item.note);
    setEditUrl(item.url);
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId || !editTitle.trim() || updatingId) return;
    setUpdatingId(editingId);
    setMessage("編集中…");
    try {
      const existing = items.find((item) => item.id === editingId);
      if (!existing) throw new Error("項目が見つかりませんでした");
      const updated = { ...existing, title: editTitle.trim(), note: editNote.trim(), url: editUrl.trim() };
      await putRecord(recordKey("wishlist", updated.id), updated);
      setItems((current) =>
        current.map((item) => item.id === editingId ? updated : item),
      );
      setEditingId("");
      setMessage("編集しました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "編集できませんでした");
    } finally {
      setUpdatingId("");
    }
  };

  const deleteItem = async (id: string) => {
    if (updatingId) return;
    setUpdatingId(id);
    try {
      await deleteRecord(recordKey("wishlist", id));
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("削除しました");
    } catch {
      setMessage("削除できませんでした");
    }
    setUpdatingId("");
  };

  return (
    <main className="page-shell" id="main-content">
      <aside className="section-rail" aria-label="ほしい物リスト">
        <div className="brand">
          <span className="brand-mark cat-mark" aria-hidden="true">八</span>
          <span>ハチワレ手帳 / WISHLIST</span>
        </div>
        <div className="rail-month wishlist-count">
          <span>WANT</span>
          <strong>{remainingCount}</strong>
          <small>未</small>
        </div>
        <p className="rail-note">気になるものを縦に並べ、手に入れたら「済」へ。</p>
      </aside>

      <div className="content-page">
        <div className="content-inner wishlist-inner">
          <SiteTabs active="wishlist" />
          <header className="page-header">
            <div>
              <p className="eyebrow">WISHLIST / WANT &amp; GOT</p>
              <h1>ほしい物を、ひとつずつ。</h1>
              <p className="date-line">縦のリストで「未」「済」を管理できます。</p>
            </div>
            <span className="save-state">{message}</span>
          </header>

          <form className="wishlist-form" onSubmit={addItem}>
            <label>
              <span>ほしい物</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
                autoFocus
              />
            </label>
            <label>
              <span>メモ（任意）</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
              />
            </label>
            <label>
              <span>URL（任意）</span>
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                maxLength={2048}
              />
            </label>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "追加中…" : "リストへ追加"}
            </button>
          </form>

          <section className="wishlist-section" aria-labelledby="wishlist-title">
            <div className="wishlist-toolbar">
              <div>
                <p className="eyebrow">YOUR WISHLIST</p>
                <h2 id="wishlist-title">ほしい物リスト</h2>
              </div>
              <div className="filter-tabs" aria-label="表示する状態">
                {(["すべて", "未", "済"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="wishlist-list">
              {visibleItems.length === 0 ? (
                <div className="wishlist-empty">
                  <strong>ここには、まだ何もありません。</strong>
                </div>
              ) : (
                visibleItems.map((item) => (
                  <article
                    className={`wishlist-item ${item.completed ? "completed" : ""}`}
                    key={item.id}
                  >
                    {editingId === item.id ? (
                      <form className="wishlist-edit-form" onSubmit={saveEdit}>
                        <label>
                          <span>ほしい物</span>
                          <input
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            maxLength={120}
                            required
                            autoFocus
                          />
                        </label>
                        <label>
                          <span>メモ（任意）</span>
                          <input
                            value={editNote}
                            onChange={(event) => setEditNote(event.target.value)}
                            maxLength={500}
                          />
                        </label>
                        <label>
                          <span>URL（任意）</span>
                          <input
                            type="url"
                            inputMode="url"
                            value={editUrl}
                            onChange={(event) => setEditUrl(event.target.value)}
                            maxLength={2048}
                          />
                        </label>
                        <div className="inline-edit-actions">
                          <button className="primary-button" type="submit" disabled={updatingId === item.id}>
                            保存
                          </button>
                          <button className="secondary-button" type="button" onClick={() => setEditingId("")}>
                            キャンセル
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="wishlist-status" aria-label={`${item.title}の状態`}>
                          <button
                            type="button"
                            className={!item.completed ? "active" : ""}
                            aria-pressed={!item.completed}
                            disabled={updatingId === item.id}
                            onClick={() => void setStatus(item, false)}
                          >
                            未
                          </button>
                          <button
                            type="button"
                            className={item.completed ? "active" : ""}
                            aria-pressed={item.completed}
                            disabled={updatingId === item.id}
                            onClick={() => void setStatus(item, true)}
                          >
                            済
                          </button>
                        </div>
                        <div className="wishlist-copy">
                          <strong>{item.title}</strong>
                          {item.note && <span>{item.note}</span>}
                          {item.url && (
                            <a className="record-url-link" href={item.url} target="_blank" rel="noreferrer">
                              URLを開く
                            </a>
                          )}
                        </div>
                        <div className="wishlist-actions">
                          <button className="wishlist-edit" type="button" onClick={() => startEditing(item)}>
                            編集
                          </button>
                          <button className="wishlist-delete" type="button" onClick={() => void deleteItem(item.id)}>
                            削除
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
