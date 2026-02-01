# inngest-ctl

Command-line interface for Inngest events and runs.

## Setup

```bash
# Via bunx (no install needed)
bunx @ctdio/inngest-ctl <command>

# Or create an alias
alias inngest-ctl="bunx @ctdio/inngest-ctl"
```

### Environment Variables

```bash
export INNGEST_EVENT_KEY="your-event-key"      # Required for sending events
export INNGEST_SIGNING_KEY="your-signing-key"  # Required for API queries
```

## Usage

```
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
  --help, -h        Show help
  --version, -v     Show version
```

## Events

```
inngest-ctl events <subcommand> [options]

Subcommands:
  list    List recent events
  send    Send an event
  get     Get event details
  runs    List runs triggered by an event

List Options:
  --name <name>     Filter by event name
  --limit <n>       Max events to return

Send Options:
  --name <name>     Event name (required)
  --data <json>     Event data as JSON (required)
  --id <id>         Deduplication ID
  --env <env>       Branch environment name
```

**Examples:**
```bash
inngest-ctl events list --pretty
inngest-ctl events list --name "user.signup" --limit 10 --pretty
inngest-ctl events send --name "user.signup" --data '{"userId": "123"}'
inngest-ctl events get 01H08W4TMBNKMEWFD0TYC532GG --pretty
inngest-ctl events runs 01H08W4TMBNKMEWFD0TYC532GG --pretty
```

## Runs

```
inngest-ctl runs <subcommand> [options]

Subcommands:
  status  Get run status and duration
  get     Get run details (jobs/steps)
  list    List runs for an event

List Options:
  --event <id>    Event ID to list runs for
```

**Examples:**
```bash
inngest-ctl runs status 01H08W5TMBNKMEWFD0TYC532GH --pretty
inngest-ctl runs get 01H08W5TMBNKMEWFD0TYC532GH --pretty
inngest-ctl runs list --event 01H08W4TMBNKMEWFD0TYC532GG
```

## Cancel

```
inngest-ctl cancel --app <app> --function <fn> --started-after <time> --started-before <time> [--if <expr>]
```

**Example:**
```bash
inngest-ctl cancel --app my-app --function my-func --started-after 1h --started-before now
```

## Dev Server

Use `--dev` flag to target local Inngest dev server:

```bash
# Start Inngest dev server
npx inngest-cli@latest dev

# Query local events
inngest-ctl events list --dev --pretty

# Send event to local
inngest-ctl events send --name "test.event" --data '{}' --dev
```

Override URL with `INNGEST_DEV_URL`:
```bash
export INNGEST_DEV_URL="http://localhost:9000"
```

## License

MIT
