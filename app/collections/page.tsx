"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { SiteTabs } from "../components/SiteTabs";
import {
  SAFE_MEDIA_ACCEPT,
  mediaPolicyText,
} from "../media-policy";
import {
  uploadMediaFile,
  type UploadedMediaAsset,
} from "../media-upload-client";
import { createId, deleteMedia as deleteStoredMedia, listEntitiesWithMedia, putRecord, recordKey } from "../local-store";

type MediaAsset = UploadedMediaAsset;

type Collection = {
  id: string;
  title: string;
  description: string;
  url: string;
  createdAt: string;
  media: MediaAsset[];
};

const formatBytes = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("読み込み中…");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaCount = useMemo(
    () => collections.reduce((total, collection) => total + collection.media.length, 0),
    [collections],
  );

  useEffect(() => {
    let active = true;
    listEntitiesWithMedia<Collection>("collection")
      .then((savedCollections) => {
        if (active) {
          const next = savedCollections.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setCollections(next);
          setSelectedId((current) => current || next[0]?.id || "");
          setMessage("端末内に保存済み");
        }
      })
      .catch(() => {
        if (active) setMessage("コレクションを読み込めませんでした");
      });
    return () => {
      active = false;
    };
  }, []);

  const createCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setMessage("保存中…");
    try {
      const collection: Collection = {
        id: createId(), title: title.trim(), description: description.trim(), url: url.trim(),
        createdAt: new Date().toISOString(), media: [],
      };
      await putRecord(recordKey("collection", collection.id), collection);
      setCollections((current) => [collection, ...current]);
      setSelectedId(collection.id);
      setTitle("");
      setDescription("");
      setUrl("");
      setMessage("コレクションを追加しました");
    } catch {
      setMessage("コレクションを追加できませんでした");
    } finally {
      setCreating(false);
    }
  };

  const uploadFiles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const files = Array.from(fileInputRef.current?.files ?? []);
    if (!selectedId || files.length === 0 || uploading) return;
    setUploading(true);
    setMessage(`${files.length}件をアップロード中…`);
    try {
      const uploaded: MediaAsset[] = [];
      for (const file of files) {
        setMessage(`${file.name}を追加中…`);
        const media = await uploadMediaFile(
          file,
          {
            targetType: "collection",
            targetId: selectedId,
          },
          (percent) => setMessage(`${file.name}を追加中… ${percent}%`),
        );
        uploaded.push(media);
      }
      setCollections((current) =>
        current.map((collection) =>
          collection.id === selectedId
            ? { ...collection, media: [...collection.media, ...uploaded] }
            : collection,
        ),
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(`${uploaded.length}件を追加しました`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "画像・動画を追加できませんでした",
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (collectionId: string, mediaId: string) => {
    try {
      await deleteStoredMedia(mediaId);
      setCollections((current) =>
        current.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                media: collection.media.filter((media) => media.id !== mediaId),
              }
            : collection,
        ),
      );
      setMessage("メディアを削除しました");
    } catch {
      setMessage("削除できませんでした");
    }
  };

  const startEditingCollection = (collection: Collection) => {
    setEditingCollectionId(collection.id);
    setEditTitle(collection.title);
    setEditDescription(collection.description);
    setEditUrl(collection.url ?? "");
  };

  const saveEditedCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCollectionId || !editTitle.trim() || editSaving) return;
    setEditSaving(true);
    setMessage("編集中…");
    try {
      const existing = collections.find((item) => item.id === editingCollectionId);
      if (!existing) throw new Error("コレクションが見つかりませんでした");
      const updated = { ...existing, title: editTitle.trim(), description: editDescription.trim(), url: editUrl.trim() };
      await putRecord(recordKey("collection", updated.id), updated);
      setCollections((current) =>
        current.map((collection) =>
          collection.id === editingCollectionId
            ? updated
            : collection,
        ),
      );
      setEditingCollectionId("");
      setMessage("コレクションを編集しました");
    } catch {
      setMessage("コレクションを編集できませんでした");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <main className="page-shell" id="main-content">
      <aside className="section-rail" aria-label="コレクション">
        <div className="brand">
          <span className="brand-mark cat-mark" aria-hidden="true">八</span>
          <span>ハチワレ手帳 / COLLECTIONS</span>
        </div>
        <div className="rail-month collection-count">
          <span>COLLECT</span>
          <strong>{collections.length}</strong>
          <small>{mediaCount} MEDIA</small>
        </div>
        <p className="rail-note">好きなもの、残したい景色、あとで見返したい記録をひとまとめに。</p>
      </aside>

      <div className="content-page">
        <div className="content-inner collections-inner">
          <SiteTabs active="collections" />
          <header className="page-header">
            <div>
              <p className="eyebrow">COLLECTIONS / MEDIA</p>
              <h1>残しておきたいものを、集める。</h1>
              <p className="date-line">画像と動画を、テーマごとにまとめておけます。</p>
            </div>
            <span className="save-state">{message}</span>
          </header>

          <div className="collection-tools">
            <form className="collection-form" onSubmit={createCollection}>
              <div className="tool-heading">
                <span>01</span>
                <div>
                  <p className="eyebrow">NEW COLLECTION</p>
                  <h2>コレクションを作る</h2>
                </div>
              </div>
              <label>
                <span>タイトル</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                />
              </label>
              <label>
                <span>説明（任意）</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
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
              <button className="primary-button" type="submit" disabled={creating}>
                {creating ? "作成中…" : "作成する"}
              </button>
            </form>

            <form className="upload-form" onSubmit={uploadFiles}>
              <div className="tool-heading">
                <span>02</span>
                <div>
                  <p className="eyebrow">ADD MEDIA</p>
                  <h2>画像・動画を貼る</h2>
                </div>
              </div>
              <label>
                <span>追加先</span>
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  disabled={collections.length === 0}
                >
                  {collections.length === 0 ? (
                    <option value="">先にコレクションを作成</option>
                  ) : (
                    collections.map((collection) => (
                      <option value={collection.id} key={collection.id}>
                        {collection.title}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="file-drop">
                <span>ファイルを選択</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SAFE_MEDIA_ACCEPT}
                  multiple
                  disabled={collections.length === 0}
                />
                <small>{mediaPolicyText}／複数選択可</small>
              </label>
              <button
                className="primary-button"
                type="submit"
                disabled={uploading || collections.length === 0}
              >
                {uploading ? "追加中…" : "追加する"}
              </button>
            </form>
          </div>

          <section className="collections-section" aria-labelledby="collections-title">
            <div className="collection-section-heading">
              <div>
                <p className="eyebrow">YOUR COLLECTIONS</p>
                <h2 id="collections-title">集めたもの</h2>
              </div>
              <span>{collections.length} COLLECTIONS / {mediaCount} MEDIA</span>
            </div>

            {collections.length === 0 ? (
              <div className="empty-collections">
                <span aria-hidden="true">＋</span>
                <strong>最初のコレクションを作りましょう。</strong>
                <p>上のフォームにタイトルをつけるところから始められます。</p>
              </div>
            ) : (
              <div className="collection-list">
                {collections.map((collection) => (
                  <article className="collection-card" key={collection.id}>
                    <header>
                      <div>
                        <span>{String(collection.media.length).padStart(2, "0")} ITEMS</span>
                        <h3>{collection.title}</h3>
                        {collection.description && <p>{collection.description}</p>}
                        {collection.url && (
                          <a
                            className="record-url-link"
                            href={collection.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            URLを開く
                          </a>
                        )}
                      </div>
                      <div className="collection-card-actions">
                        <button
                          type="button"
                          onClick={() => startEditingCollection(collection)}
                        >
                          編集
                        </button>
                        <button type="button" onClick={() => setSelectedId(collection.id)}>
                          ここへ追加
                        </button>
                      </div>
                    </header>
                    {editingCollectionId === collection.id && (
                      <form
                        className="collection-edit-form"
                        onSubmit={saveEditedCollection}
                      >
                        <label>
                          <span>タイトル</span>
                          <input
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            maxLength={80}
                            required
                            autoFocus
                          />
                        </label>
                        <label>
                          <span>説明（任意）</span>
                          <textarea
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            maxLength={500}
                            rows={3}
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
                          <button className="primary-button" type="submit" disabled={editSaving}>
                            {editSaving ? "保存中…" : "変更を保存"}
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setEditingCollectionId("")}
                          >
                            キャンセル
                          </button>
                        </div>
                      </form>
                    )}
                    {collection.media.length === 0 ? (
                      <div className="collection-blank">
                        <span>□</span>
                        <p>画像や動画を追加すると、ここに並びます。</p>
                      </div>
                    ) : (
                      <div className="media-grid">
                        {collection.media.map((media) => (
                          <figure className="media-item" key={media.id}>
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
                                  動画を再生できません。
                                </video>
                              ) : (
                                // Dynamic, authenticated media is served from the same origin.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={media.url} alt={media.filename} loading="lazy" />
                              )}
                            </a>
                            <figcaption>
                              <div>
                                <strong>{media.filename}</strong>
                                <span>{formatBytes(media.size)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void deleteMedia(collection.id, media.id)}
                                aria-label={`${media.filename}を削除`}
                              >
                                削除
                              </button>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
