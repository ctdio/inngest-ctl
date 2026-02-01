import type { Server } from "bun";

// Types
interface MockRoute {
  method?: string;
  path: string;
  response: unknown;
  status?: number;
}

interface MockServerOptions {
  port?: number;
  routes: MockRoute[];
}

// Main exports
export function createMockServer(options: MockServerOptions): Server {
  const { port = 0, routes } = options;

  // Sort routes by specificity (longer paths first)
  const sortedRoutes = [...routes].sort((a, b) => b.path.length - a.path.length);

  return Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      const method = req.method;

      for (const route of sortedRoutes) {
        const routeMethod = route.method ?? "GET";
        // Match if pathname starts with route path
        const pathMatches = url.pathname.startsWith(route.path);

        if (routeMethod === method && pathMatches) {
          return Response.json(route.response, { status: route.status ?? 200 });
        }
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    },
  });
}

export function mockEventResponse(id: string, name: string, data: Record<string, unknown> = {}) {
  return {
    data: {
      id,
      internal_id: id,
      name,
      received_at: new Date().toISOString(),
      data,
      ts: Date.now(),
    },
  };
}

export function mockEventsListResponse(events: Array<{ id: string; name: string; data?: Record<string, unknown> }>) {
  return {
    data: events.map((e) => ({
      id: e.id,
      internal_id: e.id,
      name: e.name,
      received_at: new Date().toISOString(),
      data: e.data ?? {},
      ts: Date.now(),
    })),
    metadata: {
      fetched_at: new Date().toISOString(),
    },
  };
}

export function mockRunResponse(options: {
  runId: string;
  status: string;
  functionId: string;
  startedAt?: string;
  endedAt?: string;
  output?: unknown;
}) {
  return {
    data: {
      run_id: options.runId,
      status: options.status,
      function_id: options.functionId,
      function_version: 1,
      event_id: "test-event-id",
      run_started_at: options.startedAt ?? new Date().toISOString(),
      ended_at: options.endedAt ?? null,
      output: options.output ?? null,
    },
  };
}

export function mockEventRunsResponse(runs: Array<{ runId: string; status: string; functionId: string }>) {
  return {
    data: runs.map((r) => ({
      run_id: r.runId,
      status: r.status,
      function_id: r.functionId,
      started_at: new Date().toISOString(),
    })),
    metadata: {
      fetched_at: new Date().toISOString(),
    },
  };
}

export function mockSendEventResponse(ids: string[]) {
  return { ids, status: 200 };
}
