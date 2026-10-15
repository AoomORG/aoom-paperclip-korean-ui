import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire("/home/aoom/upstream/paperclip-2026.831.1/node_modules/.pnpm/jsdom@30.0.1_@noble+hashes@2.3.0/node_modules/jsdom/package.json");
const { JSDOM } = require("jsdom");
const bundle = readFileSync(new URL("../dist/ui/index.js", import.meta.url), "utf8");
const core = execFileSync("git", ["-C", "/home/aoom/projects/paperclip-instructions-react-20260911", "show", "17e867:ui/src/pages/AgentDetail.tsx"], { encoding: "utf8" });
function fixture() {
  const dom = new JSDOM('<button id="chrome">New Task</button><div id="native" data-paperclip-instructions-react="true"><button title="New Task">New Task</button><div contenteditable="false">New Task</div><textarea>original</textarea></div>', {
    url: "https://fixture.invalid/agents/a/instructions", runScripts: "outside-only",
  });
  // React toolbar hooks are not invoked: evaluate the generated overlay code, not source copies.
  const runnable = bundle.replace(/^import .* from "react";\n/gm, "").replaceAll("export function", "function");
  dom.window.eval(runnable + "\nwindow.audit = { startOverlay, setUiLanguage, enhanceInstructionsPanel, mountInstructionsPanels, stop: () => observer?.disconnect() };");
  return dom;
}
test("generated bundle honors core 17e867 marker and keeps native editor unchanged", () => {
  assert.match(core, /data-paperclip-instructions-react="true"/);
  assert.match(bundle, /\[data-paperclip-instructions-react\]/);
  const dom = fixture();
  try {
    const { document, audit } = dom.window;
    const native = document.querySelector("#native");
    const original = native.outerHTML;
    audit.enhanceInstructionsPanel(native, "ko");
    audit.mountInstructionsPanels(document.body, "ko");
    assert.equal(native.outerHTML, original);
    audit.startOverlay();
    assert.equal(document.querySelector("#chrome").textContent, "새 작업");
    assert.equal(native.outerHTML, original);
    audit.setUiLanguage("en");
    assert.equal(document.documentElement.lang, "en");
    assert.equal(document.querySelector("#chrome").textContent, "New Task");
    assert.equal(native.outerHTML, original);
    audit.setUiLanguage("ko");
    assert.equal(document.documentElement.lang, "ko");
    assert.equal(native.outerHTML, original);
  } finally { dom.window.audit.stop(); dom.window.close(); }
});
test("generated MutationObserver skips later React content while translating outside chrome", async () => {
  const dom = fixture();
  try {
    const { document, audit } = dom.window;
    audit.startOverlay();
    const native = document.querySelector("#native");
    const inside = document.createElement("span");
    inside.append(document.createTextNode("New Task"));
    native.append(inside);
    const outside = document.createElement("button");
    outside.append(document.createTextNode("New Task"));
    document.body.append(outside);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(inside.textContent, "New Task");
    assert.equal(outside.textContent, "새 작업");
    assert.equal(native.querySelectorAll("textarea").length, 1);
    assert.equal(native.querySelector("textarea").value, "original");
    assert.equal(native.querySelector("[contenteditable]").getAttribute("contenteditable"), "false");
  } finally { dom.window.audit.stop(); dom.window.close(); }
});
