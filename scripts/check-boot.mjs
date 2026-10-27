#!/usr/bin/env node
// Checks that every web experience actually starts, not just that its page answers.
//
// A Landbot share URL answers 200 even when the bot never boots, so check-links alone
// cannot catch a broken bot. This opens each one in headless Chrome and waits for the
// bot's first message to be drawn. It only looks: it never answers, so no conversation
// goes past the greeting.
//
//   node scripts/check-boot.mjs            every web experience in catalog.json
//   node scripts/check-boot.mjs 01 05      only these ids
//
// Needs Node 22+ and Google Chrome (or CHROME=/path/to/chrome). Exits 1 if any bot fails.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 30000;
const CHROME =
  process.env.CHROME ||
  ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);

const only = process.argv.slice(2);
const catalog = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
const targets = catalog.experiences.flatMap((e) =>
  e.channel !== "web" || (only.length && !only.includes(e.id))
    ? []
    : [[e.id, e.live_url], ...Object.entries(e.alt_urls || {}).map(([lang, url]) => [`${e.id}-${lang}`, url])]
);

if (!CHROME) {
  console.error("no Chrome found: set CHROME=/path/to/chrome");
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), "check-boot-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=390,844", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function devtoolsPort() {
  const file = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100; i++) {
    if (existsSync(file)) return readFileSync(file, "utf8").split("\n")[0];
    await sleep(100);
  }
  throw new Error("Chrome did not start");
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  return new Promise((resolve) => (ws.onopen = () => resolve({ send, close: () => ws.close() })));
}

// What the first bot message should say, from the published config.
async function expectedGreeting(url) {
  const cfg = await (await fetch(url.replace(/index\.html$/, "index.json"))).json();
  const text = (cfg.welcome || []).map((w) => w.message || "").join(" ").trim();
  return text.replace(/\s+/g, " ").slice(0, 25);
}

async function check(page, url) {
  const greeting = await expectedGreeting(url).catch(() => "");
  await page.send("Page.navigate", { url });
  const started = Date.now();
  while (Date.now() - started < TIMEOUT_MS) {
    await sleep(1000);
    const { result } = await page.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const msgs = document.querySelectorAll('[data-lb-part="message"]').length;
        const text = (document.body && document.body.textContent || '').replace(/\\s+/g, ' ');
        return { msgs, greeted: ${JSON.stringify(greeting)} ? text.includes(${JSON.stringify(greeting)}) : msgs > 0 };
      })()`,
    });
    const v = result?.result?.value;
    if (v && v.msgs > 0 && v.greeted) return { ok: true, secs: ((Date.now() - started) / 1000).toFixed(0) };
  }
  return { ok: false, secs: String(TIMEOUT_MS / 1000) };
}

let failed = 0;
try {
  const port = await devtoolsPort();
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const page = await cdp(tab.webSocketDebuggerUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  for (const [id, url] of targets) {
    const r = await check(page, url);
    if (!r.ok) failed++;
    console.log(`${r.ok ? "starts" : "BROKEN"}  ${id.padEnd(6)} ${r.ok ? `greeted in ${r.secs}s` : `no greeting after ${r.secs}s`}  ${url}`);
  }
  page.close();
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
