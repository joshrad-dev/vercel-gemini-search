import { google }   from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';                 // zero‑cold‑start on Vercel

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  if (!q) return new Response('Missing q', { status: 400 });

  // Gemini‑Pro with Google‑Search grounding
  const result = streamText({
    model: google('gemini-2.0-flash-001', {
      /** toggle if you want live web citations */
      useSearchGrounding: true,
    }),
    prompt: q,                         // or messages: [...]
  });

  // ── NEW in v4 ──────────────────────────────────────────────
  // Converts the stream into an HTTP/2‑friendly response with data chunks
  // The client needs to handle the Vercel AI SDK Data Stream format.
  // Sources will likely be included in one of the data chunks.
  return result.toTextStreamResponse();
}


