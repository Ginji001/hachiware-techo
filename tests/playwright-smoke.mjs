import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) throw new Error("Set PLAYWRIGHT_MODULE_PATH to the installed Playwright module.");
const require = createRequire(import.meta.url);
const { chromium } = require(modulePath);
const baseUrl = process.env.HACHIWARE_TECHO_URL ?? "http://127.0.0.1:4173/hachiware-techo";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ acceptDownloads: true });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  assert.match(await page.title(), /ハチワレ手帳/);
  const dailyEntry = `Playwrightデイリー確認 ${Date.now()}`;
  await page.locator(".capture-text input").fill(dailyEntry);
  await page.getByRole("button", { name: "記録する" }).click();
  await page.getByText(dailyEntry, { exact: true }).waitFor();
  await page.waitForFunction((needle) => new Promise((resolve, reject) => {
    const request = indexedDB.open("hachiware-techo", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const read = request.result.transaction("records", "readonly").objectStore("records").getAll();
      read.onsuccess = () => resolve(read.result.some((record) =>
        record.key.startsWith("hachiware-techo:day:") && JSON.stringify(record.value).includes(needle),
      ));
      read.onerror = () => reject(read.error);
    };
  }), dailyEntry);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(dailyEntry, { exact: true }).waitFor();

  await page.goto(`${baseUrl}/month/`, { waitUntil: "networkidle" });
  assert.match(await page.locator("h1").innerText(), /\d{4}年\d{1,2}月/);

  await page.goto(`${baseUrl}/inbox/`, { waitUntil: "networkidle" });
  const inboxEntry = `Playwright INBOX確認 ${Date.now()}`;
  await page.locator(".inbox-text input").fill(inboxEntry);
  await page.getByRole("button", { name: "INBOXへ" }).click();
  await page.getByText(inboxEntry, { exact: true }).waitFor();

  await page.goto(`${baseUrl}/habits/`, { waitUntil: "networkidle" });
  const habit = `Playwright習慣確認 ${Date.now()}`;
  await page.getByLabel("続けたいこと").fill(habit);
  await page.getByRole("button", { name: "項目を追加" }).click();
  await page.getByText(habit, { exact: true }).waitFor();

  await page.goto(`${baseUrl}/settings/`, { waitUntil: "networkidle" });
  assert.match(await page.locator("h1").innerText(), /設定/);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /バックアップを書き出す/ }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(backup.format, "hachiware-techo-backup");
  assert.ok(backup.records.some((record) => record.key.startsWith("hachiware-techo:day:") && JSON.stringify(record.value).includes(dailyEntry)));
  assert.ok(backup.records.some((record) => record.key.startsWith("hachiware-techo:inbox:") && JSON.stringify(record.value).includes(inboxEntry)));
  assert.ok(backup.records.some((record) => record.key.startsWith("hachiware-techo:habit:") && JSON.stringify(record.value).includes(habit)));
  assert.deepEqual(pageErrors, []);
  console.log("Playwright smoke passed: daily persistence, monthly, inbox, habits, and JSON backup.");
} finally {
  await browser.close();
}
