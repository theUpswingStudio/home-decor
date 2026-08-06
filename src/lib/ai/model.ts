import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export type AiRuntime =
  | { readonly mode: "mock"; readonly label: "demo" }
  | { readonly mode: "model"; readonly label: "local-proxy" | "openrouter"; readonly model: LanguageModel };

export function getAiProviderOptions(runtime: AiRuntime) {
  if (runtime.mode !== "model" || runtime.label !== "local-proxy") return undefined;
  return {
    openai: {
      store: false,
      parallelToolCalls: false,
      reasoningContext: "all_turns",
    },
  };
}

export function getAiRuntime(): AiRuntime {
  const provider = process.env.AI_PROVIDER?.trim()
    || (process.env.NODE_ENV === "production" ? "openrouter" : "local-proxy");

  if (provider === "mock") return { mode: "mock", label: "demo" };

  if (provider === "local-proxy") {
    const localProxy = createOpenAI({
      name: "claude-code-proxy",
      baseURL: process.env.CCP_OPENAI_BASE_URL?.trim() || "http://127.0.0.1:18765/v1",
      apiKey: "local-proxy-ignores-this-placeholder",
    });
    return {
      mode: "model",
      label: "local-proxy",
      model: localProxy.responses(process.env.CCP_MODEL?.trim() || "gpt-5.6-terra"),
    };
  }

  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for the OpenRouter provider.");
    const openrouter = createOpenRouter({
      apiKey,
      compatibility: "strict",
      appName: "Vestrel House Design with AI",
      appUrl: process.env.APP_ORIGIN?.trim(),
    });
    return {
      mode: "model",
      label: "openrouter",
      model: openrouter.chat(
        process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-5.6-terra",
      ),
    };
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}
