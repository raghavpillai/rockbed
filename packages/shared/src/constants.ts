export const BEDROCK_POLICY_ARN =
  "arn:aws:iam::aws:policy/AmazonBedrockFullAccess";

export const BEDROCK_SERVICE_NAME = "bedrock.amazonaws.com";

export const USER_PREFIX = "bedrock-key-";

export const REGIONS = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
] as const;

export const EXPIRY_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "5 days", days: 5 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "365 days", days: 365 },
  { label: "Never expires", days: 0 },
  { label: "Custom", days: -1 },
] as const;
