import { getEnv } from "@/lib/env";
import type { LlmProvider, ScriptResult, ShortlistedStory } from "@/lib/llm/types";

function estimateMinutesFromWords(text: string): number {
  // Rough spoken Swedish WPM for learner-friendly pacing.
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = 130;
  return Math.max(1, Math.round((words / wpm) * 10) / 10);
}

function systemPrompt(): string {
  return [
    "Du är en noggrann nyhetsredaktör som skriver en daglig ljudbriefing på svenska för språkinlärare.",
    "Regler:",
    "- Var faktabaserad. Hitta inte på fakta.",
    "- Bevara namn, platser, företag och siffror exakt.",
    "- Skriv för lyssning (lugnt, naturligt, radio-stil).",
    "- Marknader/aktier ska inte tas med.",
    "- 5–8 korta nyheter totalt.",
    "- Inkludera inga länkar i manuset (men behåll källor i intern data).",
  ].join("\n");
}

function modeAndLevelInstructions(level: string, mode: string): string {
  const base = [
    `Svensk nivå: ${level}.`,
    `Lärläge: ${mode}.`,
    "Stilkrav:",
    "- Korta meningar.",
    "- Enkla ord. Förklara svåra ord med enklare svenska.",
    "- Undvik bisatser och komplicerad grammatik, särskilt på A1.",
  ];
  if (mode === "simple_plus") {
    base.push("- Lite mer naturligt språk, men fortfarande tydligt och enkelt.");
  }
  if (mode === "learner_natural") {
    base.push("- Mer naturligt tal, men fortfarande säkert för inlärning.");
  }
  if (level === "B1") {
    base.push("- Du kan använda lite mer variation och längre meningar, men håll det klart.");
  }
  return base.join("\n");
}

function userPrompt(input: {
  dateISO: string;
  targetMinutes: number;
  level: string;
  mode: string;
  stories: ShortlistedStory[];
}): string {
  const stories = input.stories
    .map((s, idx) => {
      const snippets = s.sourceSnippets.slice(0, 2).map((t) => `- ${t}`).join("\n");
      return [
        `Story ${idx + 1}`,
        `Titel: ${s.clusterTitle}`,
        `Topic: ${s.topic}`,
        `Källrubriker: ${s.sourceTitles.slice(0, 3).join(" | ")}`,
        `Utdrag:\n${snippets || "- (ingen text)"}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Datum: ${input.dateISO}`,
    `Mål-längd: ${input.targetMinutes} minuter (max 10).`,
    modeAndLevelInstructions(input.level, input.mode),
    "",
    "Uppgift:",
    "1) Välj 5–8 nyheter från materialet (helst med spridning över topics).",
    "2) Skapa en kort introduktion + avslutning.",
    "3) Skriv hela manuset på svenska.",
    "",
    "Format (exakt JSON):",
    "{",
    '  "title": "...",',
    '  "summary": "...",',
    '  "outlineBullets": ["...", "..."],',
    '  "scriptText": "..."',
    "}",
    "",
    "Material:",
    stories,
  ].join("\n");
}

async function chatJson(prompt: { system: string; user: string }): Promise<Record<string, unknown>> {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  const parsed = JSON.parse(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI returned non-object JSON");
  }
  return parsed as Record<string, unknown>;
}

export class OpenAiLlmProvider implements LlmProvider {
  async generateDailyScript(input: {
    dateISO: string;
    targetMinutes: number;
    swedishLevel: "A1" | "A2" | "B1";
    learnerMode: "simple" | "simple_plus" | "learner_natural";
    stories: ShortlistedStory[];
  }): Promise<ScriptResult> {
    const base = await chatJson({
      system: systemPrompt(),
      user: userPrompt({
        dateISO: input.dateISO,
        targetMinutes: input.targetMinutes,
        level: input.swedishLevel,
        mode: input.learnerMode,
        stories: input.stories,
      }),
    });

    const scriptText = String(base.scriptText || "").trim();
    const result: ScriptResult = {
      title: String(base.title || `Parrot News ${input.dateISO}`),
      summary: String(base.summary || "").trim(),
      outlineBullets: Array.isArray(base.outlineBullets)
        ? base.outlineBullets.map((x: unknown) => String(x)).slice(0, 12)
        : [],
      scriptText,
      estimatedMinutes: estimateMinutesFromWords(scriptText),
    };

    // Trim loop if we overshoot 10 min
    if (result.estimatedMinutes > 10.0) {
      const trimmed = await chatJson({
        system: systemPrompt(),
        user: [
          "Du skrev ett manus som är för långt. Gör det kortare men behåll fakta.",
          `Mål: ${input.targetMinutes} minuter (max 10).`,
          modeAndLevelInstructions(input.swedishLevel, input.learnerMode),
          "",
          "Returnera exakt JSON med samma format som tidigare.",
          "",
          "Här är manuset:",
          scriptText,
        ].join("\n"),
      });
      const newText = String(trimmed.scriptText || "").trim();
      result.scriptText = newText;
      result.estimatedMinutes = estimateMinutesFromWords(newText);
      result.title = String(trimmed.title || result.title);
      result.summary = String(trimmed.summary || result.summary);
      result.outlineBullets = Array.isArray(trimmed.outlineBullets)
        ? trimmed.outlineBullets.map((x: unknown) => String(x)).slice(0, 12)
        : result.outlineBullets;
    }

    return result;
  }
}

