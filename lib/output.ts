import type { EventResult, EventDetails, EventRun, EventListResult } from "./events";
import type { RunJob, RunStatus } from "./runs";
import type { CancelResult } from "./cancel";

// Types
type OutputResult =
  | EventResult
  | EventDetails
  | EventRun[]
  | RunJob[]
  | RunStatus
  | CancelResult
  | EventListResult;

// ANSI color codes
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
  bgGreen: "\x1b[42m",
  bgBlue: "\x1b[44m",
  bgCyan: "\x1b[46m",
  bgMagenta: "\x1b[45m",
} as const;

// Main exports
export function printOutput(
  result: OutputResult,
  options: { pretty?: boolean; output?: string }
): void {
  const json = JSON.stringify(result, null, 2);

  if (options.output) {
    writeToFile(options.output, json);
    console.log(`Output written to ${options.output}`);
    return;
  }

  if (options.pretty) {
    printPretty(result);
    return;
  }

  console.log(json);
}

export function printError(message: string, pretty?: boolean): void {
  if (pretty) {
    console.error(`${c.red}${c.bold}Error:${c.reset} ${message}`);
  } else {
    console.error(JSON.stringify({ error: message }));
  }
}

export function printSuccess(message: string): void {
  console.log(`${c.green}✓${c.reset} ${message}`);
}

export function printInfo(message: string): void {
  console.log(`${c.blue}ℹ${c.reset} ${message}`);
}

// Helpers
function writeToFile(path: string, content: string): void {
  Bun.write(path, content);
}

function printPretty(result: OutputResult): void {
  if (isEventResult(result)) {
    printEventResult(result);
  } else if (isEventListResult(result)) {
    printEventList(result);
  } else if (isEventDetails(result)) {
    printEventDetails(result);
  } else if (isEventRunArray(result)) {
    printEventRuns(result);
  } else if (isRunStatus(result)) {
    printRunStatus(result);
  } else if (isRunJobArray(result)) {
    printRunJobs(result);
  } else if (isCancelResult(result)) {
    printCancelResult(result);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

// Type guards
function isEventResult(result: OutputResult): result is EventResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "ids" in result &&
    "status" in result &&
    Array.isArray((result as EventResult).ids)
  );
}

function isEventListResult(result: OutputResult): result is EventListResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "events" in result &&
    "meta" in result &&
    Array.isArray((result as EventListResult).events)
  );
}

function isEventDetails(result: OutputResult): result is EventDetails {
  return (
    typeof result === "object" &&
    result !== null &&
    "id" in result &&
    "name" in result &&
    "receivedAt" in result &&
    !("events" in result)
  );
}

function isEventRunArray(result: OutputResult): result is EventRun[] {
  return (
    Array.isArray(result) &&
    (result.length === 0 ||
      ("runId" in result[0] && "functionId" in result[0]))
  );
}

function isRunJobArray(result: OutputResult): result is RunJob[] {
  return (
    Array.isArray(result) &&
    result.length > 0 &&
    "jobId" in result[0] &&
    "stepId" in result[0]
  );
}

function isCancelResult(result: OutputResult): result is CancelResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "cancelled" in result &&
    typeof (result as CancelResult).cancelled === "number"
  );
}

function isRunStatus(result: OutputResult): result is RunStatus {
  return (
    typeof result === "object" &&
    result !== null &&
    "runId" in result &&
    "status" in result &&
    "functionId" in result &&
    !Array.isArray(result)
  );
}

// Formatters
function printEventResult(result: EventResult): void {
  console.log(`${c.green}✓${c.reset} Event sent successfully`);
  console.log(`  ${c.dim}Status:${c.reset} ${result.status}`);
  console.log(`  ${c.dim}IDs:${c.reset}`);
  for (const id of result.ids) {
    console.log(`    ${c.cyan}${id}${c.reset}`);
  }
}

function printEventList(result: EventListResult): void {
  const total = result.meta.total ?? result.events.length;
  console.log(`${c.bold}Events (${total})${c.reset} ${c.dim}fetched ${formatRelativeTime(result.meta.fetchedAt)}${c.reset}`);
  console.log();

  if (result.events.length === 0) {
    console.log(`${c.yellow}No events found${c.reset}`);
    return;
  }

  for (const event of result.events) {
    console.log(formatEventLine(event));
  }
}

