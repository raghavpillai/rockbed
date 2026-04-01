import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { router } from "@rockbed/api";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const handler = new RPCHandler(router, {
  interceptors: [onError((error) => console.error("[rpc]", error))],
});

async function handleRequest(request: Request) {
  // Verify session for all RPC calls
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { response } = await handler.handle(request, {
    prefix: "/rpc",
    context: {},
  });
  return response ?? new Response("Not found", { status: 404 });
}

export const maxDuration = 60;

export const GET = handleRequest;
export const POST = handleRequest;
