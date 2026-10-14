import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// All image storage goes through this module. Two backends:
//   - "local":    files on this server's disk, served by app/uploads/[filename]
//   - "supabase": Supabase Storage (Cloud or self-hosted)
// Supabase is used only when real credentials are configured; otherwise local.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Kept outside /public: Next.js only serves files that exist in /public at
// build time, so runtime uploads need their own route.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'post-images';

// Detect the real type from the file's first bytes; the browser-supplied
// MIME type and file name are user input and can't be trusted.
const IMAGE_TYPES = [
  { ext: 'png', mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
];

const MIME_BY_EXT = Object.fromEntries(IMAGE_TYPES.map((t) => [t.ext, t.mime]));

// Only names produced by saveImage() are valid: <uuid>.<ext>
const FILENAME_PATTERN = /^[0-9a-f-]{36}\.(png|jpg)$/;

// Thrown for problems the user can fix (wrong type, too large)
export class InvalidImageError extends Error {}

function hasSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Ignore the placeholder values from .env.example
  return Boolean(url && key && !url.includes('your-project-ref'));
}

let supabase;

function getSupabase() {
  if (!supabase) {
    // Service role key bypasses Row Level Security: server-only, never NEXT_PUBLIC_
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

function detectImageType(buffer) {
  return IMAGE_TYPES.find((type) =>
    type.magic.every((byte, i) => buffer[i] === byte)
  );
}

async function saveToSupabase(filename, buffer, type) {
  const client = getSupabase();
  const filePath = `posts/${filename}`;

  const { error } = await client.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: type.mime,
    // Names are random and never reused, so the CDN can cache indefinitely
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return client.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

async function saveToDisk(filename, buffer) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  // 'wx' fails instead of overwriting if the name somehow already exists
  await writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
}

/**
 * Validates an uploaded image and stores it.
 * @param {File} file
 * @returns {Promise<string>} URL of the stored image
 * @throws {InvalidImageError} if the file is not an accepted image
 */
export async function saveImage(file) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new InvalidImageError('Image must be 5 MB or smaller');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(buffer);

  if (!type) {
    throw new InvalidImageError('Image must be a PNG or JPEG file');
  }

  const filename = `${randomUUID()}.${type.ext}`;

  return hasSupabaseConfig()
    ? saveToSupabase(filename, buffer, type)
    : saveToDisk(filename, buffer);
}

/**
 * Reads an image stored on local disk by file name.
 * @returns {Promise<{ buffer: Buffer, mime: string } | null>} null if not found or invalid
 */
export async function readLocalImage(filename) {
  // Rejects path traversal ("../") and anything not created by saveImage()
  if (!FILENAME_PATTERN.test(filename)) {
    return null;
  }

  try {
    const buffer = await readFile(path.join(UPLOAD_DIR, filename));
    return { buffer, mime: MIME_BY_EXT[filename.split('.').pop()] };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
