export type EntryType = "note" | "task" | "event" | "important";

export type MediaAsset = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  url: string;
};

export type JournalEntry = {
  id: string;
  time: string;
  type: EntryType;
  text: string;
  detail?: string;
  url?: string;
  media?: MediaAsset[];
  completed?: boolean;
};

export type DailyHabit = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
};

export type DayState = {
  intention: string;
  mood: number;
  energy: number;
  entries: JournalEntry[];
  habits: DailyHabit[];
  gratitude: string[];
  reflection: string;
};

const entryTypes = new Set<EntryType>([
  "note",
  "task",
  "event",
  "important",
]);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.slice(0, maxLength) : "";

const externalUrl = (value: unknown) => {
  const candidate = text(value, 2048).trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
};

const numberInRange = (
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
};

export const defaultDayState = (): DayState => ({
  intention: "",
  mood: 2,
  energy: 4,
  entries: [],
  habits: [],
  gratitude: ["", "", ""],
  reflection: "",
});

export function sanitizeDayState(value: unknown): DayState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DayState>;

  const entries = Array.isArray(candidate.entries)
    ? candidate.entries.slice(0, 300).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const entry = item as Partial<JournalEntry>;
        const type = entryTypes.has(entry.type as EntryType)
          ? (entry.type as EntryType)
          : "note";
        const id = text(entry.id, 100);
        const entryText = text(entry.text, 1000).trim();
        if (!id || !entryText) return [];
        const media = Array.isArray(entry.media)
          ? entry.media.slice(0, 20).flatMap((mediaItem) => {
              if (!mediaItem || typeof mediaItem !== "object") return [];
              const asset = mediaItem as Partial<MediaAsset>;
              const mediaId = text(asset.id, 100);
              if (!mediaId) return [];
              const url = text(asset.url, 240);
              return [
                {
                  id: mediaId,
                  filename: text(asset.filename, 240),
                  contentType: text(asset.contentType, 100),
                  size: Math.max(0, Number(asset.size) || 0),
                  createdAt: text(asset.createdAt, 50),
                  url: url.startsWith("blob:") ? url : "",
                },
              ];
            })
          : [];
        const url = externalUrl(entry.url);
        return [
          {
            id,
            time: timePattern.test(text(entry.time, 5))
              ? text(entry.time, 5)
              : "12:00",
            type,
            text: entryText,
            detail: text(entry.detail, 500),
            ...(url ? { url } : {}),
            media,
            completed: type === "task" ? Boolean(entry.completed) : undefined,
          },
        ];
      })
    : [];

  const habits = Array.isArray(candidate.habits)
    ? candidate.habits.slice(0, 100).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const habit = item as Partial<DailyHabit>;
        const id = text(habit.id, 100);
        const label = text(habit.label, 80).trim();
        if (!id || !label) return [];
        return [
          {
            id,
            label,
            detail: text(habit.detail, 240),
            done: Boolean(habit.done),
          },
        ];
      })
    : [];

  const gratitude = Array.isArray(candidate.gratitude)
    ? candidate.gratitude.slice(0, 3).map((item) => text(item, 1000))
    : [];
  while (gratitude.length < 3) gratitude.push("");

  return {
    intention: text(candidate.intention, 500),
    mood: numberInRange(candidate.mood, 0, 4, 2),
    energy: numberInRange(candidate.energy, 1, 5, 4),
    entries,
    habits,
    gratitude,
    reflection: text(candidate.reflection, 5000),
  };
}
