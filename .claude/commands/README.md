# thunderbot

Reusable Claude Code skills for development workflows.

## Usage

### With git subtree (recommended for contributors)

```bash
# Add to your project
git subtree add --prefix=.claude/commands git@github.com:user/thunderbot.git main --squash

# Pull upstream changes
git subtree pull --prefix=.claude/commands git@github.com:user/thunderbot.git main --squash

# Push local changes back
git subtree push --prefix=.claude/commands git@github.com:user/thunderbot.git main
```

### Manual install

Copy individual skills from `skills/` into your project's `.claude/commands/` directory.

## Skills

| Skill | Description |
|-------|-------------|
| `thunderbot` | Autonomous coding agent for Linear tasks |
| `thunderbot-daemon` | Background daemon that polls Linear for tasks |
| `thundercheck` | Run type-checking, linting, and format-checking |
| `thunderclean` | Remove build artifacts |
| `thunderdoctor` | Verify dev tools and environment |
| `thunderdown` | Stop docker containers |
| `thunderfeedback` | Submit feedback as GitHub issues |
| `thunderfix` | Fix PR issues and monitor until clean |
| `thunderimprove` | Review changed code for quality |
| `thunderin` | Enter a work context (worktree, deps, bootstrap) |
| `thunderout` | Leave worktree and return to main |
| `thunderpush` | Stage, commit, and push changes |
| `thunderup` | Bootstrap the dev environment |
