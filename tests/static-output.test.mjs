import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const out = new URL("../out/", import.meta.url);
const routes = ["", "month/", "inbox/", "habits/", "settings/"];
const retiredName = ["ハチワレ", "バレット"].join("");
const oldAuthName = ["Chat", "GPT"].join("");
const oldHostSuffix = [".", ["chat", "gpt"].join(""), ".site"].join("");

test("exports the main screens as static pages under the configured subpath", async () => {
  for (const route of routes) {
    const html = await readFile(new URL(`${route}index.html`, out), "utf8");
    assert.match(html, /ハチワレ手帳/);
    assert.ok(!html.includes(retiredName));
    assert.ok(!html.includes(oldAuthName));
    assert.ok(!html.includes(oldHostSuffix));
  }
  const home = await readFile(new URL("index.html", out), "utf8");
  assert.match(home, /\/hachiware-techo\//);
  assert.match(home, /manifest\.webmanifest/);
  assert.match(home, /href="\/hachiware-techo\/favicon\.png"/);
  assert.match(home, /ginji001\.github\.io\/hachiware-techo\/og\.png/);
});

test("manifest and service worker use the public app identity and cache namespace", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", out), "utf8"));
  assert.equal(manifest.name, "ハチワレ手帳");
  assert.equal(manifest.start_url, "/hachiware-techo/");
  assert.equal(manifest.scope, "/hachiware-techo/");
  assert.equal(manifest.id, "/hachiware-techo/");
  assert.ok(manifest.shortcuts.every(({ url }) => url.startsWith("/hachiware-techo/")));
  const worker = await readFile(new URL("sw.js", out), "utf8");
  assert.match(worker, /hachiware-techo-/);
  assert.match(worker, /self\.registration\.scope/);
});

test("uses a separate IndexedDB namespace and has no server routes", async () => {
  const store = await readFile(new URL("app/local-store.ts", root), "utf8");
  assert.match(store, /DB_NAME = "hachiware-techo"/);
  assert.match(store, /KEY_PREFIX = "hachiware-techo:"/);
  await assert.rejects(access(new URL("app/api", root)));
});

test("source contains no copied private project identifiers", async () => {
  const files = await readdir(new URL("app/", root), { recursive: true });
  const sources = await Promise.all(files
    .filter((name) => /\.(?:ts|tsx|css)$/.test(name))
    .map((name) => readFile(new URL(`app/${name}`, root), "utf8")));
  const text = sources.join("\n");
  const retiredMarkers = [
    oldAuthName,
    oldHostSuffix,
    ["claim", "legacy"].join("-"),
    ["hachiware", "bullet"].join("-"),
    ["owner", "Email"].join(""),
    ["D1", "Database"].join(""),
    ["R2", "Bucket"].join(""),
    ["open", "ai"].join(""),
  ];
  assert.ok(retiredMarkers.every((marker) => !text.toLowerCase().includes(marker.toLowerCase())));
});
