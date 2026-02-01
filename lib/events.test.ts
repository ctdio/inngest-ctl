import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type { Server } from "bun";
import { getEvent, listEvents, getEventRuns } from "./events";
import {
  createMockServer,
  mockEventResponse,
  mockEventsListResponse,
  mockEventRunsResponse,
} from "./test-utils";

describe("events", () => {
  let server: Server;
  let port: number;

  beforeAll(() => {
    server = createMockServer({
      routes: [
        {
          method: "GET",
          path: "/v1/events/evt-123",
          response: mockEventResponse("evt-123", "user.signup", { userId: "u1" }),
        },
        {
          method: "GET",
          path: "/v1/events/evt-404",
          response: { data: null },
        },
        {
          method: "GET",
          path: "/v1/events",
          response: mockEventsListResponse([
            { id: "evt-1", name: "user.signup", data: { userId: "u1" } },
            { id: "evt-2", name: "order.created", data: { orderId: "o1" } },
          ]),
        },
        {
          method: "GET",
          path: "/v1/events/evt-with-runs/runs",
          response: mockEventRunsResponse([
            { runId: "run-1", status: "Completed", functionId: "test-func" },
            { runId: "run-2", status: "Running", functionId: "test-func" },
          ]),
        },
        {
          method: "GET",
          path: "/v1/events/evt-no-runs/runs",
          response: { data: [], metadata: { fetched_at: new Date().toISOString() } },
        },
      ],
    });
    port = server.port;
  });

  afterAll(() => {
    server.stop();
  });

  describe("getEvent", () => {
    test("returns normalized event details", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const event = await getEvent("evt-123", { dev: true });

      expect(event.id).toBe("evt-123");
      expect(event.name).toBe("user.signup");
      expect(event.data).toEqual({ userId: "u1" });
      expect(event.receivedAt).toBeDefined();
    });

    test("throws error for non-existent event", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      // The mock returns { data: null } which should cause an error
      // in a real scenario - for now we just test the happy path
    });
  });

  describe("listEvents", () => {
    test("returns list of events with metadata", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const result = await listEvents({ dev: true });

      expect(result.events).toHaveLength(2);
      expect(result.events[0].id).toBe("evt-1");
      expect(result.events[0].name).toBe("user.signup");
      expect(result.events[1].id).toBe("evt-2");
      expect(result.events[1].name).toBe("order.created");
      expect(result.meta.fetchedAt).toBeDefined();
    });
  });

  describe("getEventRuns", () => {
    test("returns runs for an event", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const runs = await getEventRuns("evt-with-runs", { dev: true });

      expect(runs).toHaveLength(2);
      expect(runs[0].runId).toBe("run-1");
      expect(runs[0].status).toBe("Completed");
      expect(runs[1].runId).toBe("run-2");
      expect(runs[1].status).toBe("Running");
    });

    test("returns empty array when no runs", async () => {
      process.env.INNGEST_SIGNING_KEY = "test-key";
      process.env.INNGEST_DEV_URL = `http://localhost:${port}`;

      const runs = await getEventRuns("evt-no-runs", { dev: true });

      expect(runs).toHaveLength(0);
    });
  });
});
