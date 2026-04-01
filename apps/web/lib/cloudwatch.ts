import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

export const LOG_GROUP = "/aws/bedrock/invocation-logs";

export async function runInsightsQuery(
  cwl: CloudWatchLogsClient,
  query: string,
  startTime: Date,
  endTime: Date
): Promise<Record<string, string>[]> {
  const { queryId } = await cwl.send(
    new StartQueryCommand({
      logGroupName: LOG_GROUP,
      startTime: Math.floor(startTime.getTime() / 1000),
      endTime: Math.floor(endTime.getTime() / 1000),
      queryString: query,
    })
  );

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await cwl.send(
      new GetQueryResultsCommand({ queryId: queryId! })
    );
    if (res.status === "Complete") {
      return (res.results ?? []).map((row) => {
        const obj: Record<string, string> = {};
        for (const field of row) {
          if (field.field && field.value) obj[field.field] = field.value;
        }
        return obj;
      });
    }
    if (res.status === "Failed" || res.status === "Cancelled") {
      throw new Error(`Query ${res.status}`);
    }
  }
  throw new Error("Query timed out");
}
