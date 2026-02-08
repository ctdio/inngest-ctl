import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type { Server } from "bun";
import {
  createMockServer,
  mockEventResponse,
  mockEventsListResponse,
  mockRunResponse,
  mockSendEventResponse,
} from "./lib/test-utils";

describe("CLI integration", () => {
  let server: Server;
  let port: number;

  beforeAll(() => {
    server = createMockServer({
      routes: [
        // Events
        {
          method: "GET",
          path: "/v1/events/evt-test",
          response: mockEventResponse("evt-test", "test.event", {
            key: "value",
          }),
        },
        {
          method: "GET",
          path: "/v1/events",
          response: mockEventsListResponse([
            { id: "evt-1", name: "user.signup" },
            { id: "evt-2", name: "order.created" },
          ]),
        },
        {
          method: "GET",
          path: "/v1/events/evt-test/runs",
          response: {
            data: [],
            metadata: { fetched_at: new Date().toISOString() },
          },
        },
        // Runs
        {
          method: "GET",
          path: "/v1/runs/run-test",
          response: mockRunResponse({
            runId: "run-test",
            status: "Completed",
            functionId: "test-func",
            startedAt: "2024-01-01T10:00:00Z",
            endedAt: "2024-01-01T10:01:00Z",
          }),
        },
        // Send event
        {
          method: "POST",
          path: "/e/test-key",
          response: mockSendEventResponse(["evt-new"]),
        },
      ],
    });
    port = server.port;
  });

  afterAll(() => {
    server.stop();
  });

  async function runCli(
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = Bun.spawn(["bun", "run", "cli.ts", ...args], {
      env: {
        ...process.env,
        INNGEST_SIGNING_KEY: "test-key",
        INNGEST_EVENT_KEY: "test-key",
        INNGEST_DEV_URL: `http://localhost:${port}`,
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { stdout, stderr, exitCode };
  }

  describe("help commands", () => {
    test("shows main help", async () => {
      const { stdout, exitCode } = await runCli(["--help"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("inngest-ctl");
      expect(stdout).toContain("events");
      expect(stdout).toContain("runs");
      expect(stdout).toContain("cancel");
    });

    test("shows events help", async () => {
      const { stdout, exitCode } = await runCli(["events", "--help"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Events Commands");
      expect(stdout).toContain("list");
      expect(stdout).toContain("send");
      expect(stdout).toContain("get");
    });

    test("shows runs help", async () => {
      const { stdout, exitCode } = await runCli(["runs", "--help"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Runs Commands");
      expect(stdout).toContain("status");
      expect(stdout).toContain("get");
      expect(stdout).toContain("list");
    });

    test("shows version", async () => {
      const { stdout, exitCode } = await runCli(["--version"]);

      expect(exitCode).toBe(0);
      expect(stdout.trim()).toBe("0.2.0");
    });
  });

  describe("events commands", () => {
    test("events list returns JSON", async () => {
      const { stdout, exitCode } = await runCli(["events", "list", "--dev"]);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].name).toBe("user.signup");
    });

    test("events get returns event details", async () => {
      const { stdout, exitCode } = await runCli([
        "events",
        "get",
        "evt-test",
        "--dev",
      ]);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.id).toBe("evt-test");
      expect(result.name).toBe("test.event");
    });

    test("events send requires --name", async () => {
      const { stderr, exitCode } = await runCli([
        "events",
        "send",
        "--data",
        "{}",
        "--dev",
      ]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("--name is required");
    });

    test("events send requires --data or --data-file", async () => {
      const { stderr, exitCode } = await runCli([
        "events",
        "send",
        "--name",
        "test",
        "--dev",
      ]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("--data or --data-file is required");
    });

    test("events send with --data-file reads JSON from file", async () => {
      const tmpFile = "/tmp/inngest-ctl-test-data.json";
      await Bun.write(tmpFile, JSON.stringify({ userId: "from-file" }));

      const { stdout, exitCode } = await runCli([
        "events",
        "send",
        "--name",
        "test.event",
        "--data-file",
        tmpFile,
        "--dev",
      ]);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.ids).toContain("evt-new");
    });

    test("events send with --data-file rejects missing file", async () => {
      const { stderr, exitCode } = await runCli([
        "events",
        "send",
        "--name",
        "test",
        "--data-file",
        "/tmp/nonexistent-file.json",
        "--dev",
      ]);

      expect(exitCode).toBe(1);
    });

    test("events send validates JSON data", async () => {
      const { stderr, exitCode } = await runCli([
        "events",
        "send",
        "--name",
        "test",
        "--data",
        "invalid",
        "--dev",
      ]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("--data must be valid JSON");
    });
  });

  describe("runs commands", () => {
    test("runs status returns run details", async () => {
      const { stdout, exitCode } = await runCli([
        "runs",
        "status",
        "run-test",
        "--dev",
      ]);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.runId).toBe("run-test");
      expect(result.status).toBe("Completed");
    });

    test("runs status requires run ID", async () => {
      const { stderr, exitCode } = await runCli(["runs", "status", "--dev"]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Run ID is required");
    });

    test("runs list requires --event", async () => {
      const { stderr, exitCode } = await runCli(["runs", "list", "--dev"]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("--event is required");
    });
  });

  describe("error handling", () => {
    test("unknown command shows error", async () => {
      const { stderr, exitCode } = await runCli(["unknown"]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Unknown command");
    });

    test("missing signing key shows error in production mode", async () => {
      const proc = Bun.spawn(["bun", "run", "cli.ts", "events", "list"], {
        env: {
          ...process.env,
          INNGEST_SIGNING_KEY: "",
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("INNGEST_SIGNING_KEY");
    });

    test("dev mode works without signing key", async () => {
      const proc = Bun.spawn(
        ["bun", "run", "cli.ts", "events", "list", "--dev"],
        {
          env: {
            ...process.env,
            INNGEST_SIGNING_KEY: "",
            INNGEST_DEV_URL: `http://localhost:${port}`,
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("data");
    });
  });
});
