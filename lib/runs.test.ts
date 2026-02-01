import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type { Server } from "bun";
import { getRun, getRunJobs } from "./runs";
import { createMockServer, mockRunResponse } from "./test-utils";

describe("runs", () => {
  let server: Server;
  let port: number;

  beforeAll(() => {
    server = createMockServer({
      routes: [
        {
          method: "GET",
          path: "/v1/runs/run-completed",
          response: mockRunResponse({
            runId: "run-completed",
            status: "Completed",
            functionId: "test-app-test-func",
            startedAt: "2024-01-01T10:00:00Z",
            endedAt: "2024-01-01T10:01:00Z",
            output: { success: true },
          }),
        },
        {
          method: "GET",
          path: "/v1/runs/run-running",
          response: mockRunResponse({
            runId: "run-running",
            status: "Running",
            functionId: "test-app-slow-func",
            startedAt: "2024-01-01T10:00:00Z",
          }),
        },
        {
          method: "GET",
          path: "/v1/runs/run-failed",
          response: mockRunResponse({
            runId: "run-failed",
            status: "Failed",
            functionId: "test-app-broken-func",
            startedAt: "2024-01-01T10:00:00Z",
            endedAt: "2024-01-01T10:00:05Z",
            output: { error: "Something went wrong" },
          }),
        },
        {
          method: "GET",
          path: "/v1/runs/run-not-found",
          response: { data: null },
        },
        {
          method: "GET",
          path: "/v1/runs/run-with-jobs/jobs",
          response: {
            data: [
              { job_id: "job-1", step_id: "step-init", status: "Completed", started_at: "2024-01-01T10:00:00Z", ended_at: "2024-01-01T10:00:01Z" },
              { job_id: "job-2", step_id: "step-process", status: "Completed", started_at: "2024-01-01T10:00:01Z", ended_at: "2024-01-01T10:00:05Z" },
            ],
          },
        },
        {
          method: "GET",
          path: "/v1/runs/run-no-jobs/jobs",
          response: { data: [] },
        },
      ],
    });
    port = server.port;
  });

  afterAll(() => {
    server.stop();
  });

  describe("getRun", () => {
    test("returns completed run with output", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const run = await getRun("run-completed", { dev: true });

      expect(run.runId).toBe("run-completed");
      expect(run.status).toBe("Completed");
      expect(run.functionId).toBe("test-app-test-func");
      expect(run.startedAt).toBe("2024-01-01T10:00:00Z");
      expect(run.endedAt).toBe("2024-01-01T10:01:00Z");
      expect(run.output).toEqual({ success: true });
    });

    test("returns running run without endedAt", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const run = await getRun("run-running", { dev: true });

      expect(run.runId).toBe("run-running");
      expect(run.status).toBe("Running");
      expect(run.startedAt).toBeDefined();
      expect(run.endedAt).toBeNull();
    });

    test("returns failed run", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const run = await getRun("run-failed", { dev: true });

      expect(run.runId).toBe("run-failed");
      expect(run.status).toBe("Failed");
      expect(run.output).toEqual({ error: "Something went wrong" });
    });

    test("throws error when run not found", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      await expect(getRun("run-not-found", { dev: true })).rejects.toThrow("Run not found");
    });
  });

  describe("getRunJobs", () => {
    test("returns jobs for a run", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const jobs = await getRunJobs("run-with-jobs", { dev: true });

      expect(jobs).toHaveLength(2);
      expect(jobs[0].jobId).toBe("job-1");
      expect(jobs[0].stepId).toBe("step-init");
      expect(jobs[1].jobId).toBe("job-2");
      expect(jobs[1].stepId).toBe("step-process");
    });

    test("returns empty array when no jobs", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const jobs = await getRunJobs("run-no-jobs", { dev: true });

      expect(jobs).toHaveLength(0);
    });
  });
});
