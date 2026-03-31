import { KeyManager } from "@/components/key-manager";

export default function Home() {
  return (
    <main className="px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage Bedrock API keys using your AWS credentials.
        </p>
      </div>
      <KeyManager />
    </main>
  );
}
