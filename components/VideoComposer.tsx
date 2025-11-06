"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ViralScript } from "../lib/viralScripts";
import mespeak, { ensureMespeak } from "../lib/ensureMespeak";
import styles from "./VideoComposer.module.css";

const voiceProfiles = [
  {
    key: "neutral",
    voice: "en/en-us",
    label: "Default (Neutral)",
    pitch: 50,
    speed: 175,
    amplitude: 100,
    variant: undefined
  },
  {
    key: "energetic",
    voice: "en/en",
    label: "Energetic Female",
    pitch: 160,
    speed: 190,
    amplitude: 120,
    variant: "f5"
  },
  {
    key: "bold",
    voice: "en/en",
    label: "Bold Male",
    pitch: 70,
    speed: 165,
    amplitude: 110,
    variant: "m2"
  },
  {
    key: "storyteller",
    voice: "en/en",
    label: "Storyteller",
    pitch: 95,
    speed: 155,
    amplitude: 105,
    variant: "klatt"
  }
] as const;

const initialVoiceProfile = voiceProfiles[0];

const palettes = [
  {
    id: "violet",
    label: "Violet Pulse",
    colors: ["#312e81", "#7c3aed"],
    accent: "#c4b5fd"
  },
  {
    id: "sunrise",
    label: "Sunrise Glow",
    colors: ["#f97316", "#ec4899"],
    accent: "#fef3c7"
  },
  {
    id: "aqua",
    label: "Aqua Neon",
    colors: ["#0f172a", "#22d3ee"],
    accent: "#5eead4"
  }
] as const;

type GenerationState = "idle" | "loading" | "rendering" | "complete" | "error";

type GenerationLog = {
  step: string;
  status: "pending" | "done" | "error";
};

const sentenceSplitRegex = /([.!?]+)\s+/;

function deriveSegments(text: string) {
  const rawParts = text
    .split(sentenceSplitRegex)
    .reduce<string[]>((acc, part, idx) => {
      if (!part.trim()) return acc;
      if (idx % 2 === 1) {
        acc[acc.length - 1] = acc[acc.length - 1] + part;
      } else {
        acc.push(part);
      }
      return acc;
    }, [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (rawParts.length === 0) {
    return [text.trim()];
  }
  return rawParts;
}

async function renderVideo(
  textSegments: string[],
  audioBuffer: AudioBuffer,
  palette: (typeof palettes)[number]
): Promise<{ blob: Blob; duration: number }> {
  if (typeof window === "undefined") {
    throw new Error("Video rendering is only available in the browser");
  }

  if (typeof (HTMLCanvasElement.prototype as any).captureStream !== "function") {
    throw new Error("Canvas captureStream API not supported in this browser");
  }

  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder API unavailable");
  }

  const width = 720;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to acquire canvas context");
  }
  const context = ctx;

  const fps = 30;
  const videoStream = canvas.captureStream(fps);

  const audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate });
  await audioContext.resume();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  const gain = audioContext.createGain();
  gain.gain.value = 1.1;
  const destination = audioContext.createMediaStreamDestination();
  source.connect(gain);
  gain.connect(destination);
  gain.connect(audioContext.destination);

  const mixedStream = new MediaStream();
  videoStream.getVideoTracks().forEach((track) => mixedStream.addTrack(track));
  destination.stream.getAudioTracks().forEach((track) => mixedStream.addTrack(track));

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm;codecs=vp8,opus";
  const recorder = new MediaRecorder(mixedStream, { mimeType, videoBitsPerSecond: 4_000_000 });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const totalDuration = audioBuffer.duration + 0.6;
  const segmentDuration = totalDuration / Math.max(textSegments.length, 1);

  let raf = 0;
  const start = performance.now();

  const gradients = textSegments.map((_, idx) => {
    const ratio = idx / Math.max(textSegments.length - 1, 1);
    const [startColor, endColor] = palette.colors;
    const grad = context.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, startColor);
    grad.addColorStop(1, endColor);
    return { grad, ratio };
  });

  function draw(now: number) {
    const ctx = context;
    const elapsed = (now - start) / 1000;
    const progress = Math.min(elapsed / totalDuration, 1);
    const segmentIndex = Math.min(Math.floor(elapsed / segmentDuration), textSegments.length - 1);

    const baseGradient = gradients[Math.max(segmentIndex, 0)]?.grad ?? gradients[0]?.grad;

    if (baseGradient) {
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = palette.colors[0];
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    const waveAmplitude = 12;
    const waveFrequency = 3;
    const offset = Math.sin(now / 400) * waveAmplitude;
    const grad = ctx.createLinearGradient(0, offset, width, height - offset);
    grad.addColorStop(0, "rgba(255,255,255,0.06)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const currentText = textSegments[Math.max(segmentIndex, 0)] ?? textSegments[0];
    const captionWidth = width * 0.82;

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(width * 0.09 - 16, height * 0.58 - 96, captionWidth + 32, 260);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(width * 0.09 - 12, height * 0.58 - 92, captionWidth + 24, 252);

    ctx.fillStyle = palette.accent;
    ctx.font = "900 48px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const words = currentText.split(" ");
    let line = "";
    let y = height * 0.58;
    const lineHeight = 60;
    for (let i = 0; i < words.length; i += 1) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > captionWidth && i > 0) {
        ctx.fillText(line.trim(), width * 0.09, y);
        line = words[i] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), width * 0.09, y);

    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(width * 0.09 - 16, height * 0.85, captionWidth + 32, 12);

    ctx.fillStyle = palette.accent;
    ctx.fillRect(width * 0.09 - 16, height * 0.85, (captionWidth + 32) * progress, 12);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.font = "600 28px 'Inter', sans-serif";
    ctx.fillText(`Segment ${segmentIndex + 1}/${textSegments.length}`, width * 0.09, height * 0.52);

    if (elapsed < totalDuration) {
      raf = requestAnimationFrame(draw);
    }
  }

  const blobPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      cancelAnimationFrame(raf);
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
      source.disconnect();
      gain.disconnect();
      destination.disconnect();
      audioContext.close();
    };
  });

  recorder.start(180);
  source.start();
  draw(performance.now());

  source.onended = () => {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  return blobPromise.then((blob) => ({ blob, duration: totalDuration }));
}

