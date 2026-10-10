import { sanitizeDayState, type DayState } from "./daily-state";

export const DB_NAME = "hachiware-techo";
export const KEY_PREFIX = "hachiware-techo:";
const DB_VERSION = 1;
const STORE_NAME = "records";

export type MediaMetadata = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  url: string;
};

export type StoredMedia = MediaMetadata & { blob: Blob };

export const recordKey = (type: string, id: string) =>
  `${KEY_PREFIX}${type}:${id}`;

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("このブラウザはIndexedDBに対応していません。"));
  }
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDBを開けませんでした。"));
    request.onblocked = () => reject(new Error("別のタブが保存領域を使用中です。"));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

function cleanForStorage<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cleanForStorage) as T;
  if (!value || typeof value !== "object" || value instanceof Blob) return value;
  const object = value as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(object)) {
    cleaned[key] = key === "url" && typeof item === "string" && item.startsWith("blob:")
      ? ""
      : cleanForStorage(item);
  }
  return cleaned as T;
}

export async function getRecord<T>(key: string): Promise<T | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result?.value as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function putRecord<T>(key: string, value: T) {
  if (!key.startsWith(KEY_PREFIX)) throw new Error("保存キーが不正です。");
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ key, value: cleanForStorage(value) });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("保存できませんでした。"));
  });
}

export async function deleteRecord(key: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function listRecords<T>(type: string): Promise<T[]> {
  const database = await openDatabase();
  const prefix = `${KEY_PREFIX}${type}:`;
  return new Promise((resolve, reject) => {
    const output: T[] = [];
    const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).openCursor(range);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(output);
      output.push(cursor.value.value as T);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function listAllRecords() {
  const database = await openDatabase();
  return new Promise<Array<{ key: string; value: unknown }>>((resolve, reject) => {
    const output: Array<{ key: string; value: unknown }> = [];
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(output);
      output.push({ key: String(cursor.key), value: cursor.value.value });
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function listEntitiesWithMedia<T extends { media?: MediaMetadata[] }>(type: string) {
  const values = await listRecords<T>(type);
  return Promise.all(values.map(async (value) => ({
    ...value,
    media: await resolveMedia(value.media ?? []),
  })));
}

export async function resolveMedia(items: MediaMetadata[]): Promise<MediaMetadata[]> {
  return Promise.all(items.map(async (item) => {
    const stored = await getRecord<StoredMedia>(recordKey("media", item.id));
    return {
      ...item,
      url: stored?.blob ? URL.createObjectURL(stored.blob) : "",
    };
  }));
}

export async function loadDay(date: string): Promise<DayState> {
  const candidate = await getRecord<DayState>(recordKey("day", date));
  const day = sanitizeDayState(candidate) ?? {
    intention: "", mood: 2, energy: 4, entries: [], habits: [],
    gratitude: ["", "", ""], reflection: "",
  };
  for (const entry of day.entries) entry.media = await resolveMedia(entry.media ?? []);
  return day;
}

export async function saveDay(date: string, day: DayState) {
  const sanitized = sanitizeDayState(day);
  if (!sanitized) throw new Error("デイリーの内容を保存できませんでした。");
  await putRecord(recordKey("day", date), sanitized);
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveMedia(file: File, targetType: "inbox" | "collection", targetId: string) {
  const id = createId();
  const metadata: MediaMetadata = {
    id,
    filename: file.name.slice(0, 240),
    contentType: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
    url: "",
  };
  const stored: StoredMedia = { ...metadata, blob: file.slice(0, file.size, file.type) };
  const entityKey = recordKey(targetType, targetId);
  const entity = await getRecord<Record<string, unknown> & { media?: MediaMetadata[] }>(entityKey);
  if (!entity) throw new Error("保存先が見つかりませんでした。");
  await putRecord(recordKey("media", id), stored);
  await putRecord(entityKey, { ...entity, media: [...(entity.media ?? []), metadata] });
  return { ...metadata, url: URL.createObjectURL(stored.blob) };
}

export async function deleteMedia(id: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const value = cursor.value.value;
      const withoutMedia = removeMediaReference(value, id);
      if (withoutMedia.changed) cursor.update({ key: cursor.key, value: withoutMedia.value });
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  await deleteRecord(recordKey("media", id));
}

function removeMediaReference(value: unknown, id: string): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.flatMap((item) => {
      if (item && typeof item === "object" && (item as { id?: string }).id === id && "filename" in item) {
        changed = true;
        return [];
      }
      const result = removeMediaReference(item, id);
      changed ||= result.changed;
      return [result.value];
    });
    return { value: next, changed };
  }
  if (!value || typeof value !== "object" || value instanceof Blob) return { value, changed: false };
  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const result = removeMediaReference(child, id);
    next[key] = result.value;
    changed ||= result.changed;
  }
  return { value: next, changed };
}

export async function clearAllRecords() {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getLocalStorageEstimate() {
  const records = await listRecords<StoredMedia>("media");
  const mediaBytes = records.reduce((total, item) => total + (Number(item.size) || 0), 0);
  const appRecords = await listAllRecords();
  const metadataBytes = new TextEncoder().encode(JSON.stringify(appRecords)).byteLength;
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  return {
    fileCount: records.length,
    mediaBytes,
    usedBytes: Math.max(estimate?.usage ?? 0, mediaBytes + metadataBytes),
    quotaBytes: estimate?.quota ?? 0,
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const stride = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + stride));
  }
  return btoa(binary);
}

export async function exportBackup() {
  const records = await listAllRecords();
  const encoded = await Promise.all(records.map(async ({ key, value }) => {
    if (key.startsWith(recordKey("media", "")) && value && typeof value === "object" && "blob" in value) {
      const media = value as StoredMedia;
      return {
        key,
        value: {
          ...media,
          blob: bytesToBase64(new Uint8Array(await media.blob.arrayBuffer())),
        },
      };
    }
    return { key, value };
  }));
  return {
    format: "hachiware-techo-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    records: encoded,
  };
}

export async function importBackup(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("バックアップ形式が正しくありません。");
  const backup = input as { format?: string; version?: number; records?: unknown };
  if (backup.format !== "hachiware-techo-backup" || backup.version !== 1 || !Array.isArray(backup.records)) {
    throw new Error("このアプリのバックアップJSONを選んでください。");
  }
  const records = backup.records.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("バックアップのデータが壊れています。");
    const record = entry as { key?: unknown; value?: unknown };
    if (typeof record.key !== "string" || !record.key.startsWith(KEY_PREFIX) || !record.value || typeof record.value !== "object") {
      throw new Error("バックアップに読み込めない項目があります。");
    }
    let value = record.value as Record<string, unknown>;
    if (record.key.startsWith(recordKey("media", ""))) {
      if (typeof value.blob !== "string" || typeof value.contentType !== "string") {
        throw new Error("バックアップ内のメディアを読み込めません。");
      }
      const binary = atob(value.blob);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      value = { ...value, blob: new Blob([bytes], { type: value.contentType }) };
    }
    return { key: record.key, value };
  });
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    for (const record of records) store.put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return records.length;
}
