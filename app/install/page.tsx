import type { Metadata } from "next";
import Image from "next/image";
import { PWAInstallPanel } from "../components/PWAInstallPanel";
import { appPath } from "../url-utils";

export const metadata: Metadata = {
  title: "アプリとしてインストール",
  description:
    "ハチワレ手帳をスマホ、タブレット、パソコンへPWAとしてインストールする方法。",
};

export default function InstallPage() {
  return (
    <main className="install-page" id="main-content">
      <div className="install-wrap">
        <header className="install-nav">
          <a className="guide-brand" href={appPath("/")}>
            <span aria-hidden="true">八</span>
            <strong>ハチワレ手帳</strong>
          </a>
          <a className="guide-nav-link" href={appPath("/")}>
            アプリを開く
          </a>
        </header>

        <section className="install-hero" aria-labelledby="install-title">
          <Image src={appPath("/icon-192.png")} alt="" width={132} height={132} priority />
          <div>
            <p className="eyebrow">INSTALL HACHIWARE TECHO</p>
            <h1 id="install-title">端末にアプリとして追加</h1>
            <p>
              ホーム画面やデスクトップから、ハチワレ手帳をすぐに開けます。
              App StoreやGoogle Playからのダウンロードは必要ありません。
            </p>
          </div>
        </section>

        <section className="install-action-card" aria-labelledby="install-action-title">
          <div>
            <p className="eyebrow">INSTALL STATUS</p>
            <h2 id="install-action-title">この端末へ追加する</h2>
          </div>
          <PWAInstallPanel />
        </section>

        <div className="install-platform-grid">
          <section>
            <span>iPhone / iPad</span>
            <h2>Safariで追加</h2>
            <ol>
              <li>このページをSafariで開く</li>
              <li>共有ボタンを押す</li>
              <li>「ホーム画面に追加」を選ぶ</li>
              <li>右上の「追加」を押す</li>
            </ol>
          </section>
          <section>
            <span>Android</span>
            <h2>Chromeで追加</h2>
            <ol>
              <li>このページをChromeで開く</li>
              <li>表示されたインストールボタンを押す</li>
              <li>表示されない場合はブラウザのメニューを開く</li>
              <li>「アプリをインストール」を選ぶ</li>
            </ol>
          </section>
          <section>
            <span>Windows / macOS</span>
            <h2>パソコンへ追加</h2>
            <ol>
              <li>ChromeまたはEdgeで開く</li>
              <li>アドレス欄のインストールマークを押す</li>
              <li>「インストール」を選ぶ</li>
              <li>デスクトップから起動する</li>
            </ol>
          </section>
        </div>

        <p className="install-footnote">
          X・LINEなどのアプリ内ブラウザではインストールできない場合があります。
          Safari、Chrome、Edgeのいずれかで開いてください。
        </p>
      </div>
    </main>
  );
}