export function VideoComposer({ script }: { script: ViralScript | null }) {
  const [voiceKey, setVoiceKey] = useState<(typeof voiceProfiles)[number]["key"]>(initialVoiceProfile.key);
  const [voiceId, setVoiceId] = useState<string>(initialVoiceProfile.voice);
  const [variant, setVariant] = useState<string | undefined>(initialVoiceProfile.variant);
  const [speed, setSpeed] = useState<number>(initialVoiceProfile.speed);
  const [pitch, setPitch] = useState<number>(initialVoiceProfile.pitch);
  const [paletteId, setPaletteId] = useState<string>(palettes[0].id);
  const [text, setText] = useState("");
  const [log, setLog] = useState<GenerationLog[]>([]);
  const [state, setState] = useState<GenerationState>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (script) {
      setText(script.script);
      setState("idle");
      setLog([]);
      setError(null);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      const profile = initialVoiceProfile;
      setVoiceKey(profile.key);
      setVoiceId(profile.voice);
      setVariant(profile.variant);
      setSpeed(profile.speed);
      setPitch(profile.pitch);
    }
  }, [script?.id]);

  const segments = useMemo(() => deriveSegments(text), [text]);
  const wordsPerMinute = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.round((words / Math.max(script?.durationSeconds ?? 30, 30)) * 60);
  }, [text, script?.durationSeconds]);

  const palette = useMemo(
    () => palettes.find((item) => item.id === paletteId) ?? palettes[0],
    [paletteId]
  );

  const selectedProfile = useMemo(
    () => voiceProfiles.find((profile) => profile.key === voiceKey) ?? voiceProfiles[0],
    [voiceKey]
  );

  const updateLog = (step: string, status: GenerationLog["status"]) => {
    setLog((prev) => {
      const next = prev.filter((entry) => entry.step !== step);
      next.push({ step, status });
      return next;
    });
  };

  const handleVoiceProfileChange = (key: (typeof voiceProfiles)[number]["key"]) => {
    const profile = voiceProfiles.find((item) => item.key === key) ?? voiceProfiles[0];
    setVoiceKey(profile.key);
    setVoiceId(profile.voice);
    setVariant(profile.variant);
    setSpeed(profile.speed);
    setPitch(profile.pitch);
  };

  const handleGenerate = async () => {
    if (!script) return;

    try {
      setState("loading");
      setError(null);
      setLog([]);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      updateLog("Loading speech engine", "pending");
      await ensureMespeak();
      updateLog("Loading speech engine", "done");

      updateLog("Synthesizing narration", "pending");
      const arrayBuffer = mespeak.speak(text, {
        rawdata: "arraybuffer",
        voice: voiceId,
        variant,
        speed,
        pitch,
        amplitude: selectedProfile.amplitude
      }) as unknown as ArrayBuffer | null;
      if (!arrayBuffer) {
        throw new Error("Speech synthesis failed");
      }
      updateLog("Synthesizing narration", "done");

      setState("rendering");
      updateLog("Rendering video", "pending");

      const audioContextForDecode = new AudioContext();
      const decodedBuffer = await audioContextForDecode.decodeAudioData(arrayBuffer.slice(0));
      await audioContextForDecode.close();

      const { blob, duration } = await renderVideo(segments, decodedBuffer, palette);

      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoDuration(duration);
      updateLog("Rendering video", "done");
      setState("complete");

      setTimeout(() => {
        downloadRef.current?.click();
      }, 300);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unexpected error during generation";
      setError(message);
      updateLog("Rendering video", "error");
      setState("error");
    }
  };

  const disabled =
    !script ||
    text.trim().length < 30 ||
    state === "rendering" ||
    state === "loading";

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>Generate Short-Ready Video</div>
      {!script && <div className={styles.placeholder}>Select a viral script to start crafting.</div>}

      {script && (
        <>
          <div className={styles.editorRow}>
            <div className={styles.editorPane}>
              <h3>Hook</h3>
              <p className={styles.hook}>{script.hook}</p>
              <h3>Script</h3>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck
                rows={12}
              />

              <div className={styles.statsBar}>
                <span>{segments.length} scene segments</span>
                <span>{text.split(/\s+/).filter(Boolean).length} words</span>
                <span>~{wordsPerMinute} WPM pacing</span>
              </div>
            </div>
            <div className={styles.controlsPane}>
              <div className={styles.controlGroup}>
                <h4>Voice energy</h4>
                <div className={styles.voiceList}>
                  {voiceProfiles.map((profile) => (
                    <button
                      key={profile.label}
                      className={
                        voiceKey === profile.key
                          ? styles.voiceCardActive
                          : styles.voiceCard
                      }
                      onClick={() => handleVoiceProfileChange(profile.key)}
                    >
                      <span className={styles.voiceTitle}>{profile.label}</span>
                      <span className={styles.voiceMeta}>Pitch {profile.pitch} · Speed {profile.speed}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.controlGroup}>
                <h4>Fine tune</h4>
                <label className={styles.sliderLabel}>
                  <span>Pitch</span>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    value={pitch}
                    onChange={(event) => setPitch(Number(event.target.value))}
                  />
                  <span>{pitch}</span>
                </label>
                <label className={styles.sliderLabel}>
                  <span>Speed</span>
                  <input
                    type="range"
                    min={120}
                    max={240}
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                  />
                  <span>{speed}</span>
                </label>
              </div>

              <div className={styles.controlGroup}>
                <h4>Backdrop</h4>
                <div className={styles.paletteList}>
                  {palettes.map((item) => (
                    <button
                      key={item.id}
                      className={paletteId === item.id ? styles.paletteActive : styles.palette}
                      onClick={() => setPaletteId(item.id)}
                      style={{
                        background: `linear-gradient(120deg, ${item.colors[0]}, ${item.colors[1]})`
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button className={styles.generateButton} onClick={handleGenerate} disabled={disabled}>
                {state === "rendering" ? "Rendering..." : "Generate narrated video"}
              </button>
              {error && <div className={styles.error}>{error}</div>}
            </div>
          </div>

          <div className={styles.statusRow}>
            <div className={styles.logPanel}>
              <h4>Pipeline status</h4>
              <ul>
                {log.map((entry) => (
                  <li key={entry.step} data-status={entry.status}>
                    <span>{entry.step}</span>
                    <span className={styles.logStatus}>{entry.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.previewPanel}>
              <h4>Output preview</h4>
              {videoUrl ? (
                <div className={styles.videoShell}>
                  <video controls loop src={videoUrl} />
                  <div className={styles.videoMeta}>
                    <span>Duration: {videoDuration?.toFixed(1)}s</span>
                    <span>Format: WebM (VP9 + Opus)</span>
                  </div>
                  <a
                    ref={downloadRef}
                    className={styles.download}
                    href={videoUrl}
                    download={`${script.title.replace(/\s+/g, "-").toLowerCase()}-short.webm`}
                  >
                    Download short
                  </a>
                </div>
              ) : (
                <div className={styles.videoPlaceholder}>
                  {state === "rendering" ? "Rendering in progress..." : "No video yet."}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
