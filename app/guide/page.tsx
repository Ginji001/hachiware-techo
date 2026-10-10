import type { Metadata } from "next";
import { SiteTabs } from "../components/SiteTabs";
import { appPath } from "../url-utils";

export const metadata: Metadata = {
  title: "使い方",
  description:
    "ハチワレ手帳の始め方と、デイリー、マンスリー、INBOX、ハビット、コレクション、ほしい物リスト、モニターの使い方。",
};

const features = [
  {
    number: "01",
    title: "デイリー",
    copy: "その日のメモ、タスク、予定、重要事項を時刻と一緒に記録します。",
    points: [
      "「今を記録する」で種類・時刻・内容を入力",
      "関連URLを必要に応じて一緒に追加",
      "タスクの□を押して完了・未完了を切り替え",
      "追加した記録の「編集」から時刻・種類・内容・補足を変更",
      "気分とエネルギーは5段階のマークで選択",
      "習慣、感謝、ふりかえりも記録",
    ],
    note: "デイリーの内容はこの端末のブラウザ内に保存されます。別の端末へ移すには設定からバックアップを書き出してください。",
  },
  {
    number: "02",
    title: "マンスリー",
    copy: "日曜始まりの月表示で予定を見渡します。Googleカレンダーへの追加は任意です。",
    points: [
      "必要ならGoogle追加にチェックしてから予定を保存",
      "開いたGoogleカレンダーの追加画面で「保存」を押して反映",
      "前月・今月・翌月を切り替えて確認",
      "保存した予定の「編集」から日付や内容の変更・削除",
      "Googleへ渡す情報は追加画面で確認して確定",
    ],
    note: "Googleへの追加は任意です。選ぶと日時・タイトル・場所を含む追加URLを開きます。",
  },
  {
    number: "03",
    title: "INBOX",
    copy: "整理する前のメモやアイデアを、思いついた瞬間に一か所へ集めます。",
    points: [
      "メモ・タスク・アイデア・あとで、から分類",
      "URL、画像、動画を記録時・編集時に追加",
      "「すべて」「未完了」「完了」で絞り込み",
      "保存した項目の「編集」から内容・種類を変更",
      "チェックを入れて完了状態を管理",
    ],
    note: "迷った内容は、まずINBOXに入れておけば大丈夫です。",
  },
  {
    number: "04",
    title: "ハビット",
    copy: "自分で決めた習慣を自由に追加し、1か月の達成を記録します。",
    points: [
      "「続けたいこと」に好きな項目名を入力",
      "必要なら目安や時間をひとこと追加",
      "縦に並ぶ日付ごとに達成をチェック",
      "前月・今月・翌月を切り替えて確認",
    ],
    note: "項目名とメモはあとから編集でき、不要な項目は削除できます。達成チェックはそのまま残ります。",
  },
  {
    number: "05",
    title: "コレクション",
    copy: "旅行、読みたい本、資料など、テーマごとに画像や動画をまとめます。",
    points: [
      "最初にタイトルをつけてコレクションを作成",
      "作成後もタイトルと説明を編集",
      "関連URLを追加し、画像・動画はクリックで原寸表示",
      "追加先を選んで画像・動画をアップロード",
      "複数ファイルを一度に選択可能",
    ],
    note: "画像・動画は端末内に保存されます。1件50MBまで対応し、使える容量は端末やブラウザにより異なります。",
  },
  {
    number: "06",
    title: "ほしい物リスト",
    copy: "コレクションとは別に、ほしい物だけを縦のリストで管理します。",
    points: [
      "ほしい物、メモ、関連URLを入力して追加",
      "各項目の「未」「済」を押して状態を切り替え",
      "「すべて」「未」「済」で絞り込み",
      "追加後も内容を編集・削除",
    ],
    note: "状態は端末内に保存されます。",
  },
  {
    number: "07",
    title: "モニター",
    copy: "日付、時刻、今日の予定や記録を、離れた場所から見やすく表示します。",
    points: [
      "デイリー右上の「モニター」から表示",
      "タブレットや常設画面での表示に対応",
      "デイリーへ戻るときは画面上部のリンクを使用",
    ],
    note: "モニター画面はこの端末に保存されている情報を表示します。",
  },
  {
    number: "08",
    title: "端末にインストール",
    copy: "スマホ、タブレット、パソコンへアプリとして追加できます。",
    points: [
      "設定ページの「端末にアプリとして追加」を開く",
      "Android・パソコンは「この端末にインストール」を押す",
      "iPhone・iPadはSafariの共有から「ホーム画面に追加」を選ぶ",
      "更新案内が表示されたら「更新する」を押す",
    ],
    note: "一度開いた画面と端末内のデータは、オフラインでも利用できます。",
  },
] as const;

