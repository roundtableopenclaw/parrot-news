export type LearnerMode = "simple" | "simple_plus" | "learner_natural";
export type SwedishLevel = "A1" | "A2" | "B1";

export type ShortlistedStory = {
  clusterTitle: string;
  topic: string;
  importanceScore: number;
  sourceTitles: string[];
  sourceUrls: string[];
  sourceSnippets: string[];
};

export type ScriptResult = {
  title: string;
  summary: string;
  outlineBullets: string[];
  scriptText: string;
  estimatedMinutes: number;
};

export interface LlmProvider {
  generateDailyScript(input: {
    dateISO: string;
    targetMinutes: number;
    swedishLevel: SwedishLevel;
    learnerMode: LearnerMode;
    stories: ShortlistedStory[];
  }): Promise<ScriptResult>;
}

