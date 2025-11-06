"use client";

import { useMemo, useState } from "react";
import type { ViralScript } from "../lib/viralScripts";
import styles from "./ScriptSearch.module.css";

export type ScriptSearchProps = {
  scripts: ViralScript[];
  tags: string[];
  onSelect: (script: ViralScript) => void;
  selectedId?: string;
};

export function ScriptSearch({ scripts, tags, onSelect, selectedId }: ScriptSearchProps) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scripts
      .filter((script) => {
        const matchesQuery =
          !q ||
          script.title.toLowerCase().includes(q) ||
          script.hook.toLowerCase().includes(q) ||
          script.tags.some((tag) => tag.toLowerCase().includes(q));

        const matchesTags =
          activeTags.length === 0 || activeTags.every((tag) => script.tags.includes(tag));

        return matchesQuery && matchesTags;
      })
      .sort((a, b) => b.trendScore - a.trendScore);
  }, [scripts, query, activeTags]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Viral Script Scout</h2>
          <p>Search and snatch high performing hooks across niches.</p>
        </div>
        <div className={styles.searchBox}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword, hook, or tag"
          />
        </div>
      </header>

      <div className={styles.tags}>
        {tags.map((tag) => {
          const active = activeTags.includes(tag);
          return (
            <button
              key={tag}
              className={active ? styles.tagActive : styles.tag}
              onClick={() =>
                setActiveTags((prev) =>
                  prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                )
              }
            >
              #{tag}
            </button>
          );
        })}
        {activeTags.length > 0 && (
          <button className={styles.clear} onClick={() => setActiveTags([])}>
            Clear filters
          </button>
        )}
      </div>

      <div className={styles.list}>
        {filtered.map((script) => {
          const isActive = script.id === selectedId;
          return (
            <button
              key={script.id}
              className={isActive ? styles.cardActive : styles.card}
              onClick={() => onSelect(script)}
            >
              <div className={styles.cardTop}>
                <span className={styles.badge}>{script.niche}</span>
                <span className={styles.score}>{script.trendScore}% trend match</span>
              </div>
              <h3>{script.title}</h3>
              <p className={styles.hook}>{script.hook}</p>
              <div className={styles.meta}>
                <span>{script.durationSeconds}s</span>
                <span>{script.tags.slice(0, 3).join(" · ")}</span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.empty}>No scripts match. Try another query.</div>
        )}
      </div>
    </div>
  );
}
