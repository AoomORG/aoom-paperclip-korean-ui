import assert from "node:assert/strict";
import { normalizeAgentUrlKey, deriveAgentUrlKey, isUuidLike } from "./agent-url-key-patch.test.js";

console.log("Running Agent URL Key Regression & Unicode Patch Tests...");

// 1. Existing ASCII compatibility tests (Must match legacy Paperclip 100%)
assert.equal(normalizeAgentUrlKey("studio-ops"), "studio-ops");
assert.equal(normalizeAgentUrlKey("  Studio Ops  "), "studio-ops");
assert.equal(normalizeAgentUrlKey("Product Manager 2"), "product-manager-2");
assert.equal(normalizeAgentUrlKey("Agent_123!"), "agent-123");
assert.equal(normalizeAgentUrlKey("---leading-trailing---"), "leading-trailing");
assert.equal(normalizeAgentUrlKey(""), null);
assert.equal(normalizeAgentUrlKey(null), null);
assert.equal(deriveAgentUrlKey(null, "fallback-id"), "fallback-id");
console.log("✓ Test 1: Existing ASCII names 100% backward compatible");

// 2. Unicode Korean 23-Agent uniqueness test
const names = [
    "A오시영DEF", "A박기획DEF", "A최명세DEF", "A이개발DEF", "A이웹디DEF", "A안개발DEF", "A안앱디DEF", "A배결제DEF", "A김위키DEF",
    "A조운영AOO", "A나개발AOO", "A유아이AOO", "A한기반AOO", "A문정책AOO", "A검수진AOO", "A오교육AOO", "A정인사AOO", "A김위키AOO",
    "A노철수HQ", "A한지식HQ", "A장재무HQ", "A나회고HQ", "A김위키HQ"
];

const slugs = names.map(n => normalizeAgentUrlKey(n));
console.log("Sample generated slugs:");
for (let i = 0; i < 5; i++) {
    console.log(`  ${names[i]} -> ${slugs[i]}`);
}

// Ensure all 23 slugs are unique
const uniqueSet = new Set(slugs);
assert.equal(uniqueSet.size, names.length, "All 23 agent slugs must be completely unique");
console.log(`✓ Test 2: All ${names.length} Korean agent names generated unique slugs (23/23)`);

// 3. Company-specific collision test
const defSlugs = names.filter(n => n.endsWith("DEF")).map(n => normalizeAgentUrlKey(n));
assert.equal(new Set(defSlugs).size, defSlugs.length, "DEF company slugs must have 0 collisions");

const aooSlugs = names.filter(n => n.endsWith("AOO")).map(n => normalizeAgentUrlKey(n));
assert.equal(new Set(aooSlugs).size, aooSlugs.length, "AOO company slugs must have 0 collisions");

const hqSlugs = names.filter(n => n.endsWith("HQ")).map(n => normalizeAgentUrlKey(n));
assert.equal(new Set(hqSlugs).size, hqSlugs.length, "HQ company slugs must have 0 collisions");
console.log("✓ Test 3: DEF (9), AOO (9), HQ (5) intra-company collisions are 0");

// 4. URL safety test (Must conform to ^[a-z0-9-]+$)
for (const slug of slugs) {
    assert(/^[a-z0-9-]+$/.test(slug), `Slug '${slug}' must be strictly URI safe`);
    assert(!slug.startsWith("-") && !slug.endsWith("-"), "No leading or trailing hyphens");
}
console.log("✓ Test 4: All slugs conform to strict URI-safe regex ^[a-z0-9-]+$");

// 5. Determinism test
for (const name of names) {
    assert.equal(normalizeAgentUrlKey(name), normalizeAgentUrlKey(name), "Slug must be deterministic");
}
console.log("✓ Test 5: Determinism verified");

console.log("All 5 test suites passed successfully!");
