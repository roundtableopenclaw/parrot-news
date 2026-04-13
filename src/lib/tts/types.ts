export type VoiceKey = "male_calm_sv";

export type TtsResult = {
  mp3: Uint8Array;
  provider: string;
  voice: string;
  metadata?: Record<string, unknown>;
};

export interface TtsProvider {
  synthesize(input: { text: string; voice: VoiceKey }): Promise<TtsResult>;
}

