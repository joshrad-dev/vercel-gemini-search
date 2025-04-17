'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Search() {
    const sp = useSearchParams();
    const router = useRouter();

    const [input, setInput] = useState(sp.get('q') ?? '');
    const [answer, setAnswer] = useState('');
    const [sources, setSources] = useState<{ title: string; url: string }[]>([]);

    useEffect(() => {
        const q = sp.get('q');
        if (!q) return;

        setAnswer('');
        setSources([]);

        fetch(`/api/answer?q=${encodeURIComponent(q)}`).then(async res => {
            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            for (; ;) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value);
                setAnswer(fullText);       // live typing
            }

            // After the stream closes, split out the sources
            const [main, srcBlock] = fullText.split('---SOURCES---');
            if (srcBlock) {
                setAnswer(main.trim());

                const parsed = srcBlock
                    .split('\n')
                    .filter(l => l.startsWith('- ['))
                    .map(line => {
                        // line is "- [Some Title](https://…)"
                        const match = line.match(/- \[(.+?)\]\((.+?)\)/);
                        return match
                            ? { title: match[1], url: match[2] }
                            : null;
                    })
                    .filter((x): x is { title: string; url: string } => x !== null);

                setSources(parsed);
            }
        });
    }, [sp]);

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.push(`/?q=${encodeURIComponent(input.trim())}`);
    }

    return (
        <main className="max-w-3xl mx-auto px-4 py-8">
            {/* search bar */}
            <form onSubmit={onSubmit} className="flex gap-2 mb-6">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="flex-1 border rounded-lg p-3"
                    placeholder="Ask me anything…"
                />
                <button className="border rounded-lg px-4">Search</button>
            </form>

            {/* answer */}
            <article className="prose whitespace-pre-wrap mb-6">{answer}</article>

            {/* sources */}
            {sources.length > 0 && (
                <section className="prose-sm">
                    <h3>Sources</h3>
                    <ul>
                        {sources.map(({ title, url }, i) => (
                            <li key={i}>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    {title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </main>
    );
}
