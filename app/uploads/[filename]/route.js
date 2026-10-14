import { readLocalImage } from '@/lib/storage';

// Serves images saved by the local-disk storage backend (lib/storage.js)
export async function GET(request, { params }) {
  const image = await readLocalImage(params.filename);

  if (!image) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(image.buffer, {
    headers: {
      'Content-Type': image.mime,
      'Content-Length': String(image.buffer.length),
      // File names are random UUIDs and never reused, so cache indefinitely
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
