// 既存 AI プロバイダ（Anthropic/OpenAI/Gemini）を薄くラップし、JSON を返す。
// APIキーが無いプロバイダは isAiAvailable() が false を返す。
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { generateGeminiText } from "@/lib/ai/gemini";
import type { AiProvider } from "@/lib/ai/types";

const ANTHROPIC_MODEL = "claude-opus-4-7";
const OPENAI_MODEL = "gpt-4o";

export function isAiAvailable(provider: AiProvider): boolean {
  switch (provider) {
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY);
    default:
      return false;
  }
}

/** structure.ts と同じ JSON 抽出ロジック */
export function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("AI 応答から JSON を取り出せませんでした");
  }
  return raw.slice(start, end + 1);
}

/** プロバイダ非依存で system+user を投げ、生テキストを返す */
export async function generateJsonText(
  provider: AiProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (provider === "openai") {
    const client = new OpenAI();
    const res = await client.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  if (provider === "gemini") {
    return generateGeminiText(systemPrompt, userPrompt);
  }

  const client = new Anthropic();
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function generateJson<T>(
  provider: AiProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const raw = await generateJsonText(provider, systemPrompt, userPrompt);
  return JSON.parse(extractJson(raw)) as T;
}
