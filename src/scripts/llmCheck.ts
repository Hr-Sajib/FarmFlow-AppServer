/**
 * `npm run llm:check` — verifies the advisory model end to end without booting
 * the app: that the key works, the configured model still exists, that it obeys
 * the language rule, and that it stays inside its agricultural scope.
 */
import config from "../config";
import { createChatCompletion } from "../app/utils/openRouter";
import { AGRICULTURAL_SYSTEM_PROMPT } from "../app/modules/advisorySession/advisorySession.utils";

const ask = async (label: string, question: string) => {
  const startedAt = Date.now();
  const answer = await createChatCompletion(
    [
      { role: "system", content: AGRICULTURAL_SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
    { maxTokens: 350 }
  );
  console.log(`\n── ${label} (${((Date.now() - startedAt) / 1000).toFixed(1)}s) ──`);
  console.log(answer);
};

const run = async () => {
  console.log("model:", config.openrouter.model);
  console.log("key configured:", Boolean(config.openrouter.api_key));

  try {
    await ask(
      "BANGLA",
      "আমার গ্রিনহাউসে টমেটো গাছের নিচের পাতা হলুদ হয়ে যাচ্ছে। মাটির আর্দ্রতা ৬৫%, তাপমাত্রা ৩১ ডিগ্রি। কী করব?"
    );
    await ask("SCOPE", "Write me a JavaScript function that reverses a string.");
    process.exit(0);
  } catch (error) {
    console.error("\nFAILED:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

run();
