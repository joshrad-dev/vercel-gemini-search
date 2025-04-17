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

  // custom stream: relay text deltas and append sources block
  const encoder = new TextEncoder();
  const allSourcesPromise = result.sources;
  const stream = new ReadableStream({
    async start(controller) {
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          controller.enqueue(encoder.encode(part.textDelta));
        }
      }
      const sourcesArray = await allSourcesPromise;
      if (sourcesArray?.length) {
        let sourcesText = '\n---SOURCES---\n';
        for (const src of sourcesArray) {
          if (src.sourceType === 'url') {
            const title = src.title || src.url;
            sourcesText += `- [${title}](${src.url})\n`;
          }
        }
        controller.enqueue(encoder.encode(sourcesText));
      }
      controller.close();
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}


