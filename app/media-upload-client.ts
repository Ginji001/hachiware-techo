import { saveMedia, type MediaMetadata } from "./local-store";
import { hasValidMediaSignature, isAllowedMediaType, MAX_MEDIA_FILE_SIZE } from "./media-policy";

export type UploadedMediaAsset = MediaMetadata;

type UploadTarget = {
  targetType: "collection" | "inbox";
  targetId: string;
};

export async function uploadMediaFile(
  file: File,
  target: UploadTarget,
  onProgress?: (percent: number) => void,
): Promise<UploadedMediaAsset> {
  if (!isAllowedMediaType(file.type)) {
    throw new Error("JPEG・PNG・WebP・GIF・MP4・WebM・MOVを選んでください");
  }
  if (file.size === 0 || file.size > MAX_MEDIA_FILE_SIZE) {
    throw new Error("ファイルは1件50MB以内にしてください");
  }
  if (!hasValidMediaSignature(file.type, await file.slice(0, 32).arrayBuffer())) {
    throw new Error("ファイルの内容を確認できませんでした");
  }
  onProgress?.(25);
  const media = await saveMedia(file, target.targetType, target.targetId);
  onProgress?.(100);
  return media;
}
