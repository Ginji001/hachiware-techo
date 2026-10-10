import type { Metadata } from "next";
import { PrintButton } from "../components/PrintButton";
import { appPath } from "../url-utils";

export const metadata: Metadata = {
  title: "プライバシー",
  description: "ハチワレ手帳の保存場所とデータ削除方法について。",
};

const sections = [
  ["01", "保存する情報", "日記、予定、INBOX、ハビット、コレクション、ほしい物リスト、写真・動画は、利用中のブラウザのIndexedDBに保存されます。保存キーとデータベース名は公開版専用です。"],
  ["02", "サーバーへの送信", "アプリの記録やメディアをこのサービスのサーバーへ送信しません。アカウント登録やログインもありません。GitHub Pagesから画面のファイルを取得して利用します。"],
  ["03", "写真・動画", "コレクションとINBOXに追加した写真・動画の実体も、ブラウザ内のIndexedDBに保存します。対応形式はJPEG、PNG、WebP、GIF、MP4、WebM、MOV、1件あたりの上限は50MBです。保存できる合計容量は端末とブラウザにより異なります。"],
  ["04", "Googleカレンダー", "設定を有効にして予定を保存した場合、予定の日時・タイトル・場所がGoogleカレンダーの追加画面を開くURLに含まれます。Googleへの送信を望まない場合は、マンスリーの「Googleへ追加」設定をオフにしてください。"],
  ["05", "オフラインとキャッシュ", "PWAはアプリの画面、アイコン、訪問したページなどを端末のキャッシュに保存し、オフライン時に表示します。日記や予定、画像・動画のデータはサービスワーカーのキャッシュには保存しません。記録はIndexedDBに保存します。"],
  ["06", "バックアップ", "設定から写真・動画を含むJSONを書き出せます。バックアップには記録内容が含まれるため、他人に見られない場所で保管してください。読み込み時は現在のデータをバックアップの内容に置き換えます。"],
  ["07", "削除", "設定の「全データを削除」から、このアプリがIndexedDBに保存した内容を削除できます。ブラウザのサイトデータを消去した場合も、バックアップがなければ記録を復元できません。"],
  ["08", "非公式サービス", "ハチワレ手帳は非公式の個人制作アプリです。利用は無料で、ログインは不要です。"],
];

export default function PrivacyPage() {
  return (
    <main className="policy-page" id="main-content">
      <div className="policy-wrap">
        <header className="guide-public-nav">
          <a className="guide-brand" href={appPath("/")}>
            <span aria-hidden="true">八</span><strong>ハチワレ手帳</strong>
          </a>
          <div className="guide-public-actions">
            <PrintButton />
            <a className="guide-nav-link" href={appPath("/settings/")}>設定へ戻る</a>
          </div>
        </header>

        <header className="policy-hero">
          <p className="eyebrow">PRIVACY INFORMATION</p>
          <h1>記録は端末の中に。</h1>
          <p>ハチワレ手帳は無料の非公式アプリです。ログインは不要で、アプリに入力した記録は利用中の端末内に保存されます。</p>
        </header>

        <div className="policy-sections">
          {sections.map(([number, title, text]) => (
            <section key={number}>
              <span>{number}</span>
              <div><h2>{title}</h2><p>{text}</p></div>
            </section>
          ))}
        </div>

        <footer className="policy-footer">
          <span>最終更新：2026年10月10日</span>
          <a href={appPath("/guide/")}>使い方へ戻る</a>
        </footer>
      </div>
    </main>
  );
}
