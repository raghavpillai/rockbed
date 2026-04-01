// Script to make Bedrock API calls using a bearer token to generate usage data
// Run with: bun run scripts/test-usage.ts

const API_KEY = process.env.BEDROCK_API_KEY ?? "";
const REGION = "us-east-1";
const MODEL_ID = "us.anthropic.claude-3-haiku-20240307-v1:0"; // Cheapest cross-region profile

async function invokeModel(prompt: string) {
  const url = `https://bedrock-runtime.${REGION}.amazonaws.com/model/${MODEL_ID}/invoke`;

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Error ${res.status}: ${text.substring(0, 200)}`);
    return null;
  }

  const data = await res.json();
  const usage = data.usage;
  console.log(
    `  ✓ ${prompt.substring(0, 40)}... → in:${usage?.input_tokens} out:${usage?.output_tokens}`
  );
  return data;
}

async function main() {
  console.log("Making Bedrock API calls to generate usage data...\n");

  const prompts = [
    "What is 2+2? Reply in one word.",
    "Name 3 colors. Be brief.",
    "What is the capital of France? One word.",
    "Say hello in Japanese. One word.",
    "What year was the internet invented? Brief answer.",
  ];

  for (const prompt of prompts) {
    await invokeModel(prompt);
    // Small delay between calls
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\nDone! Usage data should appear in CloudWatch Logs within a few minutes.");
  console.log("Check /analytics/usage to see the data.");
}

main().catch(console.error);
