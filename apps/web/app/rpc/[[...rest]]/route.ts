import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { router } from "@rockbed/api";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { IAMClient, ListUserTagsCommand } from "@aws-sdk/client-iam";

const handler = new RPCHandler(router, {
  interceptors: [onError((error) => console.error("[rpc]", error))],
});

const ADMIN_ONLY_ROUTES = [
  "settings/setRegion",
  "settings/setEnabledRegions",
  "settings/enableInvocationLogging",
];

async function handleRequest(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace("/rpc/", "");
  const isAdmin = session.user.role === "admin";

  // Admin-only routes
  if (ADMIN_ONLY_ROUTES.some((p) => path.startsWith(p)) && !isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Delete key — must be admin or key creator
  if (path.startsWith("keys/delete") && !isAdmin) {
    try {
      const body = await request.clone().json();
      const userName = body?.json?.userName;
      if (userName) {
        const iam = new IAMClient({ region: "us-east-1" });
        const tags = await iam.send(new ListUserTagsCommand({ UserName: userName }));
        const createdBy = tags.Tags?.find((t) => t.Key === "rockbed:createdBy")?.Value;
        if (createdBy !== session.user.email) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    } catch {}
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
