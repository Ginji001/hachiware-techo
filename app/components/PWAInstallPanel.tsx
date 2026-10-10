"use client";

import { usePWA } from "./PWAProvider";

export function PWAInstallPanel() {
  const {
    canInstall,
    install,
    installMessage,
    isIOS,
    isOnline,
    isStandalone,
  } = usePWA();

  let guidance =
    "ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。";
  if (isIOS) {
    guidance =
      "Safariの共有ボタンを押し、「ホーム画面に追加」を選んでください。";
  }
  if (isStandalone) {
    guidance = "この端末ではアプリとして起動しています。";
  }

  return (
    <div className="pwa-install-panel">
      <div className="pwa-state-row" aria-label="アプリの状態">
        <span className={isStandalone ? "is-ready" : ""}>
          {isStandalone ? "インストール済み" : "ブラウザで使用中"}
        </span>
        <span className={isOnline ? "is-ready" : "is-offline"}>
          {isOnline ? "オンライン" : "オフライン"}
        </span>
      </div>
      <p className="settings-copy">{guidance}</p>
      {canInstall && !isStandalone && (
        <button
          className="pwa-install-button"
          type="button"
          onClick={() => void install()}
        >
          この端末にインストール
        </button>
      )}
      {installMessage && (
        <p className="pwa-install-message" role="status">
          {installMessage}
        </p>
      )}
      <small>
        記録とメディアはこの端末のIndexedDBに保存します。
      </small>
    </div>
  );
}
