export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024;

export const SAFE_MEDIA_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov";

export const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function isAllowedMediaType(contentType: string) {
  return ALLOWED_MEDIA_TYPES.has(contentType.toLowerCase());
}

export function hasValidMediaSignature(
  contentType: string,
  input: ArrayBuffer | Uint8Array,
) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const type = contentType.toLowerCase();
  const matches = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);
  const text = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));

  if (type === "image/jpeg") return matches(0xff, 0xd8, 0xff);
  if (type === "image/png") {
    return matches(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  }
  if (type === "image/gif") {
    return text(0, 6) === "GIF87a" || text(0, 6) === "GIF89a";
  }
  if (type === "image/webp") {
    return text(0, 4) === "RIFF" && text(8, 4) === "WEBP";
  }
  if (type === "video/webm") {
    return matches(0x1a, 0x45, 0xdf, 0xa3);
  }
  if (type === "video/mp4" || type === "video/quicktime") {
    return text(4, 4) === "ftyp";
  }
  return false;
}

export const mediaPolicyText =
  "JPEG・PNG・WebP・GIF・MP4・WebM・MOV／1件50MBまで・端末内に保存";
