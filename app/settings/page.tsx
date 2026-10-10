"use client";

import { useEffect, useRef, useState } from "react";
import { SiteTabs } from "../components/SiteTabs";
import { PWAInstallPanel } from "../components/PWAInstallPanel";
import {
  clearAllRecords,
  exportBackup,
  getLocalStorageEstimate,
  importBackup,
} from "../local-store";
import { appPath } from "../url-utils";

type StorageEstimate = Awaited<ReturnType<typeof getLocalStorageEstimate>>;

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function SettingsPage() {
  const [usage, setUsage] = useState<StorageEstimate | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshUsage = () => getLocalStorageEstimate().then(setUsage).catch(() => setMessage("端末内の保存状況を読み込めませんでした"));

  useEffect(() => {
    void refreshUsage();
  }, []);

  const exportData = async () => {
    setBusy(true);
    setMessage("バックアップを準備しています…");
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hachiware-techo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("写真・動画を含むバックアップを書き出しました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "書き出せませんでした");
    } finally {
      setBusy(false);
    }
  };

  const importData = async (file?: File) => {
    if (!file || busy) return;
    if (!window.confirm("読み込むと、現在の端末内データをバックアップの内容に置き換えます。続けますか？")) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    setMessage("バックアップを読み込んでいます…");
    try {
      const records = await importBackup(JSON.parse(await file.text()));
      setMessage(`${records}件の項目を読み込みました。画面を更新します…`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "読み込めませんでした");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteAllData = async () => {
    if (confirmText !== "削除する" || busy) return;
    if (!window.confirm("この端末に保存した記録・写真・動画をすべて削除します。元に戻せません。続けますか？")) return;
    setBusy(true);
    setMessage("削除しています…");
    try {
      await clearAllRecords();
      setConfirmText("");
      setMessage("この端末のデータをすべて削除しました");
      await refreshUsage();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "削除できませんでした");
    } finally {
      setBusy(false);
    }
  };

  const usedPercent = usage?.quotaBytes
    ? Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100))
    : 0;

  return (
    <main className="settings-page" id="main-content">
      <div className="settings-wrap">
        <SiteTabs active="settings" />
        <header className="settings-header">
          <p className="eyebrow">LOCAL SETTINGS</p>
          <h1>設定</h1>
          <p>データはこの端末のブラウザ内に保存されます。</p>
        </header>

        <section className="settings-card" aria-labelledby="storage-title">
          <div>
            <p className="eyebrow">DEVICE STORAGE</p>
            <h2 id="storage-title">端末内の保存状況</h2>
          </div>
          {usage ? (
            <div className="usage-panel">
              <p>
                <strong>{formatBytes(usage.usedBytes)}</strong>
                <span>{usage.quotaBytes ? ` / 約${formatBytes(usage.quotaBytes)}` : "（ブラウザの使用量目安）"}</span>
              </p>
              {usage.quotaBytes > 0 && <div className="usage-track" aria-label={`端末内の使用量 ${usedPercent}%`}><span style={{ width: `${usedPercent}%` }} /></div>}
              <small>写真・動画 {formatBytes(usage.mediaBytes)} ／ {usage.fileCount}件</small>
            </div>
          ) : <p className="settings-muted">読み込み中…</p>}
          <p className="settings-copy">容量の上限や空き容量は、ブラウザと端末の設定によって変わります。ここに表示する使用量はブラウザが返す目安です。</p>
        </section>

        <section className="settings-card" aria-labelledby="daily-storage-title">
          <div><p className="eyebrow">ON THIS DEVICE</p><h2 id="daily-storage-title">端末内に保存</h2></div>
          <p className="settings-copy">日記、予定、INBOX、習慣、写真・動画をこの端末のIndexedDBに保存します。オフラインでも編集できます。同じブラウザのデータ削除や端末の故障に備えて、定期的にバックアップを書き出してください。</p>
        </section>

        <section className="settings-card" aria-labelledby="backup-title">
          <div><p className="eyebrow">BACKUP</p><h2 id="backup-title">バックアップ</h2></div>
          <p className="settings-copy">すべての記録と写真・動画をJSONファイルに書き出します。写真・動画の量によってファイルサイズが大きくなります。</p>
          <div className="backup-actions">
            <button className="primary-button" type="button" disabled={busy} onClick={() => void exportData()}>バックアップを書き出す（JSON、写真込み）</button>
            <button className="secondary-button" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>バックアップを読み込む</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importData(event.target.files?.[0])} />
          </div>
          {message && <p className="settings-message" role="status">{message}</p>}
        </section>

        <section className="settings-card" aria-labelledby="pwa-title">
          <div><p className="eyebrow">INSTALL APP</p><h2 id="pwa-title">端末にアプリとして追加</h2></div>
          <PWAInstallPanel />
        </section>

        <section className="settings-card" aria-labelledby="privacy-title">
          <div><p className="eyebrow">PRIVACY</p><h2 id="privacy-title">保存内容と取り扱い</h2></div>
          <p className="settings-copy">保存内容と削除方法をプライバシーのページで確認できます。</p>
          <a className="settings-link" href={appPath("/privacy/")}>プライバシーについて確認する →</a>
        </section>

        <section className="settings-card danger-card" aria-labelledby="delete-title">
          <div><p className="eyebrow">DELETE ALL DATA</p><h2 id="delete-title">すべてのデータを削除</h2></div>
          <p className="settings-copy">この端末に保存した予定、INBOX、ハビット、コレクション、ほしい物リスト、写真・動画、デイリーを削除します。実行後は元に戻せません。</p>
          <label className="delete-confirm-field">
            <span>確認のため「削除する」と入力</span>
            <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} />
          </label>
          <button className="danger-button" type="button" disabled={confirmText !== "削除する" || busy} onClick={() => void deleteAllData()}>{busy ? "処理中…" : "全データを削除する"}</button>
        </section>
      </div>
    </main>
  );
}
