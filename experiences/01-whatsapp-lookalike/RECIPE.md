# Recipe · 01 · WhatsApp lookalike (Wendra)

How to build this experience in your own Landbot account with your agent and the
Landbot plugin. Follow it top to bottom.

> **Status: draft. Do not build yet.** Every section marked **PENDING** is
> blocking. An agent that finds one must stop, tell the person this recipe is
> not ready, and offer the [live demo](https://landbot.pro/v3/H-3514728-BX6Q6HCOMGIG6RS3/index.html)
> instead.

## For whom

**PENDING: positioning.** The live demo and the gallery card describe two
different experiences, and the fixed version will settle which one this is:

| Source | Says it is |
|---|---|
| Live demo (Wendra) | Customer support in a messaging look: order status, book a call, something else |
| Gallery card 01 (Nortis) | A WhatsApp-style sales assistant that qualifies car buyers by budget and routes hot leads to a rep |

## What it achieves

**PENDING**, same reason as above.

What holds either way: a website visitor gets a conversation that looks and feels
like a messaging app (bubbles, ticks, times, a "Today" chip, reply buttons inside
the bubble that asked) instead of a form or a chatbot widget.

## Data it captures

**PENDING: confirm against the flow graph.** Seen in the live demo:

| Field | Asked as | Type |
|---|---|---|
| `name` | "What is your name?" | Text |
| Topic | Order status · Book a call · Something else | Buttons |
| Order number | "What is your order number?" (Order status branch) | Text |

## The flow

**PENDING: the flow graph from the library QA.** It replaces this section with
every screen, button, branch and ending. Seen so far, in the Order status branch
of the live demo:

| Step | The bot says | The visitor does | Next |
|---|---|---|---|
| 1 | "Hi, this is Wendra support. What is your name?" | Types a name | 2 |
| 2 | "Nice to meet you, @name. What can we help with?" | Order status · Book a call · Something else | Order status → 3 · others: PENDING |
| 3 | "Sure. What is your order number?" | Types the order number | 4 |
| 4 | "Thanks @name, order @order is on its way, expect it in 2 days" | — | End: PENDING (does it offer anything else?) |

## What to customize

Ask the person for these before building. Each has a default.

| What | Default | Where it goes |
|---|---|---|
| Brand name | Wendra | Header, greeting, every message that names the brand |
| Brand colour | Green, as in the preview | The look's CSS variables (`--lbm-*`) |
| Avatar | A letter on the brand colour | Channel design |
| Composer placeholder | "Type a message" | `messaging` module `CONFIG.placeholder` |
| Day chip | "Today" | `messaging` module `CONFIG.dayLabel` |
| Topics and their branches | As in the flow | The flow's buttons block |
| Language | English | Every text in the flow and the module CONFIG |

## Setup it will not work without

Two channel settings. Without them the chat runs but does not look like the
preview.

1. **Channel version 3.1.0 (the v4 web chat).** The look's CSS is written for v4
   and does nothing on an older chat. Set it with the plugin:
   `channel v4 --bot <bot_uuid>`.
2. **The loader in the channel's `head` field.** **PENDING: the loader itself**,
   which comes with the fixed version. The plugin (checked on v0.4.6) keeps the
   `head` field intact when it writes the channel but has no command to set it,
   so for now this is a manual step: the person pastes the loader into the
   channel's `head` field themselves. Tell them so; do not try to write it
   through the API by hand.

## How to build it

Build with the plugin's components. **Do not copy the demo's own Custom CSS or
Custom JS**: they are hand-made for the demo, and they are not in this repo on
purpose.

1. **Flow**: `landbot-flows` skill. Create the bot, place and wire the blocks
   from [The flow](#the-flow), test it, and publish only on the person's yes.
2. **Channel version**: `channel v4 --bot <bot_uuid>` (see above).
3. **Look**: `landbot-style` skill with the **`messaging`** module: append
   `modules/messaging.css` to the look's CSS, set its colour variables from the
   brand, and push `modules/messaging.js` changing only its `CONFIG` values.
4. **Loader**: the manual `head` step above.
5. **Check it**: `landbot-style`'s `verify-share` on the share URL, at phone and
   desktop width.

Tell the person, before they show it to anyone:

- The composer bar in the footer is **decorative**. Its mic and its plus button
  do nothing; the visitor answers with the reply buttons or the native input.
- Its look needs Custom JS, which Landbot serves only to accounts with the
  Custom Code feature. Without it the flow works and the chat looks plain.

## Known issues in the live demo

The fixed version is in progress. Until it passes the iPhone test, the live demo
has these, and a build from this recipe should not copy them:

- The mic and the menu do nothing.
- The keyboard is not handled on mobile.
- The loader takes about 5 seconds.
