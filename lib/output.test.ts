import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { printOutput, printError } from "./output";

describe("output", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    logs = [];
    errors = [];
    consoleLogSpy = spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });
    consoleErrorSpy = spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.join(" "));
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("printOutput", () => {
    test("prints JSON by default", () => {
      const data = { events: [], meta: { fetchedAt: "2024-01-01T00:00:00Z", total: 0 } };
      printOutput(data, {});

      expect(logs).toHaveLength(1);
      expect(JSON.parse(logs[0])).toEqual(data);
    });

    test("prints pretty event list", () => {
      const data = {
        events: [
          { id: "evt-1", name: "user.signup", receivedAt: "2024-01-01T10:00:00Z", data: { userId: "u1" } },
        ],
        meta: { fetchedAt: "2024-01-01T10:00:01Z", total: 1 },
      };
      printOutput(data, { pretty: true });

      const output = logs.join("\n");
      expect(output).toContain("Events (1)");
      expect(output).toContain("user.signup");
    });

    test("prints pretty event details", () => {
      const data = {
        id: "evt-123",
        name: "test.event",
        receivedAt: "2024-01-01T10:00:00Z",
        data: { key: "value" },
      };
      printOutput(data, { pretty: true });

      const output = logs.join("\n");
      expect(output).toContain("Event");
      expect(output).toContain("evt-123");
      expect(output).toContain("test.event");
    });

    test("prints pretty run status", () => {
      const data = {
        runId: "run-123",
        status: "Running",
        functionId: "test-func",
        startedAt: "2024-01-01T10:00:00Z",
      };
      printOutput(data, { pretty: true });

      const output = logs.join("\n");
      expect(output).toContain("Run Status");
      expect(output).toContain("run-123");
      expect(output).toContain("RUN"); // Status badge shows abbreviated form
      expect(output).toContain("test-func");
      expect(output).toContain("(running)"); // Duration shows running indicator
    });

    test("prints empty runs message", () => {
      const data: unknown[] = [];
      printOutput(data, { pretty: true });

      const output = logs.join("\n");
      expect(output).toContain("No runs found");
    });

    test("prints cancel result", () => {
      const data = { cancelled: 5 };
      printOutput(data, { pretty: true });

      const output = logs.join("\n");
      expect(output).toContain("Cancellation complete");
      expect(output).toContain("5");
    });
  });

  describe("printError", () => {
    test("prints JSON error by default", () => {
      printError("Something went wrong");

      expect(errors).toHaveLength(1);
      expect(JSON.parse(errors[0])).toEqual({ error: "Something went wrong" });
    });

    test("prints pretty error", () => {
      printError("Something went wrong", true);

      const output = errors.join("\n");
      expect(output).toContain("Error:");
      expect(output).toContain("Something went wrong");
    });
  });
});
