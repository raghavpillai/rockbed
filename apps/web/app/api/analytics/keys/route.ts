import { auth } from "@/lib/auth";
import { runInsightsQuery } from "@/lib/cloudwatch";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

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
      runInsightsQuery(
        cwl,
        `fields input.inputTokenCount as inTok, output.outputTokenCount as outTok, identity.arn as userArn
         | stats sum(inTok) as totalIn, sum(outTok) as totalOut, count(*) as inv by identity.arn
         | sort totalIn desc`,
        monthStart,
        now
      ),
      // Lifetime (90 days) per key
      runInsightsQuery(
        cwl,
        `fields input.inputTokenCount as inTok, output.outputTokenCount as outTok, identity.arn as userArn
         | stats sum(inTok) as totalIn, sum(outTok) as totalOut, count(*) as inv by identity.arn
         | sort totalIn desc`,
        ninetyDaysAgo,
        now
      ),
      // Last used time per key
      runInsightsQuery(
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
