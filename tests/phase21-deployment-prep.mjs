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

async function collectHtmlFiles(dir = projectRoot) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (![".git", "node_modules"].includes(entry.name)) {
        files.push(...await collectHtmlFiles(fullPath));
      }
    } else if (entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const requiredPath of [
  ".nojekyll",
  "404.html",
  "index.html",
  "login.html",
  "reset-password.html",
  "docs/phase-21-free-deployment.md"
]) {
  assert(await exists(requiredPath), `${requiredPath} should exist for free deployment.`);
}

const nojekyll = await read(".nojekyll");
assert(nojekyll.includes("GitHub Pages"), ".nojekyll should explain why it exists.");

const fallback = await read("404.html");
assert(fallback.includes("Educational Demo - No Real Money or Financial Transactions"), "404 page should preserve the educational disclaimer.");
assert(fallback.includes('href="./index.html"'), "404 page should link back to the home page.");
assert(fallback.includes('href="./login.html"'), "404 page should link to login.");

const envExample = await read(".env.example");
for (const requiredText of [
  "NEXAPAY_PRODUCTION_SITE_URL=https://YOUR-USERNAME.github.io/nexapay/",
  "NEXAPAY_PRODUCTION_RESET_REDIRECT_URL=https://YOUR-USERNAME.github.io/nexapay/reset-password.html",
  "NEXAPAY_PRODUCTION_LOGIN_URL=https://YOUR-USERNAME.github.io/nexapay/login.html"
]) {
  assert(envExample.includes(requiredText), `.env.example should include ${requiredText}.`);
}

const deploymentGuide = await read("docs/phase-21-free-deployment.md");
for (const requiredText of [
  "GitHub Pages",
  "Cloudflare Pages Alternative",
  "Authentication",
  "URL Configuration",
  "https://YOUR-USERNAME.github.io/nexapay/reset-password.html",
  "SUPABASE_ANON_KEY",
  "Do not paste the service-role key.",
  "Build output directory"
]) {
  assert(deploymentGuide.includes(requiredText), `Deployment guide should include ${requiredText}.`);
}

const readme = await read("README.md");
assert(readme.includes("Phase 21"), "README should link to Phase 21 deployment docs.");
assert(readme.includes("GitHub Pages"), "README should include GitHub Pages deployment guidance.");

const htmlFiles = await collectHtmlFiles();
for (const htmlPath of htmlFiles) {
  const relativeHtmlPath = path.relative(projectRoot, htmlPath).replaceAll("\\", "/");
  const html = await readFile(htmlPath, "utf8");

  assert(html.includes('name="viewport"'), `${relativeHtmlPath} should include responsive viewport metadata.`);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (url.startsWith("http") || url.startsWith("#")) continue;
    assert(!url.startsWith("/"), `${relativeHtmlPath} should use relative asset/page paths for project GitHub Pages: ${url}`);
  }
}

const config = await read("js/config/supabase.js");
assert(!config.toLowerCase().includes("service_role"), "Frontend config should not contain service-role keys for deployment.");
assert(!/DATABASE_URL\s*=/.test(config), "Frontend config should not contain database URLs.");

console.log("Phase 21 deployment test passed: static hosting files, deployment docs, Supabase production guidance, and GitHub Pages readiness are correct.");
