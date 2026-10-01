import sharp from "sharp";

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function normalizeProfileImage(bytes: Uint8Array, contentType: string) {
  if (!allowedTypes.has(contentType) || bytes.byteLength === 0 || bytes.byteLength > PROFILE_IMAGE_MAX_BYTES) throw new Error("PROFILE_IMAGE_INVALID");
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "error" });
    const metadata = await image.metadata();
    const types: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    if (!metadata.format || types[metadata.format] !== contentType || (metadata.pages ?? 1) > 1) throw new Error("PROFILE_IMAGE_INVALID");
    const normalized = await image.rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
    return `data:image/webp;base64,${normalized.toString("base64")}`;
  } catch { throw new Error("PROFILE_IMAGE_INVALID"); }
}
