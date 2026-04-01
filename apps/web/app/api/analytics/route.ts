import { auth } from "@/lib/auth";
import { runInsightsQuery } from "@/lib/cloudwatch";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import {
  IAMClient,
  ListUsersCommand,
  ListUserTagsCommand,
} from "@aws-sdk/client-iam";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? "us-east-1";
  const type = searchParams.get("type") ?? "usage"; // usage | cost
  const groupBy = searchParams.get("groupBy") ?? "model"; // model | apiKey | user
  const period = searchParams.get("period") ?? "month"; // month | week
  const year = parseInt(searchParams.get("year") ?? new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") ?? (new Date().getMonth() + 1).toString());

  // Sanitize filter inputs — only allow alphanumeric, hyphens, underscores, dots, @
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_\-\.@]/g, "");
  const filterApiKey = sanitize(searchParams.get("apiKey") ?? "");
  const filterModel = sanitize(searchParams.get("model") ?? "");
  const filterUser = sanitize(searchParams.get("user") ?? "");

  const startTime = new Date(year, month - 1, 1);
  const endTime = new Date(year, month, 0, 23, 59, 59);

  const groupField =
    groupBy === "apiKey"
      ? "identity.arn"
      : groupBy === "user"
        ? "identity.arn"
        : "modelId";

  // Build filter clause
  const filters: string[] = [];
  if (filterApiKey) filters.push(`identity.arn like /${filterApiKey}/`);
  if (filterModel) filters.push(`modelId like /${filterModel}/`);
  if (filterUser) filters.push(`identity.arn like /${filterUser}/`);
  const filterClause = filters.length > 0 ? `| filter ${filters.join(" and ")}\n` : "";
  const cwl = new CloudWatchLogsClient({ region });

  try {
    const dailyQuery = `
      fields input.inputTokenCount as inTok, output.outputTokenCount as outTok, modelId, identity.arn as userArn
      ${filterClause}| stats sum(inTok) as totalIn, sum(outTok) as totalOut, count(*) as invocations
        by bin(1d) as day, ${groupField}
      | sort day asc
    `;

    const summaryQuery = `
      fields input.inputTokenCount as inTok, output.outputTokenCount as outTok, modelId, identity.arn as userArn
      ${filterClause}| stats sum(inTok) as totalIn, sum(outTok) as totalOut, count(*) as invocations
        by ${groupField}
      | sort totalIn desc
    `;

    const [daily, summary] = await Promise.all([
      runInsightsQuery(cwl, dailyQuery, startTime, endTime).catch(() => []),
      runInsightsQuery(cwl, summaryQuery, startTime, endTime).catch(() => []),
    ]);

    // For user groupBy, resolve IAM usernames to createdBy emails
    let userEmailMap = new Map<string, string>();
    if (groupBy === "user") {
      try {
        const iam = new IAMClient({ region });
        const usersRes = await iam.send(new ListUsersCommand({ PathPrefix: "/" }));
        const bedrockUsers = (usersRes.Users ?? []).filter((u) =>
          u.UserName?.startsWith("bedrock-key-")
        );
        await Promise.all(
          bedrockUsers.map(async (u) => {
            try {
              const tags = await iam.send(new ListUserTagsCommand({ UserName: u.UserName! }));
              const createdBy = tags.Tags?.find((t) => t.Key === "rockbed:createdBy")?.Value;
              if (createdBy && createdBy !== "unknown") {
                userEmailMap.set(u.UserName!, createdBy);
              }
            } catch {}
          })
        );
      } catch {}
    }

    const getGroupKey = (r: Record<string, string>) => {
      return r[groupField] ?? r.modelId ?? r.userArn ?? "unknown";
    };

    const cleanGroup = (key: string) => {
      if (groupBy === "apiKey" || groupBy === "user") {
        const match = key.match(/user\/(.+)$/);
        if (match) {
          const userName = match[1];
          if (groupBy === "user") {
            return userEmailMap.get(userName) ?? userName.replace(/^bedrock-key-/, "");
          }
          return userName.replace(/^bedrock-key-/, "");
        }
      }
      return key
        .replace(/^arn:aws:bedrock:[^:]+:\d+:inference-profile\//, "")
        .replace(/^us\./, "")
        .replace(/^anthropic\./, "")
        .replace(/^amazon\./, "")
        .replace(/^meta\./, "");
    };

    return NextResponse.json({
      daily: daily
        .filter((r) => getGroupKey(r) !== "unknown" && r.totalIn)
        .map((r) => ({
          day: r.day,
          groupKey: cleanGroup(getGroupKey(r)),
          totalIn: parseInt(r.totalIn ?? "0"),
          totalOut: parseInt(r.totalOut ?? "0"),
          invocations: parseInt(r.invocations ?? "0"),
        })),
      summary: summary
        .filter((r) => getGroupKey(r) !== "unknown" && r.totalIn)
        .map((r) => ({
          groupKey: cleanGroup(getGroupKey(r)),
          totalIn: parseInt(r.totalIn ?? "0"),
          totalOut: parseInt(r.totalOut ?? "0"),
          invocations: parseInt(r.invocations ?? "0"),
        })),
      period: { year, month, startTime: startTime.toISOString(), endTime: endTime.toISOString() },
    });
  } catch (err: any) {
    console.error("[analytics]", err);
    return NextResponse.json({
      daily: [],
      summary: [],
      period: { year, month, startTime: startTime.toISOString(), endTime: endTime.toISOString() },
      error: "Failed to load analytics data",
    });
  }
}