function printEventDetails(event: EventDetails): void {
  console.log(`${c.bold}Event${c.reset}`);
  console.log();
  console.log(`${c.dim}ID:${c.reset}       ${c.cyan}${event.id}${c.reset}`);
  console.log(`${c.dim}Name:${c.reset}     ${formatEventName(event.name)}`);
  console.log(`${c.dim}Received:${c.reset} ${formatTimestamp(event.receivedAt)}`);

  if (event.user && Object.keys(event.user).length > 0) {
    console.log(`${c.dim}User:${c.reset}     ${JSON.stringify(event.user)}`);
  }

  if (event.data && Object.keys(event.data).length > 0) {
    console.log();
    console.log(`${c.dim}Data:${c.reset}`);
    const dataStr = JSON.stringify(event.data, null, 2);
    for (const line of dataStr.split("\n")) {
      console.log(`  ${c.white}${line}${c.reset}`);
    }
  }
}

function printEventRuns(runs: EventRun[]): void {
  if (runs.length === 0) {
    console.log(`${c.yellow}No runs found for this event${c.reset}`);
    return;
  }

  console.log(`${c.bold}Runs (${runs.length})${c.reset}`);
  console.log();

  for (const run of runs) {
    const status = formatRunStatus(run.status);
    const duration = run.startedAt && run.endedAt ? formatDuration(run.startedAt, run.endedAt) : "";
    const ts = run.startedAt ? formatTimestamp(run.startedAt) : "";
    const funcId = `${c.cyan}${truncate(run.functionId, 40)}${c.reset}`;

    console.log(`${ts} ${status} ${funcId} ${c.dim}${run.runId.slice(0, 12)}${c.reset} ${duration}`);
  }
}

function printRunJobs(jobs: RunJob[]): void {
  if (jobs.length === 0) {
    console.log(`${c.yellow}No jobs found for this run${c.reset}`);
    return;
  }

  console.log(`${c.bold}Jobs (${jobs.length})${c.reset}`);
  console.log();

  for (const job of jobs) {
    const status = formatRunStatus(job.status);
    const duration = job.startedAt && job.endedAt ? formatDuration(job.startedAt, job.endedAt) : "";
    const ts = job.startedAt ? formatTimestamp(job.startedAt) : "";
    const step = `${c.magenta}${truncate(job.stepId, 30)}${c.reset}`;

    console.log(`${ts} ${status} ${step} ${c.dim}${job.jobId.slice(0, 12)}${c.reset} ${duration}`);

    if (job.error) {
      console.log(`  ${c.red}Error: ${job.error}${c.reset}`);
    }
    if (job.output !== undefined) {
      console.log(`  ${c.dim}Output: ${JSON.stringify(job.output)}${c.reset}`);
    }
  }
}

function printCancelResult(result: CancelResult): void {
  console.log(`${c.green}✓${c.reset} Cancellation complete`);
  console.log(`  ${c.dim}Runs cancelled:${c.reset} ${result.cancelled}`);
}

function printRunStatus(run: RunStatus): void {
  const status = formatRunStatus(run.status);
  const duration = calculateDuration(run.startedAt, run.endedAt);

  console.log(`${c.bold}Run Status${c.reset}`);
  console.log();
  console.log(`${c.dim}Run ID:${c.reset}     ${c.cyan}${run.runId}${c.reset}`);
  console.log(`${c.dim}Status:${c.reset}     ${status}`);
  console.log(`${c.dim}Function:${c.reset}   ${c.magenta}${run.functionId}${c.reset}${run.functionVersion ? ` v${run.functionVersion}` : ""}`);

  if (run.eventId) {
    console.log(`${c.dim}Event ID:${c.reset}   ${run.eventId}`);
  }

  if (run.startedAt) {
    console.log(`${c.dim}Started:${c.reset}    ${formatTimestamp(run.startedAt)}`);
  }

  if (run.endedAt) {
    console.log(`${c.dim}Ended:${c.reset}      ${formatTimestamp(run.endedAt)}`);
  }

  console.log(`${c.dim}Duration:${c.reset}   ${duration}`);

  if (run.output !== undefined) {
    console.log();
    console.log(`${c.dim}Output:${c.reset}`);
    const outputStr = JSON.stringify(run.output, null, 2);
    for (const line of outputStr.split("\n")) {
      console.log(`  ${c.white}${line}${c.reset}`);
    }
  }
}

