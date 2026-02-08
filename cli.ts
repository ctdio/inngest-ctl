#!/usr/bin/env bun

import { sendEvent, getEvent, getEventRuns, listEvents } from "./lib/events";
import { getRun, getRunJobs } from "./lib/runs";
import { cancelRuns } from "./lib/cancel";
import { printOutput, printError } from "./lib/output";

// Types
interface GlobalFlags {
  pretty: boolean;
  output?: string;
  dev: boolean;
  port?: number;
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { flags, positional } = parseGlobalFlags(args);

  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const command = positional[0];
  const subArgs = positional.slice(1);

  try {
    switch (command) {
      case "events":
        await handleEvents(subArgs, flags);
        break;
      case "runs":
        await handleRuns(subArgs, flags);
        break;
      case "cancel":
        await handleCancel(subArgs, flags);
        break;
      case "help":
      case "--help":
      case "-h":
        printUsage();
        break;
      case "version":
      case "--version":
      case "-v":
        console.log("0.1.0");
        break;
      default:
        printError(`Unknown command: ${command}`, flags.pretty);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    printError(message, flags.pretty);
    process.exit(1);
  }
}

// Command handlers
async function handleEvents(args: string[], flags: GlobalFlags): Promise<void> {
  if (args.length === 0) {
    printEventsUsage();
    process.exit(1);
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "help":
    case "--help":
    case "-h":
      printEventsUsage();
      return;

    case "send": {
      const parsed = parseNamedArgs(subArgs);
      const name = parsed["name"];
      const dataStr = parsed["data"];
      const dataFile = parsed["data-file"];
      const id = parsed["id"];
      const env = parsed["env"];

      if (!name) {
        printError("--name is required", flags.pretty);
        process.exit(1);
      }
      if (!dataStr && !dataFile) {
        printError("--data or --data-file is required", flags.pretty);
        process.exit(1);
      }

      let data: Record<string, unknown>;
      try {
        const rawJson = dataFile ? await readDataFile(dataFile) : dataStr!;
        data = JSON.parse(rawJson);
      } catch (err) {
        const source = dataFile ? `--data-file (${dataFile})` : "--data";
        printError(`${source} must be valid JSON`, flags.pretty);
        process.exit(1);
      }

      const result = await sendEvent({
        name,
        data,
        id,
        env,
        dev: flags.dev,
        port: flags.port,
      });
      printOutput(result, flags);
      break;
    }

    case "get": {
      const eventId = subArgs[0];
      if (!eventId) {
        printError("Event ID is required", flags.pretty);
        process.exit(1);
      }
      const result = await getEvent(eventId, {
        dev: flags.dev,
        port: flags.port,
      });
      printOutput(result, flags);
      break;
    }

    case "runs": {
      const eventId = subArgs[0];
      if (!eventId) {
        printError("Event ID is required", flags.pretty);
        process.exit(1);
      }
      const result = await getEventRuns(eventId, {
        dev: flags.dev,
        port: flags.port,
      });
      printOutput(result, flags);
      break;
    }

    case "list": {
      const parsed = parseNamedArgs(subArgs);
      const name = parsed["name"];
      const limitStr = parsed["limit"];
      const limit = limitStr ? parseInt(limitStr, 10) : undefined;

      const result = await listEvents({
        name,
        limit,
        dev: flags.dev,
        port: flags.port,
      });
      printOutput(result, flags);
      break;
    }

    default:
      printError(`Unknown events subcommand: ${subcommand}`, flags.pretty);
      printEventsUsage();
      process.exit(1);
  }
}

async function handleRuns(args: string[], flags: GlobalFlags): Promise<void> {
  if (args.length === 0) {
    printRunsUsage();
    process.exit(1);
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "help":
    case "--help":
    case "-h":
      printRunsUsage();
      return;

    case "get": {
      const runId = subArgs[0];
      if (!runId) {
        printError("Run ID is required", flags.pretty);
        process.exit(1);
      }
      const result = await getRunJobs(runId, {
        dev: flags.dev,
        port: flags.port,
      });
      printOutput(result, flags);
      break;
    }

    case "list": {
      const parsed = parseNamedArgs(subArgs);
      const eventId = parsed["event"];
      if (!eventId) {
        printError("--event is required", flags.pretty);
        process.exit(1);
      }
      const result = await getEventRuns(eventId, {
        dev: flags.dev,
        port: flags.port,
      });
      printOutput(result, flags);
      break;
    }

    case "status": {
      const runId = subArgs[0];
      if (!runId) {
        printError("Run ID is required", flags.pretty);
        process.exit(1);
      }
      const result = await getRun(runId, { dev: flags.dev, port: flags.port });
      printOutput(result, flags);
      break;
    }

    default:
      printError(`Unknown runs subcommand: ${subcommand}`, flags.pretty);
      printRunsUsage();
      process.exit(1);
  }
}

async function handleCancel(args: string[], flags: GlobalFlags): Promise<void> {
  const parsed = parseNamedArgs(args);

  const appId = parsed["app"];
  const functionId = parsed["function"];
  const startedAfter = parsed["started-after"];
  const startedBefore = parsed["started-before"];
  const ifExpr = parsed["if"];

  if (!appId) {
    printError("--app is required", flags.pretty);
    process.exit(1);
  }
  if (!functionId) {
    printError("--function is required", flags.pretty);
    process.exit(1);
  }
  if (!startedAfter) {
    printError("--started-after is required", flags.pretty);
    process.exit(1);
  }
  if (!startedBefore) {
    printError("--started-before is required", flags.pretty);
    process.exit(1);
  }

  const result = await cancelRuns({
    appId,
    functionId,
    startedAfter,
    startedBefore,
    if: ifExpr,
    dev: flags.dev,
    port: flags.port,
  });

  printOutput(result, flags);
}

// Argument parsing helpers
function parseGlobalFlags(args: string[]): {
  flags: GlobalFlags;
  positional: string[];
} {
  const flags: GlobalFlags = {
    pretty: false,
    dev: false,
  };
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--pretty") {
      flags.pretty = true;
      i++;
    } else if (arg === "--dev") {
      flags.dev = true;
      i++;
    } else if (arg === "--port" && i + 1 < args.length) {
      flags.port = parseInt(args[i + 1], 10);
      i += 2;
    } else if (arg.startsWith("--port=")) {
      flags.port = parseInt(arg.slice("--port=".length), 10);
      i++;
    } else if (arg === "--output" && i + 1 < args.length) {
      flags.output = args[i + 1];
      i += 2;
    } else if (arg.startsWith("--output=")) {
      flags.output = arg.slice("--output=".length);
      i++;
    } else {
      positional.push(arg);
      i++;
    }
  }

  return { flags, positional };
}

function parseNamedArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        result[key] = value;
        i++;
      } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        const key = arg.slice(2);
        result[key] = args[i + 1];
        i += 2;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

// Usage messages
function printUsage(): void {
  console.log(`
inngest-ctl - Command-line interface for Inngest

Usage:
  inngest-ctl <command> [options]

Commands:
  events    Send and query events
  runs      Query function runs
  cancel    Cancel running functions

Global Options:
  --pretty          Human-readable output with colors
  --output <file>   Write JSON output to file
  --dev             Use local dev server (default: localhost:8288)
  --port <port>     Dev server port (default: 8288)
  --help, -h        Show this help message
  --version, -v     Show version

Environment Variables:
  INNGEST_EVENT_KEY     Required for sending events (not needed with --dev)
  INNGEST_SIGNING_KEY   Required for API queries
  INNGEST_DEV_URL       Override dev server URL (e.g., http://localhost:9000)

Examples:
  inngest-ctl events send --name "user.signup" --data '{"userId": "123"}'
  inngest-ctl events get <event-id> --pretty
  inngest-ctl runs get <run-id>
  inngest-ctl cancel --app my-app --function my-func --started-after 1h --started-before now
`);
}

function printEventsUsage(): void {
  console.log(`
Events Commands:

Usage:
  inngest-ctl events <subcommand> [options]

Subcommands:
  list    List recent events
  send    Send an event
  get     Get event details
  runs    List runs triggered by an event

List Options:
  --name <name>     Filter by event name (optional)
  --limit <n>       Max events to return (optional)

Send Options:
  --name <name>         Event name (required)
  --data <json>         Event data as inline JSON (required unless --data-file)
  --data-file <path>    Read event data from a JSON file (required unless --data)
  --id <id>             Deduplication ID (optional)
  --env <env>           Branch environment name (optional)

Examples:
  inngest-ctl events list --pretty
  inngest-ctl events list --name "user.signup" --limit 10 --pretty
  inngest-ctl events send --name "user.signup" --data '{"userId": "123"}'
  inngest-ctl events send --name "test.event" --data-file /tmp/event.json --dev
  inngest-ctl events send --name "test.event" --data '{}' --env "feature/my-branch"
  inngest-ctl events get 01H08W4TMBNKMEWFD0TYC532GG --pretty
  inngest-ctl events runs 01H08W4TMBNKMEWFD0TYC532GG --pretty
`);
}

function printRunsUsage(): void {
  console.log(`
Runs Commands:

Usage:
  inngest-ctl runs <subcommand> [options]

Subcommands:
  status  Get run status and duration
  get     Get run details (jobs/steps)
  list    List runs for an event

List Options:
  --event <id>    Event ID to list runs for

Examples:
  inngest-ctl runs status 01H08W5TMBNKMEWFD0TYC532GH --pretty
  inngest-ctl runs get 01H08W5TMBNKMEWFD0TYC532GH --pretty
  inngest-ctl runs list --event 01H08W4TMBNKMEWFD0TYC532GG
`);
}

// File helpers
async function readDataFile(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${filePath}`);
  }
  return file.text();
}

main();
