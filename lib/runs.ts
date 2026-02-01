import { createClient, apiRequest } from "./client";

// Types
export interface RunJob {
  jobId: string;
  stepId: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  output?: unknown;
  error?: string;
}

export interface RunStatus {
  runId: string;
  status: string;
  functionId: string;
  functionVersion?: number;
  eventId?: string;
  startedAt?: string;
  endedAt?: string;
  output?: unknown;
}

interface RawRun {
  run_id: string;
  status: string;
  function_id: string;
  function_version?: number;
  event_id?: string;
  run_started_at?: string;
  ended_at?: string;
  output?: unknown;
}

interface GetRunResponse {
  data: RawRun;
}

interface RawJob {
  job_id?: string;
  jobId?: string;
  step_id?: string;
  stepId?: string;
  status: string;
  started_at?: string;
  startedAt?: string;
  ended_at?: string;
  endedAt?: string;
  output?: unknown;
  error?: string;
}

interface GetRunJobsResponse {
  data: RawJob[];
}

// Main exports
export async function getRun(
  runId: string,
  options: { dev?: boolean; port?: number } = {}
): Promise<RunStatus> {
  const client = createClient({ dev: options.dev, port: options.port });
  const response = await apiRequest<GetRunResponse>(
    client,
    "GET",
    `/v1/runs/${runId}`
  );

  const raw = response.data;
  if (!raw) {
    throw new Error(`Run not found: ${runId}`);
  }

  return {
    runId: raw.run_id,
    status: raw.status,
    functionId: raw.function_id,
    functionVersion: raw.function_version,
    eventId: raw.event_id,
    startedAt: raw.run_started_at,
    endedAt: raw.ended_at,
    output: raw.output,
  };
}

export async function getRunJobs(
  runId: string,
  options: { dev?: boolean; port?: number } = {}
): Promise<RunJob[]> {
  const client = createClient({ dev: options.dev, port: options.port });
  const response = await apiRequest<GetRunJobsResponse>(
    client,
    "GET",
    `/v1/runs/${runId}/jobs`
  );
  return normalizeJobs(response.data || []);
}

// Helpers
function normalizeJobs(raw: RawJob[]): RunJob[] {
  return raw.map((job) => ({
    jobId: job.job_id || job.jobId || "",
    stepId: job.step_id || job.stepId || "",
    status: job.status,
    startedAt: job.started_at || job.startedAt,
    endedAt: job.ended_at || job.endedAt,
    output: job.output,
    error: job.error,
  }));
}
