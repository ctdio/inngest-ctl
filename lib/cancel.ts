import { createClient, apiRequest } from "./client";

// Types
export interface CancelOptions {
  appId: string;
  functionId: string;
  startedAfter: string;
  startedBefore: string;
  if?: string;
  dev?: boolean;
  port?: number;
}

export interface CancelResult {
  cancelled: number;
}

interface CancelRequest {
  app_id: string;
  function_id: string;
  started_after: string;
  started_before: string;
  if?: string;
}

// Main exports
export async function cancelRuns(options: CancelOptions): Promise<CancelResult> {
  const client = createClient({ dev: options.dev, port: options.port });

  const body: CancelRequest = {
    app_id: options.appId,
    function_id: options.functionId,
    started_after: parseTime(options.startedAfter),
    started_before: parseTime(options.startedBefore),
  };

  if (options.if) {
    body.if = options.if;
  }

  const response = await apiRequest<CancelResult>(
    client,
    "POST",
    "/v1/cancellations",
    body
  );

  return response;
}

// Helpers
function parseTime(input: string): string {
  // If already ISO format, return as-is
  if (input.includes("T") || input.includes("-")) {
    return input;
  }

  // Parse relative time like "1h", "30m", "2d"
  const match = input.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid time format: ${input}. Use ISO format or relative time (e.g., 1h, 30m, 2d)`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const now = Date.now();
  let ms: number;

  switch (unit) {
    case "s":
      ms = value * 1000;
      break;
    case "m":
      ms = value * 60 * 1000;
      break;
    case "h":
      ms = value * 60 * 60 * 1000;
      break;
    case "d":
      ms = value * 24 * 60 * 60 * 1000;
      break;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }

  return new Date(now - ms).toISOString();
}
