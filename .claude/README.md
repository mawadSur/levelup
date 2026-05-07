# Claude Code config for LevelUp AI Academy

This directory holds Claude Code skills and MCP server configuration scoped to this project.

## Layout

```
.claude/
  settings.json              committed; baseline MCP server declarations
  settings.local.json        gitignored; per-user overrides (your Supabase PAT goes here)
  settings.local.json.example template — copy and fill in
  skills/
    levelup-orchestrator/    skill that drives the autonomous build loop
```

`settings.local.json` overrides `settings.json`; `settings.json` overrides `~/.claude/settings.json`. Anything you put in the local file stays on your machine.

## Supabase MCP server

The Supabase MCP server gives Claude direct read access to a Supabase project: list tables, run SQL, inspect schema, fetch logs, generate TypeScript types. Useful when iterating on queries, debugging migrations, or asking "what's actually in production right now."

### One-time setup

1. **Create a personal access token.** https://supabase.com/dashboard/account/tokens → "Generate new token" → name it `claude-code-${hostname}`. Copy the `sbp_...` value.
2. **Find your project ref.** It's in the Supabase project URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`. Or in Project Settings → General → "Reference ID".
3. **Copy the example file:**
   ```bash
   cp .claude/settings.local.json.example .claude/settings.local.json
   ```
4. **Edit `.claude/settings.local.json`:** replace `YOUR_SUPABASE_PROJECT_REF` and `sbp_YOUR_PERSONAL_ACCESS_TOKEN_HERE` with the real values.
5. **Restart Claude Code** so the MCP server is picked up. Run `/mcp` to verify it shows `supabase: connected`.

### Read-only by default

Both `settings.json` and the example use `--read-only`. The MCP server will refuse mutating queries (INSERT/UPDATE/DELETE/DDL). To allow writes, remove that flag in `.claude/settings.local.json`. Recommended posture: keep read-only for day-to-day work, drop the flag only when you specifically need Claude to apply a migration or seed data.

### Project-scoped

The example pins the server to a single `--project-ref`. This means Claude can only see one project — safer than letting it browse your entire Supabase organization. Drop that flag if you want multi-project access.

### Tools the MCP server exposes (when connected)

- `list_tables`, `list_extensions`, `list_migrations`
- `execute_sql` (read-only when the flag is set)
- `apply_migration` (only without `--read-only`)
- `get_logs`, `get_advisors`
- `generate_typescript_types`
- `list_branches`, `create_branch`, `merge_branch` (Supabase branching)

Claude calls these as `mcp__supabase__<tool>`.

## Other MCP servers

Add more under `mcpServers`. Typical candidates:

- `playwright` for browser automation
- `github` for repo + PR/issue access (needs a GitHub PAT)
- `linear` for issue tracking

Each follows the same pattern: declare in `settings.json` if it's truly shared, or in `settings.local.json` if it carries personal credentials.

## Skills

The orchestrator skill at `skills/levelup-orchestrator/SKILL.md` is the "drive the build to completion" loop. Invoke with `/levelup-orchestrator` (or just say "continue building"). It reads `tasks.md`, dispatches specialist agents in parallel, verifies their work, updates state.
