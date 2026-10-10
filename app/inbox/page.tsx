"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { SiteTabs } from "../components/SiteTabs";
import {
  SAFE_MEDIA_ACCEPT,
} from "../media-policy";
import {
  uploadMediaFile,
  type UploadedMediaAsset,
} from "../media-upload-client";
import { createId, deleteMedia as deleteStoredMedia, deleteRecord, listEntitiesWithMedia, putRecord, recordKey } from "../local-store";

type InboxItem = {
  id: string;
  text: string;
  category: string;
  url: string;
  completed: boolean;
  createdAt: string;
  media: MediaAsset[];
};

type MediaAsset = UploadedMediaAsset;

const categories = ["メモ", "タスク", "アイデア", "あとで"];

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("メモ");
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState("すべて");
  const [message, setMessage] = useState("読み込み中…");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("メモ");
  const [editUrl, setEditUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const loadGenerationRef = useRef(0);

  const uploadMedia = async (itemId: string, files: File[]) => {
    const uploaded: MediaAsset[] = [];
    for (const file of files) {
      setMessage(`${file.name}を追加中…`);
      const media = await uploadMediaFile(
        file,
        {
          targetType: "inbox",
          targetId: itemId,
        },
        (percent) => setMessage(`${file.name}を追加中… ${percent}%`),
      );
      uploaded.push(media);
    }
    return uploaded;
  };

  useEffect(() => {
    let active = true;
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    listEntitiesWithMedia<InboxItem>("inbox")
      .then((savedItems) => {
        if (active && generation === loadGenerationRef.current) {
          setItems(savedItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          setMessage("端末内に保存済み");
        }
      })
      .catch(() => {
        if (active && generation === loadGenerationRef.current) {
          setMessage("INBOXを読み込めませんでした");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    if (filter === "未完了") return items.filter((item) => !item.completed);
    if (filter === "完了") return items.filter((item) => item.completed);
    return items;
  }, [filter, items]);

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || saving) return;
    loadGenerationRef.current += 1;
    const files = Array.from(createFileRef.current?.files ?? []);
    setSaving(true);
    setMessage("保存中…");
    try {
      const savedItem: InboxItem = {
        id: createId(), text: value, category, url, completed: false,
        createdAt: new Date().toISOString(), media: [],
      };
      await putRecord(recordKey("inbox", savedItem.id), savedItem);
      setItems((current) => [savedItem, ...current]);
      setFilter("すべて");
      setText("");
      setUrl("");
      if (createFileRef.current) createFileRef.current.value = "";
      if (files.length > 0) {
        try {
          const uploaded = await uploadMedia(savedItem.id, files);
          setItems((current) =>
            current.map((item) =>
              item.id === savedItem.id
                ? { ...item, media: [...item.media, ...uploaded] }
                : item,
            ),
          );
          setMessage("画像・動画と一緒に保存しました");
        } catch (error) {
          setMessage(
            error instanceof Error
              ? `項目は保存しましたが、${error.message}`
              : "項目は保存しましたが、画像・動画を追加できませんでした",
          );
        }
      } else {
        setMessage("端末内に保存済み");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "保存できませんでした。もう一度お試しください",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (item: InboxItem) => {
    const completed = !item.completed;
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, completed } : currentItem,
      ),
    );
    try {
      await putRecord(recordKey("inbox", item.id), { ...item, completed });
    } catch {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, completed: item.completed } : currentItem,
        ),
      );
      setMessage("更新できませんでした");
    }
  };

  const deleteItem = async (id: string) => {
    const item = items.find((current) => current.id === id);
    try {
      await Promise.all((item?.media ?? []).map((media) => deleteStoredMedia(media.id)));
      await deleteRecord(recordKey("inbox", id));
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("削除しました");
    } catch {
      setMessage("削除できませんでした");
    }
  };

  const startEditingItem = (item: InboxItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditCategory(item.category);
    setEditUrl(item.url ?? "");
  };

  const saveEditedItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = editText.trim();
    if (!editingId || !value || editSaving) return;
    const files = Array.from(editFileRef.current?.files ?? []);
    setEditSaving(true);
    setMessage("編集中…");
    try {
      const currentItem = items.find((item) => item.id === editingId);
      if (!currentItem) throw new Error("項目が見つかりませんでした");
      const updatedItem: InboxItem = { ...currentItem, text: value, category: editCategory, url: editUrl };
      await putRecord(recordKey("inbox", editingId), updatedItem);
      let uploaded: MediaAsset[] = [];
      if (files.length > 0) uploaded = await uploadMedia(editingId, files);
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? { ...updatedItem, media: [...item.media, ...uploaded] }
            : item,
        ),
      );
      if (editFileRef.current) editFileRef.current.value = "";
      setEditingId("");
      setMessage("編集しました");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "編集できませんでした",
      );
    } finally {
      setEditSaving(false);
    }
  };

  const deleteMedia = async (itemId: string, mediaId: string) => {
    try {
      await deleteStoredMedia(mediaId);
    } catch {
      setMessage("画像・動画を削除できませんでした");
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, media: item.media.filter((media) => media.id !== mediaId) }
          : item,
      ),
    );
    setMessage("画像・動画を削除しました");
  };

  return (
    <main className="page-shell" id="main-content">
      <aside className="section-rail" aria-label="INBOX">
        <div className="brand">
          <span className="brand-mark cat-mark" aria-hidden="true">八</span>
          <span>ハチワレ手帳 / INBOX</span>
        </div>
        <div className="rail-month inbox-count">
          <span>CAPTURE</span>
          <strong>{items.filter((item) => !item.completed).length}</strong>
          <small>UNPROCESSED</small>
        </div>
        <p className="rail-note">思いついたことを、まずここへ。整理はあとで。</p>
      </aside>

      <div className="content-page">
        <div className="content-inner inbox-inner">
          <SiteTabs active="inbox" />
          <header className="page-header">
            <div>
              <p className="eyebrow">INBOX / QUICK CAPTURE</p>
              <h1>まだ、行き先のないもの。</h1>
              <p className="date-line">メモ、タスク、アイデアをひとつのリストへ。</p>
            </div>
            <span className="save-state">{message}</span>
          </header>

          <form className="inbox-capture" onSubmit={addItem}>
            <label className="inbox-text">
              <span>思いついたこと</span>
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={500}
                required
                autoFocus
              />
            </label>
            <label>
              <span>種類</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="inbox-url-field">
              <span>URL（任意）</span>
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                maxLength={2048}
              />
            </label>
            <label className="inbox-file-field">
              <span>画像・動画（任意）</span>
              <input
                ref={createFileRef}
                type="file"
                accept={SAFE_MEDIA_ACCEPT}
                multiple
              />
            </label>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "保存中…" : "INBOXへ"}
            </button>
          </form>

          <section className="inbox-section" aria-labelledby="inbox-list-title">
            <div className="inbox-toolbar">
              <div>
                <p className="eyebrow">CAPTURED ITEMS</p>
                <h2 id="inbox-list-title">受け取ったもの</h2>
              </div>
              <div className="filter-tabs" aria-label="表示する項目">
                {["すべて", "未完了", "完了"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={filter === item ? "active" : ""}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="inbox-list">
              {visibleItems.length === 0 ? (
                <div className="empty-inbox">
                  <span>○</span>
                  <strong>ここには、まだ何もありません。</strong>
                  <p>頭の中にあることを、上の欄からひとつ置いてみましょう。</p>
                </div>
              ) : (
                visibleItems.map((item) => (
                  <article className={`inbox-item ${item.completed ? "completed" : ""}`} key={item.id}>
                    {editingId === item.id ? (
                      <form className="inbox-edit-form" onSubmit={saveEditedItem}>
                        <label>
                          <span>内容</span>
                          <input
                            value={editText}
                            onChange={(event) => setEditText(event.target.value)}
                            maxLength={500}
                            required
                            autoFocus
                          />
                        </label>
                        <label>
                          <span>種類</span>
                          <select
                            value={editCategory}
                            onChange={(event) => setEditCategory(event.target.value)}
                          >
                            {categories.map((categoryItem) => (
                              <option key={categoryItem}>{categoryItem}</option>
                            ))}
                          </select>
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
                        <label>
                          <span>画像・動画を追加</span>
                          <input
                            ref={editFileRef}
                            type="file"
                            accept={SAFE_MEDIA_ACCEPT}
                            multiple
                          />
                        </label>
                        <div className="inline-edit-actions">
                          <button className="primary-button" type="submit" disabled={editSaving}>
                            {editSaving ? "保存中…" : "保存"}
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setEditingId("")}
                          >
                            キャンセル
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="inbox-check"
                          aria-pressed={item.completed}
                          aria-label={`${item.text}を${item.completed ? "未完了" : "完了"}にする`}
                          onClick={() => void toggleItem(item)}
                        >
                          {item.completed ? "✓" : ""}
                        </button>
                        <div>
                          <strong>{item.text}</strong>
                          <span>
                            <b>{item.category}</b>
                            {new Intl.DateTimeFormat("ja-JP", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Tokyo",
                            }).format(new Date(item.createdAt))}
                          </span>
                          {item.url && (
                            <a
                              className="record-url-link"
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              URLを開く
                            </a>
                          )}
                          {item.media?.length > 0 && (
                            <div className="record-media">
                              {item.media.map((media) => (
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
                                      <img src={media.url} alt={media.filename} loading="lazy" />
                                    )}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => void deleteMedia(item.id, media.id)}
                                  >
                                    削除
                                  </button>
                                </figure>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="inbox-actions">
                          <button
                            className="inbox-edit"
                            type="button"
                            onClick={() => startEditingItem(item)}
                          >
                            編集
                          </button>
                          <button className="inbox-delete" type="button" onClick={() => void deleteItem(item.id)}>
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
