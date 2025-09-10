import React, { useMemo } from 'react';

interface StreamingWordsProps {
  text: string;
  // baseDelay: time before the first word starts (ms)
  baseDelay?: number;
  // perWordDelay: stagger between words (ms)
  perWordDelay?: number;
  className?: string;
}

export function StreamingWords({
  text,
  baseDelay = 0,
  perWordDelay = 40,
  className = '',
}: StreamingWordsProps) {
  // Split preserving spaces so we can keep original spacing
  const tokens = useMemo(() => {
    // Split into words and spaces to preserve exact spacing
    // e.g. ["Hello", " ", "world", "!"]
    return text.match(/\S+|\s+/g) ?? [];
  }, [text]);

  let wordIndex = 0;

  return (
    <span aria-live="polite" aria-atomic="false" className={className}>
      {tokens.map((tok, i) => {
        // Only animate actual "words" (non-whitespace)
        const isWord = /\S/.test(tok);
        if (!isWord) {
          return <span key={i}>{tok}</span>;
        }
        const delay = baseDelay + perWordDelay * wordIndex++;
        return (
          <span
            key={i}
            className="word-fade-in"
            style={{ animationDelay: `${delay}ms` }}
          >
            {tok}
          </span>
        );
      })}
    </span>
  );
}