export default function GuidePage() {
  const startHref = appPath("/");
  const startLabel = "デイリーを開く";

  return (
    <main className="guide-page" id="main-content">
      <div className="guide-wrap">
        <SiteTabs active="guide" />

        <section className="guide-hero" aria-labelledby="guide-title">
          <div>
            <p className="eyebrow">HOW TO USE / USER GUIDE</p>
            <h1 id="guide-title">
              はじめてでも、
              <br />
              迷わず記せます。
            </h1>
            <p className="guide-lead">
              ハチワレ手帳は、思いついたことを素早く残し、
              あとから自分のペースで整えるための個人用デジタルノートです。
            </p>
            <div className="guide-actions">
              <a className="guide-primary-link" href={startHref}>
                {startLabel} <span aria-hidden="true">→</span>
              </a>
              <a className="guide-text-link" href="#quick-start">
                まず3つの手順を見る
              </a>
            </div>
          </div>

          <aside className="guide-hero-card" aria-label="基本の流れ">
            <span>BASIC FLOW</span>
            <ol>
              <li>
                <b>01</b>
                <div>
                  <strong>思いついたら記録</strong>
                  <small>整えすぎず、まず残す</small>
                </div>
              </li>
              <li>
                <b>02</b>
                <div>
                  <strong>必要なものを整理</strong>
                  <small>タスクや予定に分ける</small>
                </div>
              </li>
              <li>
                <b>03</b>
                <div>
                  <strong>一日の終わりに確認</strong>
                  <small>完了と明日を見渡す</small>
                </div>
              </li>
            </ol>
          </aside>
        </section>

        <div className="guide-layout">
          <aside className="guide-index">
            <span>CONTENTS</span>
            <nav aria-label="使い方の目次">
              <a href="#quick-start">最初の3ステップ</a>
              <a href="#pages">各ページの使い方</a>
              <a href="#symbols">記号の意味</a>
              <a href="#saving">保存について</a>
              <a href="#tips">使い続けるコツ</a>
            </nav>
            <p>
              完璧に書く必要はありません。
              <br />
              一行だけでも十分です。
            </p>
          </aside>

          <div className="guide-content">
            <section className="guide-section" id="quick-start">
              <div className="guide-section-heading">
                <span>01</span>
                <div>
                  <p className="eyebrow">QUICK START</p>
                  <h2>最初の3ステップ</h2>
                </div>
              </div>
              <div className="guide-step-grid">
                <article>
                  <span>STEP 1</span>
                  <strong>アプリを開く</strong>
                  <p>
                    使い始める前に、データを保存する端末とブラウザをご確認ください。
                  </p>
                </article>
                <article>
                  <span>STEP 2</span>
                  <strong>今日を一行記す</strong>
                  <p>
                    デイリーの「今を記録する」から、メモやタスクをひとつ追加します。
                  </p>
                </article>
                <article>
                  <span>STEP 3</span>
                  <strong>終わったら印をつける</strong>
                  <p>
                    タスクの□を押して完了にします。感謝やふりかえりも必要なときに記せます。
                  </p>
                </article>
              </div>
            </section>

            <section className="guide-section" id="pages">
              <div className="guide-section-heading">
                <span>02</span>
                <div>
                  <p className="eyebrow">PAGES</p>
                  <h2>各ページの使い方</h2>
                </div>
              </div>
              <div className="guide-feature-list">
                {features.map((feature) => (
                  <article className="guide-feature-card" key={feature.number}>
                    <div className="guide-feature-number">{feature.number}</div>
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.copy}</p>
                      <ul>
                        {feature.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                      <small>{feature.note}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="guide-section" id="symbols">
              <div className="guide-section-heading">
                <span>03</span>
                <div>
                  <p className="eyebrow">SYMBOLS</p>
                  <h2>デイリーの記号</h2>
                </div>
              </div>
              <div className="guide-symbols" aria-label="記号の意味">
                <div><b>🐾</b><strong>メモ</strong><span>考えや出来事を残す</span></div>
                <div><b>□</b><strong>タスク</strong><span>これから行うこと</span></div>
                <div><b>○</b><strong>予定</strong><span>時刻のある予定や出来事</span></div>
                <div><b>!</b><strong>重要</strong><span>忘れたくないこと</span></div>
              </div>
            </section>

            <section className="guide-section" id="saving">
              <div className="guide-section-heading">
                <span>04</span>
                <div>
                  <p className="eyebrow">DATA &amp; PRIVACY</p>
                  <h2>保存について</h2>
                </div>
              </div>
              <div className="guide-notice-grid">
                <article>
                  <span aria-hidden="true">端</span>
                  <div>
                    <strong>データは端末内に保存</strong>
                    <p>
                      日記や予定、習慣、写真・動画はこの端末のブラウザ内に保存されます。
                      サーバーへ送信されません。
                    </p>
                  </div>
                </article>
                <article>
                  <span aria-hidden="true">個</span>
                  <div>
                    <strong>バックアップを保管</strong>
                    <p>
                      設定から写真・動画を含めたJSONバックアップを書き出し、
                      端末の故障やブラウザデータ削除に備えられます。
                    </p>
                  </div>
                </article>
              </div>
              <p className="guide-warning">
                ブラウザの保存データを削除すると記録も消えます。削除前に設定からバックアップを書き出してください。
              </p>
            </section>

            <section className="guide-section guide-last-section" id="tips">
              <div className="guide-section-heading">
                <span>05</span>
                <div>
                  <p className="eyebrow">SMALL TIPS</p>
                  <h2>使い続けるコツ</h2>
                </div>
              </div>
              <div className="guide-tips">
                <p><b>1.</b> 「今日いちばん大切なこと」を一つだけ書く。</p>
                <p><b>2.</b> 思いついた内容はINBOXへ。整理はあとで行う。</p>
                <p><b>3.</b> ハビットは無理なく続けられる項目を一つから始める。</p>
                <p><b>4.</b> 間違えても各ページの「編集」からあとで直せます。</p>
                <p><b>5.</b> デイリー、INBOX、コレクションのURLは別窓で確認できます。</p>
                <p><b>6.</b> 各ページの「PDF・印刷」から、用紙サイズを選んでPDF保存または印刷できます。</p>
                <p><b>7.</b> 空欄があっても気にせず、一行だけでも記す。</p>
              </div>
              <div className="guide-finish">
                <div>
                  <span>READY TO START?</span>
                  <h2>今日の一行から始めましょう。</h2>
                </div>
                <a href={startHref}>{startLabel} <span aria-hidden="true">→</span></a>
              </div>
              <p className="guide-policy-link">
                <a href={appPath("/privacy/")}>保存される情報とプライバシーについて</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
