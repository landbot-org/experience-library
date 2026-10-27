# AGENTS.md

You are reading the Landbot Experience Library: conversational experiences
(web chats built on Landbot, and voice agents) that show what a conversation can
look like when it does not have to look like a chatbot. Every brand is invented.

This file is the entry point. Read it whole before doing anything else.

## What is here

| Path | What it holds |
|---|---|
| `catalog.json` | The single source of truth: one entry per experience (id, slug, category, channel, brand, live URL, export status) |
| `experiences/<slug>/README.md` | What the experience shows, how it opens, what is in its folder and its export status |
| `experiences/<slug>/RECIPE.md` | Where one exists: how to build the experience with the Landbot plugin. The way to replicate |
| `experiences/<slug>/preview.jpg` | Screenshot of the live experience at phone width |
| `experiences/<slug>/channel/` | Web chats only: the published Custom CSS (`style.css`), Custom JS (`custom.js`), design settings and welcome message (`config.json`), and media (`assets/`) |
| `scripts/pull-public` | Refreshes every `channel/` from its live share URL |
| `scripts/build-readmes` | Regenerates the experience READMEs and the README tables from `catalog.json` |
| `scripts/check-links` | Checks that every live URL in the catalog answers |
| `scripts/check-boot.mjs` | Opens every web bot in headless Chrome and checks it actually starts |

## What you can do with it

- **Recommend an experience for a use case.** Filter `catalog.json` by `category`
  (`lead-capture`, `sales`, `commerce`, `support`, `engagement`) and `channel`
  (`web`, `voice`). Give the `live_url` so the person can try it.
- **Explain how an experience works.** Read `experiences/<slug>/README.md`, look at
  `preview.jpg`, and for how the look is achieved read `channel/style.css` and
  `channel/custom.js`. The header comments in those files describe what each one
  does.
- **Replicate an experience in someone's own Landbot account.** Only from its
  `RECIPE.md`, only when that recipe has no section marked **PENDING**, and only
  with the Landbot plugin installed (see below). An experience without a recipe
  can be tried live, not replicated.

## Build with the plugin's components, not the demo's scripts

The live demos carry Custom CSS and Custom JS written by hand for each demo.
Where they are in this repo (`channel/`), they are reference for how a look was
achieved, not something to install. When you build:

- the flow comes from the recipe, built with `landbot-flows`;
- the look comes from `landbot-style`, using the plugin's ready-made modules
  (`messaging`, `steps`) with only their `CONFIG` values changed;
- never paste a demo's `custom.js` or `style.css` into someone's channel, and do
  not push one as a `--custom` script.

If the recipe asks for something no plugin component does, say so and stop at
that step; do not fill the gap with demo code.

## Replicating requires the Landbot plugin

Recommending and explaining need nothing beyond this repo. Building anything in
Landbot does: you need the Landbot plugin
([landbot-org/landbot-ai-skills](https://github.com/landbot-org/landbot-ai-skills)),
whose `landbot-flows` skill creates the bot, wires the flow and sets up its AI
agents, and whose `landbot-style` skill applies the channel CSS.

Before replicating, check the plugin is available to you. If it is not, stop and
tell the person to install it, then come back:

- Claude Code: `claude plugin marketplace add landbot-org/landbot-ai-skills`, then
  `claude plugin install landbot@landbot-skills`
- Claude desktop app: Customize › Plugins › Add marketplace ›
  `landbot-org/landbot-ai-skills` › install **landbot**
- Codex: `codex plugin marketplace add landbot-org/landbot-ai-skills`, then
  `codex plugin add landbot@landbot-skills`
- Cursor: `git clone https://github.com/landbot-org/landbot-ai-skills`, then
  `landbot-ai-skills/scripts/install.sh cursor`

The plugin acts with **the person's own API token**, in their own account, and
that account must have the Bots API enabled. Token setup is the plugin's job:
follow its instructions. Do not build a bot by calling the Landbot API yourself
without it. Guided setup: https://landbot.io/skills

## Export status

Each entry carries `export: {flow, ai_agents, channel_css, channel_js, assets}`. A Landbot bot
is stored in several separate places, and all of them are needed to rebuild it:

- **flow**: the diagram (blocks and connections)
- **ai_agents**: AI agent blocks. They live in a separate API and are not part of
  the diagram, so a flow-only export rebuilds a bot with empty agents.
- **channel_css / channel_js**: the visual style, applied at channel level
- **assets**: images and media the flow references

Today no experience has `flow` or `ai_agents`: the bots live in a Landbot account
this repo cannot read. Recipes are how experiences become buildable instead.

An entry with a `hold` field has known issues in its live demo; its `channel/`
is deliberately left out until the fixed version is ready. Say so if asked
about its look.

Do not reconstruct an experience from its screenshot or guess its flow. Custom
JS needs the Custom Code feature on the person's account; without it the flow
works and the chat looks plain.

Voice experiences (`"channel": "voice"`) run on ElevenLabs, not Landbot. Their `platform` field
says so.

## Rules

- Never ask anyone to paste a Landbot token into a conversation, an issue or a file.
- This repo is public. Nothing that identifies a real customer, and no secret,
  webhook URL or integration key, belongs in it. `scripts/pull-public` stops when
  it finds something that looks like one.
- Do not edit the experience READMEs or the README tables by hand: change
  `catalog.json` and run `scripts/build-readmes`.
