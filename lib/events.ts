import {
  createClient,
  getEventGatewayUrl,
  validateEventKey,
  apiRequest,
} from "./client";

// Types
export interface SendEventOptions {
  name: string;
  data: Record<string, unknown>;
  id?: string;
  env?: string;
  dev?: boolean;
  port?: number;
}

export interface EventResult {
  ids: string[];
  status: number;
}

export interface EventDetails {
  id: string;
  name: string;
  receivedAt: string;
  data?: Record<string, unknown>;
  user?: Record<string, unknown>;
}

export interface EventListResult {
  events: EventDetails[];
  meta: {
    fetchedAt: string;
    total?: number;
  };
}

export interface ListEventsOptions {
  name?: string;
  limit?: number;
  dev?: boolean;
  port?: number;
}

export interface EventRun {
  runId: string;
  status: string;
  functionId: string;
  functionVersion?: string;
  startedAt?: string;
  endedAt?: string;
  output?: unknown;
}

interface EventPayload {
  name: string;
  data: Record<string, unknown>;
  id?: string;
  user?: Record<string, unknown>;
}

interface SendEventResponse {
  ids: string[];
  status: number;
}

interface GetEventResponse {
  data?: EventDetails;
  // Dev server returns event directly without wrapper
  id?: string;
  name?: string;
  received_at?: string;
}

interface RawEventRun {
  run_id?: string;
  runId?: string;
  status: string;
  function_id?: string;
  functionId?: string;
  function_version?: string;
  functionVersion?: string;
  started_at?: string;
  startedAt?: string;
  ended_at?: string;
  endedAt?: string;
  output?: unknown;
}

interface GetEventRunsResponse {
  data: RawEventRun[];
}

interface RawEvent {
  id: string;
  internal_id?: string;
  name: string;
  received_at?: string;
  receivedAt?: string;
  data?: Record<string, unknown>;
  user?: Record<string, unknown>;
  ts?: number;
}

interface ListEventsResponse {
  data: RawEvent[];
  metadata?: {
    fetched_at?: string;
  };
}

// Main exports
export async function sendEvent(options: SendEventOptions): Promise<EventResult> {
  const client = createClient({ dev: options.dev, port: options.port });

  // Dev server accepts any event key - use placeholder if not set
  const eventKey = options.dev
    ? (client.eventKey || "test")
    : validateEventKey(client.eventKey);

  const url = getEventGatewayUrl(eventKey, { dev: options.dev, port: options.port });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.env) {
    headers["x-inngest-env"] = options.env;
  }

  const payload: EventPayload = {
    name: options.name,
    data: options.data,
  };

  if (options.id) {
    payload.id = options.id;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send event (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as SendEventResponse;

  return {
    ids: result.ids || [],
    status: response.status,
  };
}

export async function getEvent(
  eventId: string,
  options: { dev?: boolean; port?: number } = {}
): Promise<EventDetails> {
  const client = createClient({ dev: options.dev, port: options.port });
  const response = await apiRequest<{ data: RawEvent }>(
    client,
    "GET",
    `/v1/events/${eventId}`
  );

  const raw = response.data;
  return {
    id: raw.id,
    name: raw.name,
    receivedAt: raw.received_at || raw.receivedAt || new Date(raw.ts || 0).toISOString(),
    data: raw.data,
    user: raw.user,
  };
}

export async function getEventRuns(
  eventId: string,
  options: { dev?: boolean; port?: number } = {}
): Promise<EventRun[]> {
  const client = createClient({ dev: options.dev, port: options.port });
  const response = await apiRequest<GetEventRunsResponse>(
    client,
    "GET",
    `/v1/events/${eventId}/runs`
  );
  return normalizeEventRuns(response.data || []);
}

export async function listEvents(options: ListEventsOptions = {}): Promise<EventListResult> {
  const client = createClient({ dev: options.dev, port: options.port });

  const params = new URLSearchParams();
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.name) params.set("name", options.name);

  const queryString = params.toString();
  const path = `/v1/events${queryString ? `?${queryString}` : ""}`;

  const response = await apiRequest<ListEventsResponse>(client, "GET", path);

  return {
    events: normalizeEventList(response.data || []),
    meta: {
      fetchedAt: response.metadata?.fetched_at || new Date().toISOString(),
      total: response.data?.length,
    },
  };
}

// Helpers
function normalizeEventList(raw: RawEvent[]): EventDetails[] {
  return raw.map((event) => ({
    id: event.id,
    name: event.name,
    receivedAt: event.received_at || event.receivedAt || new Date(event.ts || 0).toISOString(),
    data: event.data,
    user: event.user,
  }));
}

function normalizeEventRuns(raw: RawEventRun[]): EventRun[] {
  return raw.map((run) => ({
    runId: run.run_id || run.runId || "",
    status: run.status,
    functionId: run.function_id || run.functionId || "",
    functionVersion: run.function_version || run.functionVersion,
    startedAt: run.started_at || run.startedAt,
    endedAt: run.ended_at || run.endedAt,
    output: run.output,
  }));
}
