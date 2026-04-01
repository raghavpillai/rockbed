// Test whether Bedrock service-specific credentials work via Bearer token
// Run: BEDROCK_API_KEY=<secret> bun run scripts/test-auth.ts
// Or with access keys: AWS_ACCESS_KEY_ID=<id> AWS_SECRET_ACCESS_KEY=<secret> bun run scripts/test-auth.ts

const API_KEY = process.env.BEDROCK_API_KEY ?? "";
const REGION = process.env.AWS_REGION ?? "us-east-1";
const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

const body = JSON.stringify({
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 20,
  messages: [{ role: "user", content: "Say hi in one word." }],
});

// Test 1: Bearer token (service-specific credential)
async function testBearer() {
  console.log("--- Test 1: Bearer token auth ---");
  if (!API_KEY) {
    console.log("  Skipped (no BEDROCK_API_KEY set)\n");
    return;
  }

  const url = `https://bedrock-runtime.${REGION}.amazonaws.com/model/${MODEL_ID}/invoke`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body,
    });
    const text = await res.text();
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${text.substring(0, 300)}`);
    console.log(`  Result: ${res.ok ? "SUCCESS" : "FAILED"}\n`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}\n`);
  }
}

// Test 2: AWS SigV4 via SDK (standard access keys)
async function testSigV4() {
  console.log("--- Test 2: SigV4 auth (AWS SDK) ---");
  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      "@aws-sdk/client-bedrock-runtime"
    );
    const client = new BedrockRuntimeClient({ region: REGION });
    const res = await client.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: new TextEncoder().encode(body),
      })
    );
    const output = JSON.parse(new TextDecoder().decode(res.body));
    console.log(`  Status: ${res.$metadata.httpStatusCode}`);
    console.log(`  Content: ${output.content?.[0]?.text}`);
    console.log(`  Usage: in=${output.usage?.input_tokens} out=${output.usage?.output_tokens}`);
    console.log(`  Result: SUCCESS\n`);
  } catch (e: any) {
    console.log(`  Error: ${e.name}: ${e.message.substring(0, 200)}`);
    console.log(`  Result: FAILED\n`);
  }
}

async function main() {
  console.log(`Region: ${REGION}`);
  console.log(`Model: ${MODEL_ID}\n`);
  await testBearer();
  await testSigV4();
}

main().catch(console.error);
