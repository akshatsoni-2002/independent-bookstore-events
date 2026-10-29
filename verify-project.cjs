const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "style.css"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(duplicates.length === 0, `Duplicate HTML IDs: ${[...new Set(duplicates)].join(", ")}`);
assert(html.includes("No data found"), "Missing required empty-state text.");
assert(html.includes('id="connection-status"'), "Missing online/offline status region.");
assert(html.includes('id="loading-state"'), "Missing loading status region.");
assert(js.includes("[Analytics] User interacted with Independent Bookstore Events Page"), "Missing required analytics prefix.");
assert(js.includes("chapterCoCanManageEvents") && js.includes("window.chapterCoRenderEvents"), "Missing role-gated event management wiring.");
assert(js.includes("PBKDF2") && js.includes("crypto.subtle"), "Missing salted Web Crypto password hashing.");
assert(!js.includes("ChapterAdmin!2026"), "A default admin password must not be hardcoded.");
assert(!/localStorage\.setItem\(STORAGE\.staff, JSON\.stringify\(staffAccounts\)\)/.test(js) || js.includes("hash: derived.hash"), "Staff storage should use password hashes.");
assert(css.includes("--gray-900") && css.includes("--gray-0"), "Missing centralized grayscale design tokens.");
assert(sw.includes("2500") && sw.includes("cachedPage"), "Missing timed offline navigation fallback.");

if (failures.length) {
  console.error("Project verification failed:");
  failures.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log("Project structural checks passed. Browser, Lighthouse, network-condition, and security audits are still required separately.");
}
