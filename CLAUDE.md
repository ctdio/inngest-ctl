# inngest-ctl

CLI tool for interacting with Inngest's REST API.

## Commands

```bash
bun install          # Install dependencies
bun run cli.ts       # Run CLI
bun run build        # Build standalone binary to dist/inngest-ctl
bun test             # Run all tests
bun test --watch     # Run tests in watch mode
```

## Environment Variables

- `INNGEST_EVENT_KEY` - Required for `events send` command (not needed with `--dev`)
- `INNGEST_SIGNING_KEY` - Required for all other API commands
- `INNGEST_DEV_URL` - Override dev server URL (default: http://localhost:8288)

## Architecture

```
cli.ts              # CLI entrypoint - command parsing, routing to handlers
lib/
  client.ts         # API client, auth, base URL handling
  events.ts         # Event send/get/list/runs operations
  runs.ts           # Run status/jobs queries
  cancel.ts         # Cancellation operations
  output.ts         # Output formatting (JSON, pretty tables with ANSI colors)
  test-utils.ts     # Mock server helpers for testing
```

**Data flow:** CLI parses args → creates API client → calls lib functions → formats output

## Key Patterns

- All lib functions take options object with `dev` and `port` fields
- API responses use snake_case, normalized to camelCase in lib functions
- `--pretty` flag enables color-coded human-readable output; default is JSON
- Type guards in `output.ts` determine which formatter to use

## API Endpoints

| Command | Endpoint | Auth |
|---------|----------|------|
| events list | GET `/v1/events` | Signing Key |
| events send | POST `inn.gs/e/:key` | Event Key (URL) |
| events get | GET `/v1/events/{id}` | Signing Key |
| events runs | GET `/v1/events/{id}/runs` | Signing Key |
| runs status | GET `/v1/runs/{id}` | Signing Key |
| runs get | GET `/v1/runs/{id}/jobs` | Signing Key |
| cancel | POST `/v1/cancellations` | Signing Key |

## Testing

Test files use Bun's test framework with mock HTTP servers.

```bash
bun test                    # Run all tests
bun test --watch            # Watch mode
bun test lib/events.test.ts # Specific file
```

**Test files:**
- `cli.test.ts` - CLI integration (argument parsing, command routing)
- `lib/events.test.ts` - Event functions (list, get, runs)
- `lib/runs.test.ts` - Run functions (status, jobs)
- `lib/output.test.ts` - Output formatting (pretty, JSON)

**Mock server pattern:**
```typescript
const server = createMockServer({
  routes: [
    { method: "GET", path: "/v1/events", response: mockEventsListResponse([...]) },
  ],
});
```

## Adding New Commands

1. Add types and API functions in appropriate `lib/*.ts` file
2. Add command handler in `cli.ts`
3. Update usage messages
4. Add type guard in `output.ts` if new result type needs pretty formatting
5. Add tests using mock server helpers from `test-utils.ts`

## Bun-Specific

- Use `bun` instead of `node`, `npm`, `ts-node`
- Use `Bun.write()` for file operations
- Bun auto-loads `.env` files
