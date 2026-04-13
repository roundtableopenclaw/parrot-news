import { getEnv } from "@/lib/env";
import type { TtsProvider, TtsResult, VoiceKey } from "@/lib/tts/types";

function mapVoice(voice: VoiceKey): string {
  // OpenAI voices aren’t language-specific; pick the most “calm/neutral” for Swedish.
  // Can be swapped later without changing the rest of the app.
  switch (voice) {
    case "male_calm_sv":
      return "alloy";
  }
}

export class OpenAiTtsProvider implements TtsProvider {
  async synthesize(input: { text: string; voice: VoiceKey }): Promise<TtsResult> {
    const env = getEnv();
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
    const voice = mapVoice(input.voice);

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        format: "mp3",
        input: input.text,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI TTS error: ${res.status} ${text}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return {
      mp3: new Uint8Array(arrayBuffer),
      provider: "openai",
      voice,
      metadata: {},
    };
  }
}

