import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

async function exists(relativePath) {
  try {
    await read(relativePath);
    return true;
  } catch {
    return false;
  }
}

async function collectEntries(dir = projectRoot) {
  const entries = await readdir(dir, { withFileTypes: true });
  const rows = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(projectRoot, fullPath).replaceAll("\\", "/");

    if (entry.isDirectory()) {
      if (![".git", "node_modules"].includes(entry.name)) {
        rows.push({ type: "dir", relativePath });
        rows.push(...await collectEntries(fullPath));
      }
    } else {
      rows.push({ type: "file", relativePath });
    }
  }

  return rows;
}

for (const requiredFile of [
  ".env.example",
  ".gitattributes",
  ".gitignore",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "docs/phase-20-github-upload-preparation.md"
]) {
  assert(await exists(requiredFile), `${requiredFile} should exist for GitHub upload preparation.`);
}

const gitignore = await read(".gitignore");
for (const requiredRule of [
  ".env",
  ".env.*",
  "!.env.example",
  "node_modules/",
  "dist/",
  "build/",
  ".wrangler/",
  "coverage/",
  "supabase/.temp/"
]) {
  assert(gitignore.includes(requiredRule), `.gitignore should include ${requiredRule}.`);
}

const envExample = await read(".env.example");
assert(envExample.includes("SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co"), ".env.example should contain a placeholder Supabase URL.");
assert(envExample.includes("SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY"), ".env.example should contain a placeholder anon key.");
assert(envExample.includes("# SUPABASE_SERVICE_ROLE_KEY="), ".env.example should warn against service-role keys without enabling one.");
assert(envExample.includes("# DATABASE_URL="), ".env.example should warn against database URLs without enabling one.");

const config = await read("js/config/supabase.js");
assert(config.includes("YOUR-PROJECT-REF"), "Frontend Supabase config should remain placeholder-safe for GitHub.");
assert(config.includes("YOUR_PUBLIC_ANON_KEY"), "Frontend Supabase config should not include a real anon key by default.");
assert(!config.toLowerCase().includes("service_role"), "Frontend config should not contain a Supabase service-role key.");
assert(!/sk-[A-Za-z0-9]/.test(config), "Frontend config should not contain secret API keys.");

const readme = await read("README.md");
for (const requiredText of [
  "Educational Demo - No Real Money or Financial Transactions",
  "GitHub Upload",
  "Testing",
  "SECURITY.md",
  "phase-20-github-upload-preparation.md",
  "git push -u origin main"
]) {
  assert(readme.includes(requiredText), `README should include ${requiredText}.`);
}

const license = await read("LICENSE");
assert(license.startsWith("MIT License"), "LICENSE should use MIT license text.");

const security = await read("SECURITY.md");
assert(security.includes("educational financial-service simulator"), "SECURITY.md should explain the educational demo boundary.");
assert(security.includes("Never commit a Supabase service-role key."), "SECURITY.md should warn against service-role keys.");

const guide = await read("docs/phase-20-github-upload-preparation.md");
for (const requiredText of [
  "Secret Scan Command",
  "Upload To A New GitHub Repository",
  "Update An Existing GitHub Repository",
  "GitHub Pages Setup",
  "Completion Checklist"
]) {
  assert(guide.includes(requiredText), `Phase 20 guide should include ${requiredText}.`);
}

const entries = await collectEntries();
const forbiddenFiles = entries
  .filter((entry) => entry.type === "file")
  .map((entry) => entry.relativePath)
  .filter((relativePath) => [".env", ".env.local", ".env.production"].includes(relativePath));
assert(forbiddenFiles.length === 0, `Local env files should not be present: ${forbiddenFiles.join(", ")}`);

const forbiddenDirs = entries
  .filter((entry) => entry.type === "dir")
  .map((entry) => entry.relativePath)
  .filter((relativePath) => ["node_modules", "dist", "build", "coverage", "playwright-report", "test-results"].includes(relativePath));
assert(forbiddenDirs.length === 0, `Generated folders should not be present: ${forbiddenDirs.join(", ")}`);

console.log("Phase 20 smoke test passed: GitHub hygiene files, README links, upload docs, placeholders, and secret safeguards are ready.");
