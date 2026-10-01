import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { normalizeProfileImage, PROFILE_IMAGE_MAX_BYTES } from "../lib/profile-image";

test("profile image is cropped to a small WebP and strips metadata", async () => {
  const source = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#96cfff" } }).withMetadata().png().toBuffer();
  const url = await normalizeProfileImage(source, "image/png");
  assert.match(url, /^data:image\/webp;base64,/);
  const metadata = await sharp(Buffer.from(url.split(",")[1], "base64")).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
});

test("profile upload rejects active content, spoofed MIME, corrupt and oversized files", async () => {
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer();
  for (const [bytes, mime] of [
    [new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/svg+xml"],
    [png, "image/jpeg"],
    [new Uint8Array([1, 2, 3]), "image/png"],
    [new Uint8Array(PROFILE_IMAGE_MAX_BYTES + 1), "image/png"],
  ] as const) await assert.rejects(normalizeProfileImage(bytes, mime), /PROFILE_IMAGE_INVALID/);
});
