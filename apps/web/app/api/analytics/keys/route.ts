import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const LOG_GROUP = "/aws/bedrock/invocation-logs";

async function runQuery(cwl: CloudWatchLogsClient, query: string, start: Date, end: Date) {
  const { queryId } = await cwl.send(
    new StartQueryCommand({
      logGroupName: LOG_GROUP,
      startTime: Math.floor(start.getTime() / 1000),
      endTime: Math.floor(end.getTime() / 1000),
      queryString: query,
    })
  );
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await cwl.send(new GetQueryResultsCommand({ queryId: queryId! }));
    if (res.status === "Complete") {
      return (res.results ?? []).map((row) => {
        const obj: Record<string, string> = {};
        for (const f of row) if (f.field && f.value) obj[f.field] = f.value;
        return obj;
      });
    }
    if (res.status === "Failed" || res.status === "Cancelled") return [];
  }
  return [];
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const region = req.nextUrl.searchParams.get("region") ?? "us-east-1";
  const cwl = new CloudWatchLogsClient({ region });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  try {
    const [mtdResults, recentResults, lastUsedResults] = await Promise.all([
      // MTD totals per key
      runQuery(
        cwl,
        `fields input.inputTokenCount as inTok, output.outputTokenCount as outTok, identity.arn as userArn
         | stats sum(inTok) as totalIn, sum(outTok) as totalOut, count(*) as inv by identity.arn
         | sort totalIn desc`,
        monthStart,
        now
      ),
      // Lifetime (90 days) per key
      runQuery(
        cwl,
        `fields input.inputTokenCount as inTok, output.outputTokenCount as outTok, identity.arn as userArn
         | stats sum(inTok) as totalIn, sum(outTok) as totalOut, count(*) as inv by identity.arn
         | sort totalIn desc`,
        ninetyDaysAgo,
        now
      ),
      // Last used time per key
      runQuery(
        cwl,
        `fields @timestamp, identity.arn as userArn
         | stats max(@timestamp) as lastUsed by identity.arn`,
        ninetyDaysAgo,
        now
      ),
    ]);

    const extractKey = (arn: string) => {
      const m = arn.match(/user\/bedrock-key-(.+)$/);
      return m ? m[1] : arn.replace(/.*user\//, "");
    };

    const keys: Record<string, {
      mtdIn: number; mtdOut: number; mtdInv: number;
      recentIn: number; recentOut: number; recentInv: number;
      lastUsed: string | null;
    }> = {};

    for (const r of mtdResults) {
      const k = extractKey(r["identity.arn"] ?? "");
      if (!keys[k]) keys[k] = { mtdIn: 0, mtdOut: 0, mtdInv: 0, recentIn: 0, recentOut: 0, recentInv: 0, lastUsed: null };
      keys[k].mtdIn = parseInt(r.totalIn ?? "0");
      keys[k].mtdOut = parseInt(r.totalOut ?? "0");
      keys[k].mtdInv = parseInt(r.inv ?? "0");
    }

    for (const r of recentResults) {
      const k = extractKey(r["identity.arn"] ?? "");
      if (!keys[k]) keys[k] = { mtdIn: 0, mtdOut: 0, mtdInv: 0, recentIn: 0, recentOut: 0, recentInv: 0, lastUsed: null };
      keys[k].recentIn = parseInt(r.totalIn ?? "0");
      keys[k].recentOut = parseInt(r.totalOut ?? "0");
      keys[k].recentInv = parseInt(r.inv ?? "0");
    }

    for (const r of lastUsedResults) {
      const k = extractKey(r["identity.arn"] ?? "");
      if (!keys[k]) keys[k] = { mtdIn: 0, mtdOut: 0, mtdInv: 0, recentIn: 0, recentOut: 0, recentInv: 0, lastUsed: null };
      keys[k].lastUsed = r.lastUsed ?? null;
    }

    return NextResponse.json(keys);
  } catch {
    return NextResponse.json({});
  }
}
