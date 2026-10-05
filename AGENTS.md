# AGENTS.md

You are reading the Landbot Experience Library: 24 conversational experiences
(20 web chats built on Landbot, 4 voice agents) that show what a conversation can
look like when it does not have to look like a chatbot. Every brand is invented.

This file is the entry point. Read it whole before doing anything else.

## What is here

| Path | What it holds |
|---|---|
| `catalog.json` | The single source of truth: one entry per experience (id, slug, category, channel, brand, live URL, export status) |
| `experiences/<slug>/` | Everything needed to rebuild one experience (once exported, see below) |
| `scripts/check-links` | Checks every live URL in the catalog answers 200 |

## What you can do with it

- **Recommend an experience for a use case.** Filter `catalog.json` by `category`
  (`lead-capture`, `sales`, `commerce`, `support`, `engagement`) and `channel`
  (`web`, `voice`). Give the `live_url` so the person can try it.
- **Explain how an experience works.** Read `experiences/<slug>/README.md`.
- **Replicate an experience in someone's own Landbot account.** Only possible when
  the entry's `export` flags are all `true`. Replication uses the Landbot plugin
  for Claude (`landbot-flows` skill) with **the person's own API token**. That
  account must have the Bots API enabled.

## Export status

Each entry carries `export: {flow, ai_agents, channel_css, assets}`. A Landbot bot
is stored in three separate places, and all of them are needed to rebuild it:

1. **flow**: the diagram (blocks and connections)
2. **ai_agents**: AI agent blocks. They live in a separate API and are not part of
   the diagram, so a flow-only export rebuilds a bot with empty agents.
3. **channel_css / channel_js**: the visual style, applied at channel level
4. **assets**: images and media the flow references

If any flag is `false`, say plainly that this experience can be tried live but
not rebuilt from this repo yet. Do not reconstruct it from screenshots or guess
its flow.

Voice experiences (21–24) run on ElevenLabs, not Landbot. Their `platform` field
says so.

## Rules

- Never ask anyone to paste a Landbot token into a conversation, an issue or a file.
- This repo is public. Nothing that identifies a real customer, and no secret,
  webhook URL or integration key, belongs in it. Exports are scrubbed to
  placeholders like `{{WEBHOOK_URL}}` before they are committed.
