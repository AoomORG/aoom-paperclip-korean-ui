import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Load instructions catalog
const catalog = JSON.parse(readFileSync("locales/instructions.ko.json", "utf8"));
globalThis.instructionsCatalog = catalog;

import { translateInstructions } from "../src/ui/instructions.js";

console.log("Starting instructions unit tests...");

// Test 1: Code blocks & Inline code preservation
const sampleCode = `# Role and Responsibilities
Here is a sample command:
\`\`\`bash
git checkout -b codex/roster
export FOO_BAR=1
curl -sS https://example.com/api
\`\`\`
Please check \`AGENTS.md\` at /home/aoom/projects/definish/AGENTS.md.
`;

const translated1 = translateInstructions(sampleCode, "ko");
assert(translated1.includes("# 역할 및 책임"), "Heading translated");
assert(translated1.includes("git checkout -b codex/roster"), "Code block preserved exactly");
assert(translated1.includes("export FOO_BAR=1"), "Code block env preserved");
assert(translated1.includes("`AGENTS.md`"), "Inline code preserved");
assert(translated1.includes("/home/aoom/projects/definish/AGENTS.md"), "Path preserved");
assert(translated1.includes("https://example.com/api"), "URL preserved");
console.log("✓ Test 1: Code blocks, inline code, paths, URLs preserved");

// Test 2: Bold labels and headings
const sampleLabels = `## 🎯 Your Core Mission
- **Role**: Autonomous workflow pipeline manager
- **Personality**: Systematic, quality-focused
- **Status**: active
`;
const translated2 = translateInstructions(sampleLabels, "ko");
assert(translated2.includes("## 🎯 핵심 임무"), "Emoji heading translated");
assert(translated2.includes("- **역할**:"), "Bold label Role translated");
assert(translated2.includes("- **성격**:"), "Bold label Personality translated");
assert(translated2.includes("- **상태**:"), "Bold label Status translated");
console.log("✓ Test 2: Headings and bold labels translated");

// Test 3: Reverse translation (KO -> EN) does NOT overwrite or corrupt
const sampleKo = `# 역할 및 책임
- **역할**: 실행 총괄
`;
const translated3 = translateInstructions(sampleKo, "en");
assert(translated3.includes("# Role and Responsibilities"), "Reverse heading translated");
assert(!translated3.includes("[미번역]"), "No false [미번역] in EN mode");
console.log("✓ Test 3: Reverse translation works and does not corrupt");

// Test 4: Untranslated English indicator
const sampleUntranslated = `Some completely unmapped English sentence that exceeds twenty characters.`;
const translated4 = translateInstructions(sampleUntranslated, "ko");
assert(translated4.includes("[미번역]"), "Untranslated text properly tagged");
console.log("✓ Test 4: Untranslated English text properly tagged");

// Test 5: Cache consistency and invalidation
const tA1 = translateInstructions("## Operational Guidelines", "ko");
const tA2 = translateInstructions("## Operational Guidelines", "ko");
assert.equal(tA1, tA2, "Cache returns identical result");
const tB = translateInstructions("## Operational Guidelines Modified", "ko");
assert.notEqual(tA1, tB, "Different input generates different output");
console.log("✓ Test 5: Cache consistency and hash invalidation verified");

console.log("All 5 tests passed successfully!");
