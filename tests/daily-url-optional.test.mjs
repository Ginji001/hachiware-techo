import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("daily new-entry URL stays optional", async () => {
  const source = await readFile(
    new URL("../app/DailyJournal.tsx", import.meta.url),
    "utf8",
  );

  const urlField = source.match(
    /<label className="capture-url">[\s\S]*?<\/label>/,
  )?.[0];

  assert.ok(urlField, "daily URL field should exist");
  assert.match(urlField, /URL（任意）/);
  assert.doesNotMatch(urlField, /\brequired\b/);
  assert.match(source, /\.\.\.\(url \? \{ url \} : \{\}\)/);
});
