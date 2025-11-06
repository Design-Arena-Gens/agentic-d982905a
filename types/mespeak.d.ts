declare module "mespeak" {
  export type SpeakOptions = {
    pitch?: number;
    speed?: number;
    voice?: string;
    amplitude?: number;
    wordgap?: number;
    rawdata?: string;
    variant?: string;
    volume?: number;
  };

  interface Mespeak {
    loadConfig(config: unknown): void;
    loadVoice(voice: unknown): void;
    speak(text: string, options?: SpeakOptions): any;
    speakMultipart(parts: any[], options?: SpeakOptions): any;
    resetQueue(): void;
  }

  const mespeak: Mespeak;

  export default mespeak;
}
