// Test Mastra + Bedrock with Bearer token (service-specific credential)
// Run: bun run scripts/test-mastra.ts
//
// Uses the .env AWS creds to create a temporary API key, then tests it with Mastra.

import { Agent } from "@mastra/core/agent";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import {
  IAMClient,
  CreateUserCommand,
  AttachUserPolicyCommand,
  CreateServiceSpecificCredentialCommand,
  DeleteServiceSpecificCredentialCommand,
  DetachUserPolicyCommand,
  DeleteUserCommand,
} from "@aws-sdk/client-iam";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "";
const REGION = "us-east-1";
const TEST_USER = "bedrock-key-mastra-test";
const POLICY_ARN = "arn:aws:iam::aws:policy/AmazonBedrockFullAccess";

const iam = new IAMClient({
  region: REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

async function createTestKey() {
  console.log("Creating temporary IAM user + Bedrock API key...");
  try {
    await iam.send(new CreateUserCommand({ UserName: TEST_USER }));
  } catch (e: any) {
    if (e.name !== "EntityAlreadyExistsException") throw e;
    console.log("  User already exists, reusing...");
  }
  try {
    await iam.send(
      new AttachUserPolicyCommand({ UserName: TEST_USER, PolicyArn: POLICY_ARN })
    );
  } catch {}
  const res = await iam.send(
    new CreateServiceSpecificCredentialCommand({
      UserName: TEST_USER,
      ServiceName: "bedrock.amazonaws.com",
    })
  );
  const cred = res.ServiceSpecificCredential!;
  console.log(`  Key ID: ${cred.ServiceSpecificCredentialId}`);
  console.log(`  Secret starts with: ${cred.ServiceCredentialSecret!.substring(0, 10)}...`);
  return {
    secret: cred.ServiceCredentialSecret!,
    credId: cred.ServiceSpecificCredentialId!,
  };
}

async function cleanupTestKey(credId: string) {
  console.log("\nCleaning up test IAM user...");
  await iam.send(
    new DeleteServiceSpecificCredentialCommand({
      UserName: TEST_USER,
      ServiceSpecificCredentialId: credId,
    })
  );
  await iam.send(
    new DetachUserPolicyCommand({ UserName: TEST_USER, PolicyArn: POLICY_ARN })
  );
  await iam.send(new DeleteUserCommand({ UserName: TEST_USER }));
  console.log("  Done.");
}

async function main() {
  const { secret, credId } = await createTestKey();

  // Wait for IAM propagation
  console.log("\nWaiting 10s for IAM propagation...");
  await new Promise((r) => setTimeout(r, 10000));

  try {
    // Test 1: Raw fetch to /invoke (what worked before)
    console.log("--- Test 1: Raw fetch to /invoke ---");
    const invokeUrl = `https://bedrock-runtime.${REGION}.amazonaws.com/model/anthropic.claude-3-haiku-20240307-v1:0/invoke`;
    const invokeRes = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 20,
        messages: [{ role: "user", content: "Say hi." }],
      }),
    });
    const invokeText = await invokeRes.text();
    console.log(`  Status: ${invokeRes.status}`);
    console.log(`  Response: ${invokeText.substring(0, 200)}`);
    console.log(`  Result: ${invokeRes.ok ? "SUCCESS" : "FAILED"}\n`);

    // Test 2: Raw fetch to /converse (what AI SDK uses)
    console.log("--- Test 2: Raw fetch to /converse ---");
    const converseUrl = `https://bedrock-runtime.${REGION}.amazonaws.com/model/anthropic.claude-3-haiku-20240307-v1:0/converse`;
    const converseRes = await fetch(converseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: [{ text: "Say hi." }] }],
        inferenceConfig: { maxTokens: 20 },
      }),
    });
    const converseText = await converseRes.text();
    console.log(`  Status: ${converseRes.status}`);
    console.log(`  Response: ${converseText.substring(0, 200)}`);
    console.log(`  Result: ${converseRes.ok ? "SUCCESS" : "FAILED"}\n`);

    // Test 3: Mastra agent with Bearer token
    console.log("--- Test 3: Mastra Agent ---");
    const bedrock = createAmazonBedrock({
      region: REGION,
      bedrockOptions: {
        credentials: undefined,
      },
      apiKey: secret,
    });

    const agent = new Agent({
      name: "test-agent",
      instructions: "You are a helpful assistant. Be very brief.",
      model: bedrock("anthropic.claude-3-haiku-20240307-v1:0"),
    });

    const response = await agent.generate("What is 2+2? Reply in one word.");
    console.log(`  Response: ${response.text}`);
    console.log(`  Result: SUCCESS\n`);
  } catch (e: any) {
    console.log(`  Error: ${e.message?.substring(0, 300)}`);
    console.log(`  Result: FAILED\n`);
  } finally {
    await cleanupTestKey(credId);
  }
}

main().catch(console.error);