// Format helpers
function formatEventLine(event: EventDetails): string {
  const ts = formatTimestamp(event.receivedAt);
  const name = formatEventName(event.name);
  const id = `${c.dim}${event.id.slice(0, 12)}${c.reset}`;
  const dataPreview = event.data ? formatDataPreview(event.data) : "";

  return `${ts} ${name} ${id} ${dataPreview}`;
}

function formatEventName(name: string): string {
  // Color-code based on common event name patterns (black text on colored bg for contrast)
  const nameLower = name.toLowerCase();
  if (nameLower.includes("error") || nameLower.includes("fail")) {
    return `${c.bgRed}${c.black}${c.bold} ${name} ${c.reset}`;
  }
  if (nameLower.includes("warn")) {
    return `${c.bgYellow}${c.black}${c.bold} ${name} ${c.reset}`;
  }
  if (nameLower.includes("success") || nameLower.includes("complete")) {
    return `${c.bgGreen}${c.black}${c.bold} ${name} ${c.reset}`;
  }
  return `${c.bgBlue}${c.black}${c.bold} ${name} ${c.reset}`;
}

function formatRunStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "success") {
    return `${c.bgGreen}${c.black}${c.bold} OK  ${c.reset}`;
  }
  if (s === "failed" || s === "error") {
    return `${c.bgRed}${c.black}${c.bold} ERR ${c.reset}`;
  }
  if (s === "running" || s === "pending") {
    return `${c.bgYellow}${c.black}${c.bold} RUN ${c.reset}`;
  }
  if (s === "cancelled") {
    return `${c.dim}[CXL]${c.reset}`;
  }
  return `${c.dim}[${status.slice(0, 3).toUpperCase()}]${c.reset}`;
}

function formatTimestamp(ts: string): string {
  if (!ts) return "";
  const date = new Date(ts);
  const time = date.toLocaleTimeString("en-US", { hour12: false });
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${c.gray}${time}.${ms}${c.reset}`;
}

function formatRelativeTime(ts: string): string {
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diff = now - then;

  if (diff < 1000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1) return `${c.yellow}<1ms${c.reset}`;
  if (ms < 1000) return `${c.yellow}${ms}ms${c.reset}`;
  if (ms < 60000) return `${c.yellow}${(ms / 1000).toFixed(2)}s${c.reset}`;
  return `${c.yellow}${(ms / 60000).toFixed(2)}m${c.reset}`;
}

function calculateDuration(start?: string, end?: string): string {
  if (!start) return `${c.dim}not started${c.reset}`;

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const ms = endTime - startTime;

  const isRunning = !end;
  const prefix = isRunning ? `${c.yellow}` : `${c.green}`;
  const suffix = isRunning ? ` (running)` : "";

  if (ms < 1000) return `${prefix}${ms}ms${suffix}${c.reset}`;
  if (ms < 60000) return `${prefix}${(ms / 1000).toFixed(2)}s${suffix}${c.reset}`;
  if (ms < 3600000) return `${prefix}${(ms / 60000).toFixed(2)}m${suffix}${c.reset}`;
  return `${prefix}${(ms / 3600000).toFixed(2)}h${suffix}${c.reset}`;
}

function formatDataPreview(data: Record<string, unknown>): string {
  const keys = Object.keys(data);
  if (keys.length === 0) return "";

  const preview = keys.slice(0, 3).map((k) => {
    const v = data[k];
    const val = typeof v === "string" ? truncate(v, 20) : JSON.stringify(v);
    return `${k}=${val}`;
  });

  const suffix = keys.length > 3 ? ` +${keys.length - 3}` : "";
  return `${c.dim}${preview.join(" ")}${suffix}${c.reset}`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
