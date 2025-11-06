"use client";

import { useState } from "react";
import { ScriptSearch } from "../components/ScriptSearch";
import { VideoComposer } from "../components/VideoComposer";
import { trendingTags, viralScripts, type ViralScript } from "../lib/viralScripts";
import styles from "./page.module.css";

export default function HomePage() {
  const [selected, setSelected] = useState<ViralScript | null>(viralScripts[0] ?? null);

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <span className={styles.badge}>ShortForge Agent</span>
        <h1>Find viral hooks. Auto-craft narrated shorts.</h1>
        <p>
          Search trending short-form storytelling scripts, tweak the beats, then spin up a vertical video
          with AI narration in one click. Perfect for YouTube Shorts drops.
        </p>
      </header>

      <div className={styles.grid}>
        <ScriptSearch scripts={viralScripts} tags={trendingTags} onSelect={setSelected} selectedId={selected?.id} />
        <VideoComposer script={selected} />
      </div>
    </main>
  );
}
