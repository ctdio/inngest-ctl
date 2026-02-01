// Types
interface ClientConfig {
  baseUrl: string;
  signingKey?: string;
  eventKey?: string;
  dev?: boolean;
}

interface ClientOptions {
  dev?: boolean;
  port?: number;
}

interface ApiError {
  error: string;
  code?: string;
  status: number;
}

// Constants
const PROD_API_URL = "https://api.inngest.com";
const DEFAULT_DEV_PORT = 8288;
const EVENT_GATEWAY_URL = "https://inn.gs";

// Main exports
export function createClient(options: ClientOptions = {}): ClientConfig {
  const baseUrl = options.dev ? getDevUrl(options.port) : PROD_API_URL;
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  const eventKey = process.env.INNGEST_EVENT_KEY;

  return { baseUrl, signingKey, eventKey, dev: options.dev };
}

export function getEventGatewayUrl(eventKey: string, options: ClientOptions = {}): string {
  if (options.dev) {
    return `${getDevUrl(options.port)}/e/${eventKey}`;
  }
  return `${EVENT_GATEWAY_URL}/e/${eventKey}`;
}

// Helpers
function getDevUrl(port?: number): string {
  // Check environment variable first, then flag, then default
  const envUrl = process.env.INNGEST_DEV_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, ""); // Remove trailing slash
  }
  const actualPort = port ?? DEFAULT_DEV_PORT;
  return `http://localhost:${actualPort}`;
}

export async function apiRequest<T>(
  client: ClientConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${client.baseUrl}${path}`;

  if (!client.dev && !client.signingKey) {
    throw new Error(
      "INNGEST_SIGNING_KEY environment variable is required for API requests"
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (client.signingKey) {
    headers.Authorization = `Bearer ${client.signingKey}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage: string;
    try {
      const parsed = JSON.parse(errorBody) as ApiError;
      errorMessage = parsed.error || errorBody;
    } catch {
      errorMessage = errorBody;
    }
    throw new Error(`API request failed (${response.status}): ${errorMessage}`);
  }

  return response.json() as Promise<T>;
}

export function validateEventKey(eventKey?: string): string {
  if (!eventKey) {
    throw new Error(
      "INNGEST_EVENT_KEY environment variable is required for sending events"
    );
  }
  return eventKey;
}

export function validateSigningKey(signingKey?: string): string {
  if (!signingKey) {
    throw new Error(
      "INNGEST_SIGNING_KEY environment variable is required for API requests"
    );
  }
  return signingKey;
}
