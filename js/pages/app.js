import { icon } from "../components/icons.js";
import { money, dateTime, dateOnly, initials, txLabel, escapeHtml, percent } from "../utils/format.js";
import * as Auth from "../auth/auth-service.js";
import * as Wallet from "../services/wallet-service.js";
import * as SendMoney from "../services/send-money-service.js";
import * as RequestMoney from "../services/request-money-service.js";
import * as MerchantPayment from "../services/merchant-payment-service.js";
import * as Merchant from "../services/merchant-service.js";
import * as Agent from "../services/agent-service.js";
import * as Funding from "../services/funding-service.js";
import * as ServicePayment from "../services/service-payment-service.js";
import * as Savings from "../services/savings-service.js";
import * as Donation from "../services/donation-service.js";
import * as Transactions from "../services/transaction-service.js";
import * as Notifications from "../services/notification-service.js";
import * as Contacts from "../services/contact-service.js";
import * as Admin from "../services/admin-service.js";
import { getState } from "../services/storage.js";

const ROOT = window.NEXAPAY_ROOT || "./";
const PAGE = window.NEXAPAY_PAGE || document.getElementById("app")?.dataset.page || "home";
const app = document.getElementById("app");
const DISCLAIMER = "Educational Demo - No Real Money or Financial Transactions";
const THEME_KEY = "nexapay.theme";

const customerPages = {
  home: "pages/customer/dashboard.html",
  transactions: "pages/customer/transactions.html",
  scan: "pages/customer/scan.html",
  notifications: "pages/customer/notifications.html",
  profile: "pages/customer/profile.html"
};

function getPreferredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    return "light";
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalized === "dark" ? "dark" : "";
  document.documentElement.dataset.colorMode = normalized;
  try {
    localStorage.setItem(THEME_KEY, normalized);
  } catch {
    return normalized;
  }
  return normalized;
}

function toggleTheme() {
  const current = document.documentElement.dataset.colorMode || getPreferredTheme();
  return applyTheme(current === "dark" ? "light" : "dark");
}

function currentThemeLabel() {
  const theme = document.documentElement.dataset.colorMode || getPreferredTheme();
  return theme === "dark" ? "Dark theme" : "Light theme";
}

applyTheme(getPreferredTheme());

function href(path) {
  if (path.startsWith("http") || path.startsWith("#")) return path;
  return `${ROOT}${path}`;
}

function avatar(profile, size = 44) {
  return `<span class="avatar" style="width:${size}px;height:${size}px">${initials(profile?.full_name)}</span>`;
}

function demoRibbon() {
  return `<div class="demo-ribbon">${DISCLAIMER}</div>`;
}

function brandRow(subtitle = "Mobile Financial Service Simulator") {
  return `
    <div class="brand-row">
      <img src="${href("assets/logos/nexapay-mark.svg")}" alt="NexaPay logo mark">
      <span class="brand-copy">
        <strong>NexaPay</strong>
        <span>${subtitle}</span>
      </span>
    </div>
  `;
}

function publicLayout(content, side = "") {
  app.innerHTML = `
    ${demoRibbon()}
    <main class="page-bg">
      <div class="app-stage">
        <aside class="side-panel">
          ${brandRow()}
          <h1>Practice digital wallet architecture without real money.</h1>
          <p>NexaPay is a fictional portfolio project for learning authentication, roles, ledger logic, receipts, RLS, and admin operations.</p>
          <div class="notice">${icon("shield")}<span><strong>Safe demo boundary</strong>No real banks, cards, OTP delivery, payment gateways, or financial credentials are used.</span></div>
        </aside>
        <section class="mobile-shell">
          <div class="app-main">${content}</div>
        </section>
        <aside class="side-panel right">${side || phonePreview()}</aside>
      </div>
    </main>
  `;
}

function phonePreview() {
  return `
    <div class="phone-preview">
      ${brandRow("Demo wallet preview")}
      <div class="mini-screen">
        <span class="badge">Demo Balance</span>
        <strong style="font-size:2rem">${money(25000)}</strong>
        <span>Send, request, pay merchants, scan QR, save goals, and review receipts using fake demo currency.</span>
      </div>
      <div class="mini-screen">
        <div class="between"><span>Security model</span>${icon("lock")}</div>
        <span>Supabase Auth + Postgres RLS + RPC transaction functions.</span>
      </div>
    </div>
  `;
}

function bottomNav(active = "home", role = "customer") {
  const roleItems = {
    customer: [
      ["home", "Home", "home", customerPages.home],
      ["transactions", "Transactions", "history", customerPages.transactions],
      ["scan", "Scan", "scan", customerPages.scan],
      ["notifications", "Alerts", "bell", customerPages.notifications],
      ["profile", "Profile", "user", customerPages.profile]
    ],
    merchant: [
      ["home", "Home", "home", "pages/merchant/merchant-dashboard.html"],
      ["transactions", "Payments", "history", "pages/merchant/merchant-payments.html"],
      ["scan", "QR", "qrcode", "pages/merchant/merchant-qr.html"],
      ["notifications", "Alerts", "bell", "pages/customer/notifications.html"],
      ["profile", "Profile", "user", "pages/merchant/merchant-profile.html"]
    ],
    agent: [
      ["home", "Home", "home", "pages/agent/agent-dashboard.html"],
      ["transactions", "History", "history", "pages/agent/agent-transactions.html"],
      ["scan", "Cash In", "add", "pages/agent/agent-cash-in.html"],
      ["notifications", "Alerts", "bell", "pages/customer/notifications.html"],
      ["profile", "Profile", "user", "pages/customer/profile.html"]
    ]
  };
  const items = roleItems[role] || roleItems.customer;
  return `<nav class="bottom-nav" aria-label="Main navigation">
    ${items.map(([key, label, iconName, path]) => `
      <a class="nav-item ${active === key ? "active" : ""}" href="${href(path)}">${icon(iconName, 20)}<span>${label}</span></a>
    `).join("")}
  </nav>`;
}

function mobileLayout({ title, subtitle, content, active = "home", profile, side = "" }) {
  const unreadCount = profile ? Wallet.listNotifications(profile.id).filter((item) => !item.is_read).length : 0;
  app.innerHTML = `
    ${demoRibbon()}
    <main class="page-bg">
      <div class="app-stage">
        <aside class="side-panel">
          ${brandRow()}
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(subtitle || "A safe fictional wallet simulator for learning full-stack development.")}</p>
          <div class="notice">${icon("shield")}<span><strong>Always simulated</strong>NexaPay never processes real money or connects to real financial services.</span></div>
        </aside>
        <section class="mobile-shell">
          <div class="app-main">
            <header class="screen-header">
              <div class="screen-title">
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(subtitle || DISCLAIMER)}</p>
              </div>
              <div class="cluster">
                <a class="icon-button notification-button" href="${href(customerPages.notifications)}" aria-label="Notifications">${icon("bell")}${unreadCount ? `<span class="notification-count">${unreadCount}</span>` : ""}</a>
                ${avatar(profile)}
              </div>
            </header>
            ${content}
          </div>
          ${bottomNav(active, profile?.role)}
        </section>
        <aside class="side-panel right">${side || quickSafetyPanel()}</aside>
      </div>
    </main>
  `;
}

function quickSafetyPanel() {
  return `
    <div class="card card-pad stack">
      <h3 class="section-title">Learning targets</h3>
      <div class="list">
        <div class="list-item"><span class="item-main">${icon("lock")}<span class="item-copy"><strong>Secure logic</strong><span>Balance writes belong in RPC functions.</span></span></span></div>
        <div class="list-item"><span class="item-main">${icon("users")}<span class="item-copy"><strong>Role access</strong><span>Customer, merchant, agent, admin.</span></span></span></div>
        <div class="list-item"><span class="item-main">${icon("receipt")}<span class="item-copy"><strong>Receipts</strong><span>Every receipt says educational demo.</span></span></span></div>
      </div>
    </div>
  `;
}

function adminLayout(title, content, profile) {
  const nav = [
    ["admin-dashboard", "Overview", "chart", "pages/admin/admin-dashboard.html"],
    ["admin-users", "Users", "users", "pages/admin/admin-users.html"],
    ["admin-merchants", "Merchants", "merchant", "pages/admin/admin-merchants.html"],
    ["admin-agents", "Agents", "agent", "pages/admin/admin-agents.html"],
    ["admin-transactions", "Transactions", "history", "pages/admin/admin-transactions.html"],
    ["admin-services", "Services", "settings", "pages/admin/admin-services.html"],
    ["admin-announcements", "Announcements", "bell", "pages/admin/admin-announcements.html"],
    ["admin-promotions", "Promotions", "star", "pages/admin/admin-promotions.html"],
    ["admin-audit-logs", "Audit Logs", "shield", "pages/admin/admin-audit-logs.html"],
    ["admin-settings", "Settings", "settings", "pages/admin/admin-settings.html"]
  ];
  app.innerHTML = `
    ${demoRibbon()}
    <main class="admin-shell">
      <aside class="admin-sidebar">
        ${brandRow("Admin Console")}
        <nav class="admin-nav" aria-label="Admin navigation">
          ${nav.map(([key, label, iconName, path]) => `<a class="${PAGE === key ? "active" : ""}" href="${href(path)}">${icon(iconName, 19)}${label}</a>`).join("")}
        </nav>
        <button class="button secondary" data-action="logout">${icon("logout")} Logout</button>
      </aside>
      <section class="admin-main">
        <header class="admin-header">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <p class="muted">${DISCLAIMER}</p>
          </div>
          <div class="cluster">${avatar(profile)}<strong>${escapeHtml(profile.full_name)}</strong></div>
        </header>
        ${content}
      </section>
    </main>
  `;
}

function guard(roles) {
  const access = Auth.requireRole(roles);
  if (access.ok) return access.profile;

  const content = `
    <div class="auth-card card">
      ${brandRow("Sign in required")}
      <h1>Choose a demo role to continue</h1>
      <p class="muted">The local version can run without Supabase. These buttons create a temporary demo session only on this browser.</p>
      <div class="demo-login-grid">
        ${["customer", "merchant", "agent", "admin"].map((role) => `<button class="button secondary" data-demo-role="${role}">${roleName(role)}</button>`).join("")}
      </div>
      <a class="button full" href="${href("login.html")}">${icon("lock")} Go to login</a>
    </div>
  `;
  publicLayout(content);
  wireDemoButtons();
  return null;
}

function roleName(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function demoRoleButtons(compact = false) {
  const roles = [
    ["customer", "Try wallet flows"],
    ["merchant", "Review payments"],
    ["agent", "Process cash-in"],
    ["admin", "Manage demo data"]
  ];
  return `
    <div class="${compact ? "demo-login-grid compact" : "demo-login-grid"}">
      ${roles.map(([role, description]) => `
        <button class="demo-role-card" type="button" data-demo-role="${role}">
          <span class="icon-button" aria-hidden="true">${icon(role === "customer" ? "user" : role === "merchant" ? "merchant" : role === "agent" ? "agent" : "shield", 18)}</span>
          <span>
            <strong>${roleName(role)}</strong>
            <small>${description}</small>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function authChecklist(items) {
  return `<div class="auth-checklist">${items.map((item) => `<span>${icon("check", 16)}${escapeHtml(item)}</span>`).join("")}</div>`;
}

function passwordScore(password = "") {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function passwordStrengthText(score) {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
}

function passwordStrengthMarkup(id) {
  return `
    <div class="password-meter" id="${id}" aria-live="polite">
      <span class="password-meter-track"><span style="width:0%"></span></span>
      <small>Use 8+ characters with letters and numbers.</small>
    </div>
  `;
}

function wirePasswordStrength(inputId, meterId) {
  const input = document.getElementById(inputId);
  const meter = document.getElementById(meterId);
  if (!input || !meter) return;
  const bar = meter.querySelector(".password-meter-track span");
  const label = meter.querySelector("small");
  input.addEventListener("input", () => {
    const score = passwordScore(input.value);
    bar.style.width = `${Math.max(8, score * 25)}%`;
    bar.dataset.score = String(score);
    label.textContent = input.value ? `${passwordStrengthText(score)} demo password` : "Use 8+ characters with letters and numbers.";
  });
}

function wirePasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      button.innerHTML = icon(isHidden ? "eye-off" : "eye", 18);
      button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    });
  });
}

function txDirection(tx, userId) {
  return Transactions.directionFor(tx, userId);
}

function txIcon(type) {
  const map = {
    send_money: "send",
    receive_money: "request",
    request_money: "request",
    merchant_payment: "payment",
    add_money: "add",
    cash_out: "cash",
    recharge: "phone",
    bill_payment: "bill",
    bank_transfer: "bank",
    savings_deposit: "savings",
    savings_withdrawal: "savings",
    donation: "donation"
  };
  return map[type] || "receipt";
}

function transactionList(transactions, userId) {
  if (!transactions.length) return `<div class="empty-state">${icon("receipt")}<strong>No demo transactions yet</strong><span class="muted">Try a simulated service to create one.</span></div>`;
  return `<div class="list">
    ${transactions.map((tx) => {
      const direction = txDirection(tx, userId);
      const amountClass = direction === "in" ? "amount-in" : "amount-out";
      const parties = Transactions.partiesFor(tx);
      const counterparty = direction === "in" ? parties.senderName : parties.receiverName;
      return `
        <a class="list-item transaction-row" href="${href(`pages/customer/transaction-details.html?id=${encodeURIComponent(tx.id)}`)}">
          <span class="item-main">
            <span class="icon-button" aria-hidden="true">${icon(txIcon(tx.transaction_type), 19)}</span>
            <span class="item-copy">
              <strong>${escapeHtml(txLabel(tx.transaction_type))}</strong>
              <span>${escapeHtml(counterparty || tx.reference || tx.transaction_id)} - ${dateTime(tx.created_at)}</span>
              <small>${escapeHtml(tx.transaction_id)} - ${escapeHtml(tx.reference || "No reference")}</small>
            </span>
          </span>
          <span class="tx-row-meta">
            <span class="badge ${Transactions.statusClass(tx.status)}">${escapeHtml(tx.status || "completed")}</span>
            <strong class="${amountClass}">${direction === "in" ? "+" : "-"}${money(direction === "in" ? tx.amount : tx.total_amount || tx.amount)}</strong>
          </span>
        </a>
      `;
    }).join("")}
  </div>`;
}

function renderLanding() {
  const content = `
    <div class="auth-card card">
      ${brandRow()}
      <h1>NexaPay</h1>
      <p class="muted">A complete fictional mobile financial service simulator for learning full-stack development, database design, Supabase Auth, RLS, and ledger-safe transaction logic.</p>
      <div class="notice">${icon("shield")}<span><strong>${DISCLAIMER}</strong>NexaPay is not affiliated with bKash or any real financial institution.</span></div>
      <div class="public-actions">
        <a class="button" href="${href("signup.html")}">${icon("user")} Create demo account</a>
        <a class="button secondary" href="${href("login.html")}">${icon("lock")} Log in</a>
      </div>
      <div class="demo-login-grid">
        ${["customer", "merchant", "agent", "admin"].map((role) => `<button class="button secondary" data-demo-role="${role}">${roleName(role)} demo</button>`).join("")}
      </div>
    </div>
  `;
  publicLayout(content);
  wireDemoButtons();
}

function renderLogin() {
  const authMode = Auth.getAuthModeLabel();
  const content = `
    <div class="auth-card auth-elevated card">
      <div class="auth-topline">
        ${brandRow("Secure sign in")}
        <span class="badge">Phase 6</span>
      </div>
      <div class="auth-heading">
        <span class="auth-eyebrow">${escapeHtml(authMode)}</span>
        <h1>Welcome back</h1>
        <p>Sign in with Supabase Auth when project keys are configured, or use local demo roles to explore NexaPay instantly.</p>
      </div>
      <form class="auth-form" id="loginForm" novalidate>
        <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" placeholder="ava@example.test" required></label>
        <label class="field"><span>Password</span><span class="password-field"><input class="input" id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="Your local demo password" required><button class="icon-button" type="button" data-password-toggle="loginPassword" aria-label="Show password">${icon("eye", 18)}</button></span></label>
        <div class="auth-form-row">
          <label class="check-row"><input type="checkbox" name="remember" checked><span>Keep this demo session on this browser</span></label>
          <a class="auth-link" href="${href("forgot-password.html")}">Forgot?</a>
        </div>
        <button class="button full" type="submit">${icon("lock")} Log in</button>
      </form>
      <div class="auth-divider"><span>or choose a role</span></div>
      ${demoRoleButtons(true)}
      <div class="notice">${icon("shield")}<span><strong>No real financial credentials.</strong>Use only NexaPay demo account details. Supabase mode uses the public anon key, never a service-role key.</span></div>
      <p class="muted auth-switch">New here? <a href="${href("signup.html")}"><strong>Create a demo account</strong></a></p>
      <div id="formMessage"></div>
    </div>
  `;
  publicLayout(content);
  wireDemoButtons();
  wirePasswordToggles();
  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await Auth.signIn(data);
      location.href = href("pages/customer/dashboard.html");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function renderSignup() {
  const content = `
    <div class="auth-card card">
      ${brandRow("Create demo account")}
      <h1>Start with ৳25,000 demo balance</h1>
      <form class="auth-form" id="signupForm">
        <label class="field"><span>Full name</span><input class="input" name="fullName" autocomplete="name" required></label>
        <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required></label>
        <label class="field"><span>Demo phone number</span><input class="input" name="phone" inputmode="tel" placeholder="01710000000" required></label>
        <label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="new-password" minlength="8" required></label>
        <label class="field"><span>Confirm password</span><input class="input" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="button full" type="submit">${icon("user")} Create account</button>
      </form>
      <div class="notice">${icon("shield")}<span><strong>Phone is demo profile data only.</strong>No real OTP is sent and no financial credential is collected.</span></div>
      <p class="muted">Already registered? <a href="${href("login.html")}"><strong>Log in</strong></a></p>
      <div id="formMessage"></div>
    </div>
  `;
  publicLayout(content);
  document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await Auth.signUp(data);
      location.href = href("pages/customer/dashboard.html");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function renderForgotPassword() {
  const content = `
    <div class="auth-card card">
      ${brandRow("Password help")}
      <h1>Reset your demo password</h1>
      <p class="muted">In Supabase mode this page can call password recovery. In local demo mode, create another local demo account or use the role buttons.</p>
      <form class="auth-form" id="forgotForm">
        <label class="field"><span>Email</span><input class="input" name="email" type="email" required></label>
        <button class="button full" type="submit">${icon("send")} Send demo reset instructions</button>
      </form>
      <a class="button secondary full" href="${href("login.html")}">${icon("arrow-left")} Back to login</a>
      <div id="formMessage"></div>
    </div>
  `;
  publicLayout(content);
  document.getElementById("forgotForm").addEventListener("submit", (event) => {
    event.preventDefault();
    showMessage("Demo reset instructions would be sent by Supabase Auth after configuration.", "success");
  });
}

function renderSignupPhase3() {
  const authMode = Auth.getAuthModeLabel();
  const content = `
    <div class="auth-card auth-elevated card">
      <div class="auth-topline">
        ${brandRow("Create demo account")}
        <span class="badge success">${Auth.isUsingSupabase() ? "Supabase" : "Local demo"}</span>
      </div>
      <div class="auth-heading">
        <span class="auth-eyebrow">${escapeHtml(authMode)}</span>
        <h1>Start with a safe demo wallet</h1>
        <p>Your account is assigned the customer role and receives a fake starting balance. No OTP, bank, card, or real payment service is involved.</p>
      </div>
      <form class="auth-form" id="signupForm" novalidate>
        <label class="field"><span>Full name</span><input class="input" name="fullName" autocomplete="name" placeholder="Ava Rahman" required></label>
        <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" placeholder="ava@example.test" required></label>
        <label class="field"><span>Demo phone number</span><input class="input" name="phone" inputmode="tel" placeholder="01710000000" required><small class="help-text">Profile information only. NexaPay will not send OTP codes.</small></label>
        <label class="field"><span>Password</span><span class="password-field"><input class="input" id="signupPassword" name="password" type="password" autocomplete="new-password" minlength="8" required><button class="icon-button" type="button" data-password-toggle="signupPassword" aria-label="Show password">${icon("eye", 18)}</button></span>${passwordStrengthMarkup("signupStrength")}</label>
        <label class="field"><span>Confirm password</span><span class="password-field"><input class="input" id="signupConfirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required><button class="icon-button" type="button" data-password-toggle="signupConfirmPassword" aria-label="Show password">${icon("eye", 18)}</button></span></label>
        <label class="check-row"><input type="checkbox" name="demoConsent" required><span>I understand this is educational demo money only.</span></label>
        <button class="button full" type="submit">${icon("user")} Create demo account</button>
      </form>
      ${authChecklist([Auth.isUsingSupabase() ? "Automatic Supabase profile" : "Automatic local profile", "Automatic demo wallet", "Customer role by default", "No real OTP collection"])}
      <p class="muted auth-switch">Already registered? <a href="${href("login.html")}"><strong>Log in</strong></a></p>
      <div id="formMessage"></div>
    </div>
  `;
  publicLayout(content);
  wirePasswordToggles();
  wirePasswordStrength("signupPassword", "signupStrength");
  document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (!event.currentTarget.demoConsent.checked) {
      showMessage("Please confirm that this is educational demo money only.", "error");
      return;
    }
    try {
      const result = await Auth.signUp(data);
      if (result?.needsEmailConfirmation) {
        showMessage(result.message, "success");
        return;
      }
      location.href = href("pages/customer/dashboard.html");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function renderForgotPasswordPhase3() {
  const authMode = Auth.getAuthModeLabel();
  const content = `
    <div class="auth-card auth-elevated card">
      <div class="auth-topline">
        ${brandRow("Password help")}
        <span class="badge warning">${Auth.isUsingSupabase() ? "Supabase reset" : "Demo reset"}</span>
      </div>
      <div class="auth-heading">
        <span class="auth-eyebrow">${escapeHtml(authMode)}</span>
        <h1>Recover a local demo account</h1>
        <p>${Auth.isUsingSupabase() ? "Enter your Supabase demo email to request a password recovery link." : "Enter the email used during local signup. NexaPay will prepare an in-browser reset flow only."}</p>
      </div>
      <form class="auth-form" id="forgotForm" novalidate>
        <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" placeholder="ava@example.test" required></label>
        <button class="button full" type="submit">${icon("send")} Continue to demo reset</button>
      </form>
      <div class="notice">${icon("shield")}<span><strong>No OTP or SMS collection.</strong>${Auth.isUsingSupabase() ? "Supabase may email a recovery link if email delivery is configured." : "This fallback simulates the reset experience entirely in the browser."}</span></div>
      <a class="button secondary full" href="${href("login.html")}">${icon("arrow-left")} Back to login</a>
      <div id="formMessage"></div>
    </div>
  `;
  publicLayout(content);
  document.getElementById("forgotForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await Auth.requestDemoPasswordReset(data.email);
      showMessage(`${result.message}${Auth.isUsingSupabase() ? "" : " You can now open the reset page."}`, "success");
      if (!Auth.isUsingSupabase()) {
        document.getElementById("formMessage").insertAdjacentHTML("beforeend", `<a class="button full auth-result-action" href="${href(`reset-password.html?email=${encodeURIComponent(result.email)}`)}">${icon("lock")} Open reset page</a>`);
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function renderResetPassword() {
  const authMode = Auth.getAuthModeLabel();
  const params = new URLSearchParams(location.search);
  const savedEmail = (() => {
    try {
      return localStorage.getItem("nexapay.demo.reset.email") || "";
    } catch {
      return "";
    }
  })();
  const email = params.get("email") || savedEmail;
  const content = `
    <div class="auth-card auth-elevated card">
      <div class="auth-topline">
        ${brandRow("Set new demo password")}
        <span class="badge">${Auth.isUsingSupabase() ? "Supabase" : "Local only"}</span>
      </div>
      <div class="auth-heading">
        <span class="auth-eyebrow">${escapeHtml(authMode)}</span>
        <h1>Create a new demo password</h1>
        <p>${Auth.isUsingSupabase() ? "Use this page after opening the latest Supabase recovery link." : "This updates only a local browser demo account created through the signup page."}</p>
      </div>
      <form class="auth-form" id="resetForm" novalidate>
        <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" value="${escapeHtml(email)}" placeholder="ava@example.test" required></label>
        <label class="field"><span>New password</span><span class="password-field"><input class="input" id="resetPassword" name="password" type="password" autocomplete="new-password" minlength="8" required><button class="icon-button" type="button" data-password-toggle="resetPassword" aria-label="Show password">${icon("eye", 18)}</button></span>${passwordStrengthMarkup("resetStrength")}</label>
        <label class="field"><span>Confirm new password</span><span class="password-field"><input class="input" id="resetConfirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required><button class="icon-button" type="button" data-password-toggle="resetConfirmPassword" aria-label="Show password">${icon("eye", 18)}</button></span></label>
        <button class="button full" type="submit">${icon("lock")} Save new password</button>
      </form>
      <div class="notice">${icon("shield")}<span><strong>Educational demo boundary.</strong>${Auth.isUsingSupabase() ? "Supabase Auth updates the password after validating the recovery session." : "If the email belongs to a local demo signup, the local password hash is updated."}</span></div>
      <a class="button secondary full" href="${href("login.html")}">${icon("arrow-left")} Back to login</a>
      <div id="formMessage"></div>
    </div>
  `;
  publicLayout(content);
  wirePasswordToggles();
  wirePasswordStrength("resetPassword", "resetStrength");
  document.getElementById("resetForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await Auth.resetDemoPassword(data);
      showMessage(`${result.message} You can now log in.`, "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function renderDashboard(profile) {
  const data = Wallet.getDashboardData(profile.id);
  const notifications = Wallet.listNotifications(profile.id).slice(0, 3);
  const allTransactions = Wallet.getTransactionsForUser(profile.id);
  const moneyIn = allTransactions
    .filter((tx) => tx.receiver_id === profile.id || tx.transaction_type === "add_money")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const moneyOut = allTransactions
    .filter((tx) => tx.sender_id === profile.id)
    .reduce((sum, tx) => sum + Number(tx.total_amount || tx.amount || 0), 0);
  const savingsGoal = (data.state.savings_goals || []).find((goal) => goal.user_id === profile.id);
  const primaryActions = [
    ["Send Money", "send", "pages/customer/send-money.html", "Transfer fake funds"],
    ["Request", "request", "pages/customer/request-money.html", "Ask a demo user"],
    ["Payment", "payment", "pages/customer/payment.html", "Pay merchants"],
    ["Scan QR", "scan", "pages/customer/scan.html", "Use safe QR data"]
  ];
  const serviceActions = [
    ["Add Money", "add", "pages/customer/add-money.html"],
    ["Cash Out", "cash", "pages/customer/cash-out.html"],
    ["Recharge", "phone", "pages/customer/recharge.html"],
    ["Pay Bill", "bill", "pages/customer/bills.html"],
    ["Bank", "bank", "pages/customer/bank-transfer.html"],
    ["Savings", "savings", "pages/customer/savings.html"],
    ["Donation", "donation", "pages/customer/donation.html"],
    ["More", "more", "pages/customer/transactions.html"]
  ];
  const recommendedServices = [
    ["Savings Goal", "savings", "pages/customer/savings.html", savingsGoal ? `${savingsGoal.title}: ${money(savingsGoal.current_amount)} saved` : "Create a fake savings target"],
    ["Demo Bill", "bill", "pages/customer/bills.html", "Practice fictional provider payments"],
    ["QR Payment", "qrcode", "pages/customer/scan.html", "Scan a safe merchant identifier"]
  ];
  const promotions = (data.state.promotions || []).filter((promo) => promo.status === "active").slice(0, 2);
  const content = `
    <div class="dashboard-home stack">
      <section class="dashboard-hero">
        <div class="hero-copy">
          <span class="badge">Customer demo</span>
          <h2>Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${escapeHtml(profile.full_name.split(" ")[0])}</h2>
          <p>Practice wallet flows with temporary demo data and fake currency.</p>
        </div>
        <a class="notification-summary" href="${href("pages/customer/notifications.html")}">
          ${icon("bell", 20)}
          <span><strong>${data.unreadCount}</strong><small>Unread</small></span>
        </a>
      </section>
      <section class="balance-card dashboard-balance">
        <div class="balance-label">
          <span>Demo Balance</span>
          <button class="icon-button balance-toggle" data-action="toggle-balance" aria-label="Hide or show balance">${icon("eye")}</button>
        </div>
        <strong class="balance-value" id="balanceValue">${money(data.wallet.balance)}</strong>
        <span>Available demo balance - fake BDT currency only</span>
        <div class="balance-breakdown">
          <span><small>Money in</small><strong data-sensitive-value>${money(moneyIn)}</strong></span>
          <span><small>Money out</small><strong data-sensitive-value>${money(moneyOut)}</strong></span>
          <span><small>Status</small><strong>Active</strong></span>
        </div>
      </section>
      <section class="card card-pad stack">
        <div class="section-head"><h2 class="section-title">Priority actions</h2><span class="badge">Fast access</span></div>
        <div class="priority-grid">
          ${primaryActions.map(([label, iconName, path, copy]) => `
            <a class="priority-action" href="${href(path)}">
              <span>${icon(iconName)}</span>
              <strong>${label}</strong>
              <small>${copy}</small>
            </a>
          `).join("")}
        </div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Services</h2><a class="badge" href="${href("pages/customer/transactions.html")}">More</a></div>
        <div class="quick-grid">
          ${serviceActions.map(([label, iconName, path]) => `<a class="quick-action" href="${href(path)}">${icon(iconName)}<span>${label}</span></a>`).join("")}
        </div>
      </section>
      <section class="promo-strip">
        ${promotions.length ? promotions.map((promo, index) => `
          <a class="promo-card ${index === 1 ? "alt" : ""}" href="${href(promo.link || "pages/customer/send-money.html")}">
            <span class="badge warning">Demo promo</span>
            <h3>${escapeHtml(promo.title)}</h3>
            <p class="muted">${escapeHtml(promo.description || "Explore NexaPay safely.")}</p>
          </a>
        `).join("") : `
          <a class="promo-card" href="${href("pages/customer/send-money.html")}">
            <span class="badge warning">Demo promo</span>
            <h3>Practice safe demo transfers</h3>
            <p class="muted">Try Send Money with fictional users and receipts.</p>
          </a>
        `}
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Favorite contacts</h2><a class="badge" href="${href("pages/customer/profile.html")}">Manage</a></div>
        <div class="contact-strip favorite-strip">
          ${data.favorites.length ? data.favorites.map((favorite) => `
            <article class="favorite-card">
              ${avatar(favorite, 46)}
              <strong>${escapeHtml(favorite.full_name.split(" ")[0])}</strong>
              <span>${escapeHtml(roleName(favorite.role))}</span>
              <a class="button ghost" href="${href("pages/customer/send-money.html")}">${icon("send", 16)} Send</a>
            </article>
          `).join("") : `<div class="empty-state compact">${icon("star")}<strong>No favorites yet</strong><span class="muted">Add demo contacts from Profile.</span></div>`}
        </div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Notifications</h2><a class="badge" href="${href("pages/customer/notifications.html")}">View all</a></div>
        <div class="dashboard-notifications">
          ${notifications.length ? notifications.map((item) => `
            <a class="notice-row ${item.is_read ? "" : "unread"}" href="${href("pages/customer/notifications.html")}">
              <span class="icon-button">${icon(item.type === "admin_announcement" ? "shield" : "bell", 17)}</span>
              <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.message)}</small></span>
            </a>
          `).join("") : `<div class="empty-state compact">${icon("bell")}<strong>No notifications</strong></div>`}
        </div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Recommended services</h2><span class="badge">For practice</span></div>
        <div class="recommend-grid">
          ${recommendedServices.map(([label, iconName, path, copy]) => `
            <a class="recommend-card" href="${href(path)}">
              <span>${icon(iconName, 20)}</span>
              <strong>${label}</strong>
              <small>${escapeHtml(copy)}</small>
            </a>
          `).join("")}
        </div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Recent transactions</h2><a class="badge" href="${href("pages/customer/transactions.html")}">View all</a></div>
        ${transactionList(data.transactions, profile.id)}
      </section>
    </div>
  `;
  mobileLayout({ title: `Hi, ${profile.full_name.split(" ")[0]}`, subtitle: "Your NexaPay demo wallet", content, active: "home", profile });
  wireDashboard();
}

function renderSendMoney(profile) {
  const initialRecipients = SendMoney.getInitialRecipients(profile.id);
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("to") || "";
  const content = `
    <form class="card card-pad stack" id="sendWizard" data-step="1">
      <div class="between">
        <span class="badge">${escapeHtml(SendMoney.getSendModeLabel())}</span>
        <span class="muted">Secure request flow</span>
      </div>
      <div class="stepper" aria-label="Send Money steps">${[1, 2, 3, 4, 5, 6].map((step) => `<span class="step-dot ${step === 1 ? "active" : ""}" data-dot="${step}"></span>`).join("")}</div>
      <section class="wizard-step" data-step-panel="1">
        <h2 class="section-title">Step 1: Choose recipient</h2>
        <div class="notice">${icon("shield")}<span><strong>Registered demo users only.</strong>Search by fictional phone number or name. NexaPay never reads your device contacts.</span></div>
        <label class="field"><span>Search by demo phone number or name</span><input class="input" name="phoneSearch" value="${escapeHtml(initialQuery)}" placeholder="01710000002"></label>
        <button class="button secondary" type="button" data-recipient-search>${icon("search")} Search recipients</button>
        <div id="recipientResults">${recipientResultList(initialRecipients)}</div>
        <label class="field"><span>Selected recipient</span><select class="select" name="receiverId" required>${recipientOptions(initialRecipients)}</select></label>
        <div id="selectedRecipientSummary" class="stack-sm"></div>
      </section>
      <section class="wizard-step" data-step-panel="2" hidden>
        <h2 class="section-title">Step 2: Enter amount</h2>
        <div class="notice">${icon("cash")}<span><strong>Available demo balance</strong>${money(Wallet.getDashboardData(profile.id).wallet.balance)}. Minimum ${money(SendMoney.SEND_LIMITS.min)}, maximum ${money(SendMoney.SEND_LIMITS.max)}.</span></div>
        <label class="field"><span>Amount</span><input class="input" name="amount" type="number" min="1" max="100000" step="1" required></label>
        <div id="amountPreview" class="review-grid"></div>
      </section>
      <section class="wizard-step" data-step-panel="3" hidden>
        <h2 class="section-title">Step 3: Add reference</h2>
        <label class="field"><span>Reference</span><select class="select" name="reference"><option>Lunch</option><option>Rent</option><option>Gift</option><option>Personal</option><option>Project</option></select></label>
      </section>
      <section class="wizard-step" data-step-panel="4" hidden>
        <h2 class="section-title">Step 4: Review transaction</h2>
        <div class="review-grid" id="sendReview"></div>
      </section>
      <section class="wizard-step" data-step-panel="5" hidden>
        <h2 class="section-title">Step 5: Confirm demo transaction</h2>
        <div class="notice">${icon("shield")}<span><strong>No real financial PIN.</strong>Type DEMO to confirm this educational transaction.</span></div>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
      </section>
      <section class="wizard-step" data-step-panel="6" hidden>
        <div id="sendSuccess"></div>
      </section>
      <div class="between no-print">
        <button class="button secondary" type="button" data-prev hidden>${icon("arrow-left")} Back</button>
        <button class="button" type="button" data-next>Next ${icon("send")}</button>
        <button class="button accent" type="submit" data-submit hidden>${icon("check")} Confirm</button>
      </div>
      <div id="formMessage"></div>
    </form>
  `;
  mobileLayout({ title: "Send Money", subtitle: "Multi-step simulated transfer", content, active: "home", profile });
  wireSendMoney(profile, initialRecipients, initialQuery);
}

function recipientOptions(recipients) {
  return `<option value="">Select recipient</option>${recipients.map((contact) => `<option value="${contact.id}">${escapeHtml(contact.full_name)} - ${escapeHtml(contact.phone)}</option>`).join("")}`;
}

function recipientResultList(recipients) {
  if (!recipients.length) {
    return `<div class="empty-state compact">${icon("users")}<strong>No recipients loaded</strong><span class="muted">Search for a registered fictional demo user.</span></div>`;
  }
  return `<div class="list">${recipients.map((contact) => `
    <div class="list-item">
      <span class="item-main">${avatar(contact, 38)}<span class="item-copy"><strong>${escapeHtml(contact.full_name)}</strong><span>${escapeHtml(contact.phone)} - ${escapeHtml(roleName(contact.role || "customer"))}</span></span></span>
      <button class="button ghost" type="button" data-pick-recipient="${contact.id}">${icon("check", 17)} Choose</button>
    </div>
  `).join("")}</div>`;
}

function reviewRows(rows) {
  return rows.map(([label, value]) => `<div class="review-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function wireSendMoney(profile, initialRecipients, initialQuery = "") {
  const form = document.getElementById("sendWizard");
  let step = 1;
  let recipients = [...initialRecipients];
  let selectedRecipient = null;
  let idempotencyKey = SendMoney.createTransferRequestId(profile.id);
  let submitting = false;
  const receiverSelect = form.elements.receiverId;
  const recipientResults = document.getElementById("recipientResults");
  const selectedSummary = document.getElementById("selectedRecipientSummary");
  const amountPreview = document.getElementById("amountPreview");

  const data = () => Object.fromEntries(new FormData(form));
  const selectedContact = () => selectedRecipient || recipients.find((contact) => contact.id === data().receiverId);

  const mergeRecipients = (items) => {
    const map = new Map(recipients.map((item) => [item.id, item]));
    items.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
    recipients = [...map.values()];
  };

  const renderRecipients = (items) => {
    mergeRecipients(items);
    receiverSelect.innerHTML = recipientOptions(recipients);
    recipientResults.innerHTML = recipientResultList(items);
    if (selectedRecipient) receiverSelect.value = selectedRecipient.id;
  };

  const updateSendReview = () => {
    const values = data();
    const amount = Number(values.amount || 0);
    const fee = Wallet.calculateFee("send_money", amount);
    const total = amount + fee;
    const recipient = selectedContact();
    if (amountPreview) {
      amountPreview.innerHTML = reviewRows([
        ["Demo fee", money(Number.isFinite(fee) ? fee : 0)],
        ["Total deduction", money(Number.isFinite(total) ? total : 0)]
      ]);
    }
    document.getElementById("sendReview").innerHTML = reviewRows([
      ["Recipient", recipient ? `${recipient.full_name} (${recipient.phone})` : "Not selected"],
      ["Amount", money(Number.isFinite(amount) ? amount : 0)],
      ["Demo fee", money(Number.isFinite(fee) ? fee : 0)],
      ["Total deduction", money(Number.isFinite(total) ? total : 0)],
      ["Reference", values.reference || "Personal"],
      ["Request ID", idempotencyKey]
    ]);
  };

  const setRecipient = (recipientId) => {
    selectedRecipient = recipients.find((contact) => contact.id === recipientId) || null;
    receiverSelect.value = selectedRecipient?.id || "";
    selectedSummary.innerHTML = selectedRecipient ? `
      <div class="notice">${icon("check")}<span><strong>${escapeHtml(selectedRecipient.full_name)}</strong>${escapeHtml(selectedRecipient.phone)} is selected for this demo transfer.</span></div>
    ` : "";
    updateSendReview();
  };

  const searchRecipients = async () => {
    const query = form.elements.phoneSearch.value;
    const searchButton = form.querySelector("[data-recipient-search]");
    searchButton.disabled = true;
    showMessage("", "clear");
    try {
      const results = await SendMoney.searchRecipients(query, profile.id);
      renderRecipients(results);
      if (results.length === 1) setRecipient(results[0].id);
      if (!results.length) showMessage("No matching registered demo customer was found.", "error");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      searchButton.disabled = false;
    }
  };

  const setStep = (next) => {
    step = Math.max(1, Math.min(6, next));
    form.dataset.step = String(step);
    form.querySelectorAll("[data-step-panel]").forEach((panel) => panel.hidden = Number(panel.dataset.stepPanel) !== step);
    form.querySelectorAll("[data-dot]").forEach((dot) => dot.classList.toggle("active", Number(dot.dataset.dot) <= step));
    form.querySelector("[data-prev]").hidden = step === 1 || step === 6;
    form.querySelector("[data-next]").hidden = step >= 5;
    form.querySelector("[data-submit]").hidden = step !== 5;
    if (step === 2 || step === 4) updateSendReview();
  };

  form.querySelector("[data-recipient-search]").addEventListener("click", searchRecipients);
  form.elements.phoneSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchRecipients();
    }
  });
  recipientResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-recipient]");
    if (button) setRecipient(button.dataset.pickRecipient);
  });
  receiverSelect.addEventListener("change", () => setRecipient(receiverSelect.value));
  form.elements.amount.addEventListener("input", updateSendReview);
  form.elements.reference.addEventListener("change", updateSendReview);

  form.querySelector("[data-next]").addEventListener("click", async () => {
    const values = data();
    if (step === 1 && !selectedContact()) {
      if (values.phoneSearch) await searchRecipients();
      if (!selectedContact()) return showMessage("Choose a registered demo recipient.", "error");
    }
    if (step === 2) {
      const amount = Number(values.amount);
      if (!Number.isFinite(amount) || amount < SendMoney.SEND_LIMITS.min) return showMessage("Enter an amount of at least 1 demo taka.", "error");
      if (amount > SendMoney.SEND_LIMITS.max) return showMessage("The maximum demo transaction amount is 100,000.", "error");
    }
    showMessage("", "clear");
    setStep(step + 1);
  });

  form.querySelector("[data-prev]").addEventListener("click", () => setStep(step - 1));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (step !== 5) {
      form.querySelector("[data-next]")?.click();
      return;
    }
    if (submitting) return;
    const values = data();
    if ((values.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm.", "error");
    const recipient = selectedContact();
    if (!recipient) return showMessage("Choose a registered demo recipient.", "error");

    try {
      submitting = true;
      form.querySelector("[data-submit]").disabled = true;
      const tx = await SendMoney.submitSendMoney({
        senderId: profile.id,
        receiver: recipient,
        amount: Number(values.amount),
        reference: values.reference,
        idempotencyKey
      });
      document.getElementById("sendSuccess").innerHTML = receiptView(tx, profile.id, "Success");
      setStep(6);
      wireReceiptButtons(tx);
      idempotencyKey = SendMoney.createTransferRequestId(profile.id);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitting = false;
      form.querySelector("[data-submit]").disabled = step === 6;
    }
  });

  if (initialRecipients.length) renderRecipients(initialRecipients);
  if (initialQuery) searchRecipients();
}

async function renderRequestMoney(profile) {
  const initialContacts = RequestMoney.getInitialRequestContacts(profile.id);
  let requests = [];
  let loadError = null;
  try {
    requests = await RequestMoney.listMoneyRequests(profile.id);
  } catch (error) {
    loadError = error;
  }

  const paymentLink = RequestMoney.internalPaymentLink(profile, href);
  const qrValue = RequestMoney.personalQrValue(profile);
  const content = `
    <div class="stack">
      <section class="qr-card card">
        <div class="between">
          <h2 class="section-title">Receive Money</h2>
          <span class="badge">${escapeHtml(RequestMoney.getRequestModeLabel())}</span>
        </div>
        ${fakeQr(qrValue)}
        <span class="badge">Account identifier: ${escapeHtml(profile.phone)}</span>
        <label class="field full"><span>Internal demo payment link</span><input class="input" value="${escapeHtml(paymentLink)}" readonly></label>
        <div class="cluster no-print">
          <a class="button secondary" href="${paymentLink}">${icon("send")} Open payment link</a>
          <button class="button ghost" type="button" data-copy-link="${escapeHtml(paymentLink)}">${icon("copy", 17)} Copy</button>
        </div>
        <p class="muted">This link only routes inside NexaPay. It is not a real financial payment link.</p>
      </section>

      <section class="card card-pad stack">
        <h2 class="section-title">Request demo money</h2>
        <form class="auth-form" id="requestForm">
          <div class="notice">${icon("shield")}<span><strong>Registered demo users only.</strong>Requests are pending until the other user accepts or declines.</span></div>
          <label class="field"><span>Search by demo phone number or name</span><input class="input" name="requestSearch" placeholder="01710000002"></label>
          <button class="button secondary" type="button" data-request-search>${icon("search")} Search users</button>
          <div id="requestContactResults">${recipientResultList(initialContacts)}</div>
          <label class="field"><span>Request from</span><select class="select" name="receiverId" required>${recipientOptions(initialContacts)}</select></label>
          <div id="selectedRequestContact" class="stack-sm"></div>
          <label class="field"><span>Amount</span><input class="input" name="amount" type="number" min="1" max="100000" step="1" required></label>
          <label class="field"><span>Note</span><input class="input" name="note" maxlength="240" placeholder="Shared lunch"></label>
          <button class="button full" type="submit">${icon("request")} Submit request</button>
        </form>
        <div id="formMessage"></div>
      </section>

      <section class="card card-pad stack-sm">
        <div class="between">
          <h2 class="section-title">Requests involving you</h2>
          <span class="badge">${requests.filter((request) => request.status === "pending").length} pending</span>
        </div>
        <div id="requestList">${requestListMarkup(requests, profile.id)}</div>
      </section>
    </div>
  `;
  mobileLayout({ title: "Receive & Request", subtitle: "QR, links, pending requests", content, active: "home", profile });
  wireRequestMoney(profile, initialContacts, requests);
  if (loadError) showMessage(`Could not load requests: ${loadError.message}`, "error");
}

function requestListMarkup(requests, userId) {
  if (!requests.length) return `<div class="empty-state">${icon("request")}<strong>No demo requests</strong><span class="muted">Create one or share your internal link.</span></div>`;
  return `<div class="list">${requests.map((request) => requestCard(request, userId)).join("")}</div>`;
}

function requestStatusBadge(status) {
  const style = status === "pending" ? "warning" : status === "accepted" ? "success" : "";
  return `<span class="badge ${style}">${escapeHtml(status)}</span>`;
}

function requestCard(request, userId) {
  const isReceiver = request.receiver_id === userId;
  const isSender = request.sender_id === userId;
  const otherPerson = isReceiver ? request.sender : request.receiver;
  const title = isReceiver
    ? `${escapeHtml(request.sender?.full_name || "Demo user")} requested ${money(request.amount)}`
    : `You requested ${money(request.amount)} from ${escapeHtml(request.receiver?.full_name || "Demo user")}`;
  const pendingActions = request.status === "pending" && isReceiver
    ? `<span class="cluster"><button class="button ghost" data-request-action="accepted" data-request-id="${request.id}">${icon("check", 17)} Accept</button><button class="button ghost" data-request-action="declined" data-request-id="${request.id}">${icon("x", 17)} Decline</button></span>`
    : request.status === "pending" && isSender
      ? `<button class="button ghost" data-request-action="cancelled" data-request-id="${request.id}">${icon("x", 17)} Cancel</button>`
      : requestStatusBadge(request.status);
  return `
    <div class="list-item">
      <span class="item-main">
        <span class="icon-button">${icon(isReceiver ? "request" : "send", 18)}</span>
        <span class="item-copy">
          <strong>${title}</strong>
          <span>${escapeHtml(otherPerson?.phone || "Demo user")} - ${escapeHtml(request.note || "No note")} - ${dateTime(request.created_at)}</span>
        </span>
      </span>
      ${pendingActions}
    </div>
  `;
}

function wireRequestMoney(profile, initialContacts, initialRequests) {
  const form = document.getElementById("requestForm");
  const contactResults = document.getElementById("requestContactResults");
  const contactSelect = form.elements.receiverId;
  const selectedContactSummary = document.getElementById("selectedRequestContact");
  let contacts = [...initialContacts];
  let requests = [...initialRequests];
  let selectedContact = null;
  let requestKey = RequestMoney.createMoneyRequestId(profile.id);

  const mergeContacts = (items) => {
    const map = new Map(contacts.map((item) => [item.id, item]));
    items.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
    contacts = [...map.values()];
  };

  const renderContacts = (items) => {
    mergeContacts(items);
    contactSelect.innerHTML = recipientOptions(contacts);
    contactResults.innerHTML = recipientResultList(items);
    if (selectedContact) contactSelect.value = selectedContact.id;
  };

  const setContact = (contactId) => {
    selectedContact = contacts.find((contact) => contact.id === contactId) || null;
    contactSelect.value = selectedContact?.id || "";
    selectedContactSummary.innerHTML = selectedContact ? `
      <div class="notice">${icon("check")}<span><strong>${escapeHtml(selectedContact.full_name)}</strong>${escapeHtml(selectedContact.phone)} will receive this request.</span></div>
    ` : "";
  };

  const refreshRequests = async () => {
    requests = await RequestMoney.listMoneyRequests(profile.id);
    document.getElementById("requestList").innerHTML = requestListMarkup(requests, profile.id);
  };

  const searchContacts = async () => {
    const button = form.querySelector("[data-request-search]");
    button.disabled = true;
    showMessage("", "clear");
    try {
      const results = await RequestMoney.searchRequestContacts(form.elements.requestSearch.value, profile.id);
      renderContacts(results);
      if (results.length === 1) setContact(results[0].id);
      if (!results.length) showMessage("No matching registered demo customer was found.", "error");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  };

  form.querySelector("[data-request-search]").addEventListener("click", searchContacts);
  form.elements.requestSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchContacts();
    }
  });
  contactResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-recipient]");
    if (button) setContact(button.dataset.pickRecipient);
  });
  contactSelect.addEventListener("change", () => setContact(contactSelect.value));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const receiver = selectedContact || contacts.find((contact) => contact.id === values.receiverId);
    try {
      await RequestMoney.createMoneyRequest({
        senderId: profile.id,
        receiver,
        amount: Number(values.amount),
        note: values.note,
        idempotencyKey: requestKey
      });
      requestKey = RequestMoney.createMoneyRequestId(profile.id);
      event.currentTarget.reset();
      selectedContact = null;
      selectedContactSummary.innerHTML = "";
      showMessage("Demo money request created.", "success");
      await refreshRequests();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  document.getElementById("requestList").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-request-action]");
    if (!button) return;
    const request = requests.find((item) => item.id === button.dataset.requestId);
    if (!request) return showMessage("Money request was not found.", "error");
    button.disabled = true;
    try {
      if (button.dataset.requestAction === "cancelled") {
        await RequestMoney.cancelMoneyRequest({ request, actorId: profile.id });
        showMessage("Pending request cancelled.", "success");
      } else {
        await RequestMoney.respondToMoneyRequest({
          request,
          actorId: profile.id,
          response: button.dataset.requestAction,
          idempotencyKey: RequestMoney.createResponseRequestId(request.id, profile.id)
        });
        showMessage(button.dataset.requestAction === "accepted" ? "Request accepted and transfer completed." : "Request declined.", "success");
      }
      await refreshRequests();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector("[data-copy-link]")?.addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(event.currentTarget.dataset.copyLink);
      showMessage("Internal demo payment link copied.", "success");
    } catch {
      showMessage("Copy is not available in this browser. Select the link field manually.", "error");
    }
  });

  if (initialContacts.length) renderContacts(initialContacts);
}

function renderPayment(profile) {
  const initialMerchants = MerchantPayment.getInitialMerchants();
  const content = `
    <section class="card card-pad stack">
      <div class="between">
        <h2 class="section-title">Merchant Payment</h2>
        <span class="badge">${escapeHtml(MerchantPayment.getMerchantPaymentModeLabel())}</span>
      </div>
      <div class="notice">${icon("shield")}<span><strong>Fictional merchants only.</strong>The merchant receives demo balance. No real checkout, gateway, or bank is connected.</span></div>
      <form class="auth-form" id="merchantPaymentForm">
        <label class="field"><span>Search merchant</span><input class="input" name="merchantSearch" placeholder="Orion Mart, Grocery, NPM-1001"></label>
        <button class="button secondary" type="button" data-merchant-search>${icon("search")} Search merchants</button>
        <div id="merchantResults">${merchantResultList(initialMerchants)}</div>
        <label class="field"><span>Selected merchant</span><select class="select" name="merchantId" required>${merchantOptions(initialMerchants)}</select></label>
        <div id="selectedMerchantSummary"></div>
        <label class="field"><span>Amount</span><input class="input" name="amount" type="number" min="1" max="100000" step="1" required></label>
        <label class="field"><span>Reference</span><input class="input" name="reference" placeholder="Invoice or order note"></label>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
        <div class="review-grid" id="merchantPaymentReview"></div>
        <button class="button accent full" type="submit">${icon("payment")} Confirm payment</button>
      </form>
      <div id="formMessage"></div>
      <div id="merchantPaymentResult"></div>
    </section>
  `;
  mobileLayout({ title: "Payment", subtitle: "Simulated merchant payment", content, active: "home", profile });
  wireMerchantPayment(profile, initialMerchants);
}

function merchantOptions(merchants) {
  return `<option value="">Select merchant</option>${merchants.map((merchant) => `<option value="${merchant.id}">${escapeHtml(merchant.business_name)} - ${escapeHtml(merchant.category)}</option>`).join("")}`;
}

function merchantResultList(merchants) {
  if (!merchants.length) return `<div class="empty-state compact">${icon("merchant")}<strong>No merchants loaded</strong><span class="muted">Search by merchant name, category, or code.</span></div>`;
  return `<div class="list">${merchants.map((merchant) => `
    <div class="list-item">
      <span class="item-main">${avatar(merchant.owner, 38)}<span class="item-copy"><strong>${escapeHtml(merchant.business_name)}</strong><span>${escapeHtml(merchant.category)} - ${escapeHtml(merchant.merchant_code)}</span></span></span>
      <button class="button ghost" type="button" data-pick-merchant="${merchant.id}">${icon("check", 17)} Choose</button>
    </div>
  `).join("")}</div>`;
}

function merchantSummary(merchant) {
  if (!merchant) return "";
  return `<div class="notice">${icon("merchant")}<span><strong>${escapeHtml(merchant.business_name)}</strong>${escapeHtml(merchant.category)} - ${escapeHtml(merchant.merchant_code)}</span></div>`;
}

function wireMerchantPayment(profile, initialMerchants) {
  const form = document.getElementById("merchantPaymentForm");
  const result = document.getElementById("merchantPaymentResult");
  const merchantResults = document.getElementById("merchantResults");
  const merchantSelect = form.elements.merchantId;
  const selectedSummary = document.getElementById("selectedMerchantSummary");
  let merchants = [...initialMerchants];
  let selectedMerchant = null;
  let paymentKey = MerchantPayment.createMerchantPaymentId(profile.id);

  const mergeMerchants = (items) => {
    const map = new Map(merchants.map((item) => [item.id, item]));
    items.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
    merchants = [...map.values()];
  };

  const renderMerchants = (items) => {
    mergeMerchants(items);
    merchantSelect.innerHTML = merchantOptions(merchants);
    merchantResults.innerHTML = merchantResultList(items);
    if (selectedMerchant) merchantSelect.value = selectedMerchant.id;
  };

  const updateReview = () => {
    const values = Object.fromEntries(new FormData(form));
    const amount = Number(values.amount || 0);
    document.getElementById("merchantPaymentReview").innerHTML = reviewRows([
      ["Merchant", selectedMerchant ? `${selectedMerchant.business_name} (${selectedMerchant.merchant_code})` : "Not selected"],
      ["Amount", money(Number.isFinite(amount) ? amount : 0)],
      ["Demo fee", money(0)],
      ["Total deduction", money(Number.isFinite(amount) ? amount : 0)],
      ["Reference", values.reference || "Merchant payment"],
      ["Request ID", paymentKey]
    ]);
  };

  const setMerchant = (merchantId) => {
    selectedMerchant = merchants.find((merchant) => merchant.id === merchantId) || null;
    merchantSelect.value = selectedMerchant?.id || "";
    selectedSummary.innerHTML = merchantSummary(selectedMerchant);
    updateReview();
  };

  const searchMerchants = async () => {
    const button = form.querySelector("[data-merchant-search]");
    button.disabled = true;
    showMessage("", "clear");
    try {
      const found = await MerchantPayment.searchMerchants(form.elements.merchantSearch.value);
      renderMerchants(found);
      if (found.length === 1) setMerchant(found[0].id);
      if (!found.length) showMessage("No active fictional merchant was found.", "error");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  };

  form.querySelector("[data-merchant-search]").addEventListener("click", searchMerchants);
  form.elements.merchantSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchMerchants();
    }
  });
  merchantResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-merchant]");
    if (button) setMerchant(button.dataset.pickMerchant);
  });
  merchantSelect.addEventListener("change", () => setMerchant(merchantSelect.value));
  form.elements.amount.addEventListener("input", updateReview);
  form.elements.reference.addEventListener("input", updateReview);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const merchant = selectedMerchant || merchants.find((item) => item.id === values.merchantId);
    if ((values.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm.", "error");
    try {
      const tx = await MerchantPayment.submitMerchantPayment({
        customerId: profile.id,
        merchant,
        amount: Number(values.amount),
        reference: values.reference,
        idempotencyKey: paymentKey
      });
      paymentKey = MerchantPayment.createMerchantPaymentId(profile.id);
      result.innerHTML = receiptView(tx, profile.id, "Merchant payment completed");
      wireReceiptButtons(tx);
      showMessage("", "clear");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  if (initialMerchants.length) renderMerchants(initialMerchants);
}

function renderScan(profile) {
  const qrFromLink = new URLSearchParams(location.search).get("qr") || "";
  const sample = qrFromLink || MerchantPayment.getInitialMerchants()[0]?.qr_identifier || "NEXAPAY:MERCHANT:NPM-1001";
  const content = `
    <section class="card card-pad stack">
      <div class="between">
        <h2 class="section-title">QR Payment</h2>
        <span class="badge">${escapeHtml(MerchantPayment.getMerchantPaymentModeLabel())}</span>
      </div>
      <div class="notice">${icon("qrcode")}<span><strong>Safe QR simulation</strong>QR data contains only an internal merchant identifier. No tokens, passwords, or secrets are encoded.</span></div>
      ${fakeQr(sample)}
      <form class="auth-form" id="qrForm">
        <label class="field"><span>Merchant QR data</span><input class="input" name="qr" value="${escapeHtml(sample)}" required></label>
        <button class="button full" type="submit">${icon("scan")} Read QR</button>
      </form>
      <div id="merchantResult"></div>
    </section>
  `;
  mobileLayout({ title: "Scan", subtitle: "Simulated QR payment", content, active: "scan", profile });
  wireQrPayment(profile);
  if (qrFromLink) document.getElementById("qrForm").requestSubmit();
}

function wireQrPayment(profile) {
  const result = document.getElementById("merchantResult");
  document.getElementById("qrForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("", "clear");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const merchant = await MerchantPayment.getMerchantByQr(values.qr);
      if (!merchant) {
        result.innerHTML = `<div class="error-state">${icon("x")}<strong>Merchant not found</strong><span class="muted">Use a NexaPay demo QR identifier.</span></div>`;
        return;
      }
      const paymentKey = MerchantPayment.createMerchantPaymentId(profile.id);
      result.innerHTML = `
        <form class="auth-form" id="qrPayForm">
          ${merchantSummary(merchant)}
          <input type="hidden" name="merchantId" value="${merchant.id}">
          <label class="field"><span>Amount</span><input class="input" name="amount" type="number" min="1" max="100000" step="1" required></label>
          <label class="field"><span>Reference</span><input class="input" name="reference" value="QR Payment"></label>
          <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
          <div class="review-grid" id="qrPaymentReview"></div>
          <button class="button accent full" type="submit">${icon("payment")} Confirm QR payment</button>
        </form>
      `;
      const payForm = document.getElementById("qrPayForm");
      const updateQrReview = () => {
        const payValues = Object.fromEntries(new FormData(payForm));
        const amount = Number(payValues.amount || 0);
        document.getElementById("qrPaymentReview").innerHTML = reviewRows([
          ["Merchant", `${merchant.business_name} (${merchant.merchant_code})`],
          ["Amount", money(Number.isFinite(amount) ? amount : 0)],
          ["Demo fee", money(0)],
          ["Reference", payValues.reference || "QR Payment"],
          ["Request ID", paymentKey]
        ]);
      };
      payForm.elements.amount.addEventListener("input", updateQrReview);
      payForm.elements.reference.addEventListener("input", updateQrReview);
      updateQrReview();
      payForm.addEventListener("submit", async (payEvent) => {
        payEvent.preventDefault();
        const payValues = Object.fromEntries(new FormData(payEvent.currentTarget));
        if ((payValues.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm.", "error");
        try {
          const tx = await MerchantPayment.submitMerchantPayment({
            customerId: profile.id,
            merchant,
            amount: Number(payValues.amount),
            reference: payValues.reference || "QR Payment",
            idempotencyKey: paymentKey,
            channel: "qr_payment"
          });
          result.innerHTML = receiptView(tx, profile.id, "QR payment completed");
          wireReceiptButtons(tx);
        } catch (error) {
          showMessage(error.message, "error");
        }
      });
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function renderAddMoney(profile) {
  const wallet = Wallet.getDashboardData(profile.id).wallet;
  const requestId = Funding.createFundingRequestId("add-money", profile.id);
  const content = `
    <section class="card card-pad stack" id="addMoneyFlow">
      <div class="between">
        <h2 class="section-title">Add Demo Money</h2>
        <span class="badge">${escapeHtml(Funding.getFundingModeLabel())}</span>
      </div>
      <div class="notice">${icon("shield")}<span><strong>No real bank or card is connected.</strong>These fictional sources only add educational demo balance inside NexaPay.</span></div>
      <div class="metric-grid">
        <div class="metric"><span>Current demo balance</span><strong>${money(wallet.balance)}</strong></div>
        <div class="metric"><span>Daily add limit</span><strong>${money(Funding.ADD_MONEY_DAILY_LIMIT)}</strong></div>
      </div>
      <form class="auth-form" id="addMoneyForm">
        <label class="field"><span>Fictional funding source</span><select class="select" name="source" required>${Funding.DEMO_FUNDING_SOURCES.map((source) => `<option value="${escapeHtml(source.name)}">${escapeHtml(source.name)} - ${escapeHtml(source.type)}</option>`).join("")}</select></label>
        <fieldset class="field">
          <legend>Predefined demo amount</legend>
          <div class="amount-picker">
            ${Funding.ADD_MONEY_AMOUNTS.map((value) => `<button class="button secondary" type="button" data-add-amount="${value}" aria-pressed="false">${money(value)}</button>`).join("")}
          </div>
        </fieldset>
        <label class="field"><span>Selected amount</span><input class="input" name="amount" type="number" readonly required placeholder="Choose an amount above"></label>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" autocomplete="off" placeholder="Type DEMO" required></label>
        <div class="review-grid" id="addMoneyReview"></div>
        <button class="button accent full" type="submit">${icon("add")} Add demo balance</button>
      </form>
      <div id="formMessage"></div>
    </section>
  `;
  mobileLayout({ title: "Add Money", subtitle: "Fake funding source only", content, active: "home", profile });
  wireAddMoney(profile, wallet, requestId);
}

function renderCashOut(profile) {
  const agents = Funding.getInitialAgents();
  const wallet = Wallet.getDashboardData(profile.id).wallet;
  const content = `
    <section class="card card-pad stack" id="cashOutFlow">
      <div class="between">
        <h2 class="section-title">Cash Out Simulation</h2>
        <span class="badge">${escapeHtml(Funding.getFundingModeLabel())}</span>
      </div>
      <div class="notice warning">${icon("cash")}<span><strong>Simulation Only - No Real Cash Is Dispensed.</strong>Only registered fictional NexaPay demo agents can receive this simulated cash-out record.</span></div>
      <form class="auth-form" id="cashOutForm">
        <label class="field"><span>Search registered demo agents</span><input class="input" name="agentSearch" placeholder="Name, agent code, or demo location"></label>
        <button class="button secondary" type="button" data-agent-search>${icon("search")} Search agents</button>
        <div id="agentResults">${cashOutAgentList(agents)}</div>
        <label class="field"><span>Selected demo agent</span><select class="select" name="agentId" required>${cashOutAgentOptions(agents)}</select></label>
        <div id="selectedAgentSummary"></div>
        <label class="field"><span>Demo cash-out amount</span><input class="input" name="amount" type="number" min="1" max="100000" step="0.01" required></label>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" autocomplete="off" placeholder="Type DEMO" required></label>
        <div class="review-grid" id="cashOutReview"></div>
        <button class="button accent full" type="submit">${icon("cash")} Confirm simulated cash out</button>
      </form>
      <div id="formMessage"></div>
    </section>
  `;
  mobileLayout({ title: "Cash Out", subtitle: "Agent simulation", content, active: "home", profile });
  wireCashOut(profile, wallet, agents);
}

function wireAddMoney(profile, wallet, requestId) {
  const form = document.getElementById("addMoneyForm");
  const flow = document.getElementById("addMoneyFlow");
  const submit = form.querySelector('[type="submit"]');

  const updateReview = () => {
    const values = Object.fromEntries(new FormData(form));
    const amount = Number(values.amount || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    document.getElementById("addMoneyReview").innerHTML = reviewRows([
      ["Source", values.source || "Not selected"],
      ["Demo amount", money(safeAmount)],
      ["Demo fee", money(0)],
      ["Balance after", money(Number(wallet.balance) + safeAmount)],
      ["Request ID", requestId]
    ]);
  };

  form.querySelectorAll("[data-add-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      form.elements.amount.value = button.dataset.addAmount;
      form.querySelectorAll("[data-add-amount]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
      });
      updateReview();
    });
  });
  form.elements.source.addEventListener("change", updateReview);
  updateReview();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if ((values.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm this simulation.", "error");
    submit.disabled = true;
    showMessage("", "clear");
    try {
      const tx = await Funding.addDemoMoney({
        userId: profile.id,
        amount: Number(values.amount),
        source: values.source,
        idempotencyKey: requestId
      });
      flow.outerHTML = receiptView(tx, profile.id, "Demo money added");
      wireReceiptButtons(tx);
    } catch (error) {
      showMessage(error.message, "error");
      submit.disabled = false;
    }
  });
}

function cashOutAgentOptions(agents) {
  return `<option value="">Select a registered demo agent</option>${agents.map((agent) => `<option value="${agent.id}">${escapeHtml(agent.profile.full_name)} - ${escapeHtml(agent.agent_code)}</option>`).join("")}`;
}

function cashOutAgentList(agents) {
  if (!agents.length) return `<div class="empty-state compact">${icon("agent")}<strong>No agents loaded</strong><span class="muted">Search the registered demo-agent directory.</span></div>`;
  return `<div class="list">${agents.map((agent) => `
    <div class="list-item">
      <span class="item-main">${avatar(agent.profile, 38)}<span class="item-copy"><strong>${escapeHtml(agent.profile.full_name)}</strong><span>${escapeHtml(agent.agent_code)} - ${escapeHtml(agent.location)}</span></span></span>
      <button class="button ghost" type="button" data-pick-agent="${agent.id}">${icon("check", 17)} Choose</button>
    </div>
  `).join("")}</div>`;
}

function cashOutAgentSummary(agent) {
  if (!agent) return "";
  return `<div class="notice">${icon("agent")}<span><strong>${escapeHtml(agent.profile.full_name)}</strong>${escapeHtml(agent.agent_code)} - ${escapeHtml(agent.location)}</span></div>`;
}

function wireCashOut(profile, wallet, initialAgents) {
  const form = document.getElementById("cashOutForm");
  const flow = document.getElementById("cashOutFlow");
  const result = document.getElementById("agentResults");
  const select = form.elements.agentId;
  const summary = document.getElementById("selectedAgentSummary");
  const submit = form.querySelector('[type="submit"]');
  let agents = [...initialAgents];
  let selectedAgent = null;
  const requestId = Funding.createFundingRequestId("cash-out", profile.id);

  const mergeAgents = (items) => {
    const map = new Map(agents.map((agent) => [agent.id, agent]));
    items.forEach((agent) => map.set(agent.id, { ...map.get(agent.id), ...agent }));
    agents = [...map.values()];
  };

  const updateReview = () => {
    const amount = Number(form.elements.amount.value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const fee = Funding.calculateCashOutFee(safeAmount);
    const total = safeAmount + fee;
    document.getElementById("cashOutReview").innerHTML = reviewRows([
      ["Registered agent", selectedAgent ? `${selectedAgent.profile.full_name} (${selectedAgent.agent_code})` : "Not selected"],
      ["Cash-out amount", money(safeAmount)],
      ["Demo fee (1%)", money(fee)],
      ["Total deduction", money(total)],
      ["Available balance", money(wallet.balance)],
      ["Balance after", money(Math.max(0, Number(wallet.balance) - total))],
      ["Request ID", requestId]
    ]);
  };

  const setAgent = (agentId) => {
    selectedAgent = agents.find((agent) => agent.id === agentId) || null;
    select.value = selectedAgent?.id || "";
    summary.innerHTML = cashOutAgentSummary(selectedAgent);
    updateReview();
  };

  const renderAgents = (items) => {
    mergeAgents(items);
    result.innerHTML = cashOutAgentList(items);
    select.innerHTML = cashOutAgentOptions(agents);
    if (selectedAgent) select.value = selectedAgent.id;
  };

  const searchAgents = async () => {
    const button = form.querySelector("[data-agent-search]");
    button.disabled = true;
    showMessage("", "clear");
    try {
      const found = await Funding.searchAgents(form.elements.agentSearch.value);
      renderAgents(found);
      if (found.length === 1) setAgent(found[0].id);
      if (!found.length) showMessage("No active registered demo agent was found.", "error");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  };

  result.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-agent]");
    if (button) setAgent(button.dataset.pickAgent);
  });
  form.querySelector("[data-agent-search]").addEventListener("click", searchAgents);
  form.elements.agentSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchAgents();
    }
  });
  select.addEventListener("change", () => setAgent(select.value));
  form.elements.amount.addEventListener("input", updateReview);
  updateReview();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const agent = selectedAgent || agents.find((item) => item.id === values.agentId);
    if ((values.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm this simulation.", "error");
    submit.disabled = true;
    showMessage("", "clear");
    try {
      const tx = await Funding.cashOut({
        userId: profile.id,
        agent,
        amount: Number(values.amount),
        idempotencyKey: requestId
      });
      flow.outerHTML = receiptView(tx, profile.id, "Cash out simulation completed");
      wireReceiptButtons(tx);
    } catch (error) {
      showMessage(error.message, "error");
      submit.disabled = false;
    }
  });

  if (initialAgents.length) renderAgents(initialAgents);
  else searchAgents();
}

function serviceStepDots(total = 6) {
  return `<div class="stepper" aria-label="Service steps" style="grid-template-columns:repeat(${total}, 1fr)">${Array.from({ length: total }, (_, index) => `<span class="step-dot ${index === 0 ? "active" : ""}" data-dot="${index + 1}"></span>`).join("")}</div>`;
}

function optionTags(items, placeholder) {
  return `<option value="">${escapeHtml(placeholder)}</option>${items.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}`;
}

function providerOptionTags(providers, categoryId) {
  const filtered = providers.filter((provider) => provider.category_id === categoryId);
  if (!filtered.length) return `<option value="">No active fictional providers</option>`;
  return optionTags(filtered, "Choose provider");
}

function serviceById(items, id) {
  return items.find((item) => item.id === id) || null;
}

async function renderRecharge(profile) {
  const operators = await ServicePayment.listRechargeOperators();
  const balance = Wallet.getDashboardData(profile.id).wallet?.balance || 0;
  const content = `
    <form class="card card-pad stack" id="rechargeWizard" data-step="1">
      <div class="between">
        <span class="badge">${escapeHtml(ServicePayment.getServiceModeLabel())}</span>
        <span class="muted">Fictional telecom flow</span>
      </div>
      ${serviceStepDots()}
      <section class="wizard-step" data-step-panel="1">
        <h2 class="section-title">Step 1: Enter demo phone</h2>
        <div class="notice">${icon("shield")}<span><strong>No real mobile recharge.</strong>Use a fictional phone number for this simulator only.</span></div>
        <label class="field"><span>Demo phone number</span><input class="input" name="phone" inputmode="tel" placeholder="01710000000" required></label>
      </section>
      <section class="wizard-step" data-step-panel="2" hidden>
        <h2 class="section-title">Step 2: Choose operator</h2>
        <label class="field"><span>Fictional operator</span><select class="select" name="operatorId" required>${optionTags(operators, "Choose operator")}</select></label>
        <label class="field"><span>Plan type</span><select class="select" name="planType"><option value="prepaid">Prepaid</option><option value="postpaid">Postpaid</option></select></label>
      </section>
      <section class="wizard-step" data-step-panel="3" hidden>
        <h2 class="section-title">Step 3: Enter amount</h2>
        <div class="notice">${icon("cash")}<span><strong>Available demo balance</strong>${money(balance)}. Recharge range ${money(ServicePayment.SERVICE_LIMITS.recharge.min)} to ${money(ServicePayment.SERVICE_LIMITS.recharge.max)}.</span></div>
        <div class="amount-picker">${ServicePayment.RECHARGE_AMOUNTS.map((value) => `<button class="button secondary" type="button" data-service-amount="${value}">${money(value)}</button>`).join("")}</div>
        <label class="field"><span>Custom amount</span><input class="input" name="amount" type="number" min="${ServicePayment.SERVICE_LIMITS.recharge.min}" max="${ServicePayment.SERVICE_LIMITS.recharge.max}" step="1" required></label>
        <div id="rechargePreview" class="review-grid"></div>
      </section>
      <section class="wizard-step" data-step-panel="4" hidden>
        <h2 class="section-title">Step 4: Review recharge</h2>
        <div class="review-grid" id="rechargeReview"></div>
      </section>
      <section class="wizard-step" data-step-panel="5" hidden>
        <h2 class="section-title">Step 5: Confirm simulation</h2>
        <div class="notice">${icon("shield")}<span><strong>No OTP or telecom account access.</strong>Type DEMO to create a simulated transaction record.</span></div>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
      </section>
      <section class="wizard-step" data-step-panel="6" hidden>
        <div id="rechargeSuccess"></div>
      </section>
      <div class="between no-print">
        <button class="button secondary" type="button" data-prev hidden>${icon("arrow-left")} Back</button>
        <button class="button" type="button" data-next>Next ${icon("send")}</button>
        <button class="button accent" type="submit" data-submit hidden>${icon("check")} Confirm</button>
      </div>
      <div id="formMessage"></div>
    </form>
  `;
  mobileLayout({ title: "Recharge", subtitle: "Mobile Recharge Simulation", content, active: "home", profile });
  wireRecharge(profile, operators);
}

async function renderBills(profile) {
  const [categories, providers] = await Promise.all([
    ServicePayment.listBillCategories(),
    ServicePayment.listBillProviders()
  ]);
  const balance = Wallet.getDashboardData(profile.id).wallet?.balance || 0;
  const firstCategoryId = categories[0]?.id || "";
  const content = `
    <form class="card card-pad stack" id="billWizard" data-step="1">
      <div class="between">
        <span class="badge">${escapeHtml(ServicePayment.getServiceModeLabel())}</span>
        <span class="muted">Fictional provider flow</span>
      </div>
      ${serviceStepDots()}
      <section class="wizard-step" data-step-panel="1">
        <h2 class="section-title">Step 1: Choose provider</h2>
        <div class="notice">${icon("shield")}<span><strong>No real bill payment.</strong>Providers and account numbers are fictional demo data.</span></div>
        <label class="field"><span>Bill category</span><select class="select" name="categoryId" required>${optionTags(categories, "Choose category")}</select></label>
        <label class="field"><span>Fictional provider</span><select class="select" name="providerId" required>${providerOptionTags(providers, firstCategoryId)}</select></label>
      </section>
      <section class="wizard-step" data-step-panel="2" hidden>
        <h2 class="section-title">Step 2: Enter account</h2>
        <label class="field"><span>Demo account number</span><input class="input" name="accountNumber" placeholder="DEMO-123456" required></label>
      </section>
      <section class="wizard-step" data-step-panel="3" hidden>
        <h2 class="section-title">Step 3: Enter amount</h2>
        <div class="notice">${icon("cash")}<span><strong>Available demo balance</strong>${money(balance)}. Bill range ${money(ServicePayment.SERVICE_LIMITS.bill_payment.min)} to ${money(ServicePayment.SERVICE_LIMITS.bill_payment.max)}.</span></div>
        <label class="field"><span>Amount</span><input class="input" name="amount" type="number" min="${ServicePayment.SERVICE_LIMITS.bill_payment.min}" max="${ServicePayment.SERVICE_LIMITS.bill_payment.max}" step="1" required></label>
        <div id="billPreview" class="review-grid"></div>
      </section>
      <section class="wizard-step" data-step-panel="4" hidden>
        <h2 class="section-title">Step 4: Review bill</h2>
        <div class="review-grid" id="billReview"></div>
      </section>
      <section class="wizard-step" data-step-panel="5" hidden>
        <h2 class="section-title">Step 5: Confirm simulation</h2>
        <div class="notice">${icon("shield")}<span><strong>No real provider connection.</strong>Type DEMO to create a simulated bill transaction record.</span></div>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
      </section>
      <section class="wizard-step" data-step-panel="6" hidden>
        <div id="billSuccess"></div>
      </section>
      <div class="between no-print">
        <button class="button secondary" type="button" data-prev hidden>${icon("arrow-left")} Back</button>
        <button class="button" type="button" data-next>Next ${icon("send")}</button>
        <button class="button accent" type="submit" data-submit hidden>${icon("check")} Confirm</button>
      </div>
      <div id="formMessage"></div>
    </form>
  `;
  mobileLayout({ title: "Bills", subtitle: "Bill Payment Simulation", content, active: "home", profile });
  wireBills(profile, categories, providers);
}

async function renderBankTransfer(profile) {
  const banks = await ServicePayment.listBanks();
  const balance = Wallet.getDashboardData(profile.id).wallet?.balance || 0;
  const content = `
    <form class="card card-pad stack" id="bankWizard" data-step="1">
      <div class="between">
        <span class="badge">${escapeHtml(ServicePayment.getServiceModeLabel())}</span>
        <span class="muted">Demo Bank Transfer</span>
      </div>
      ${serviceStepDots()}
      <section class="wizard-step" data-step-panel="1">
        <h2 class="section-title">Step 1: Choose bank</h2>
        <div class="notice">${icon("shield")}<span><strong>Fictional banks only.</strong>No real bank account, routing network, or credential is contacted.</span></div>
        <label class="field"><span>Demo bank</span><select class="select" name="bankId" required>${optionTags(banks, "Choose demo bank")}</select></label>
      </section>
      <section class="wizard-step" data-step-panel="2" hidden>
        <h2 class="section-title">Step 2: Receiver details</h2>
        <label class="field"><span>Fictional account number</span><input class="input" name="accountNumber" placeholder="9000-0000-0000" required></label>
        <label class="field"><span>Receiver name</span><input class="input" name="receiverName" placeholder="Demo Receiver" required></label>
      </section>
      <section class="wizard-step" data-step-panel="3" hidden>
        <h2 class="section-title">Step 3: Amount and reference</h2>
        <div class="notice">${icon("cash")}<span><strong>Available demo balance</strong>${money(balance)}. Bank transfers include a 1% demo fee.</span></div>
        <label class="field"><span>Amount</span><input class="input" name="amount" type="number" min="${ServicePayment.SERVICE_LIMITS.bank_transfer.min}" max="${ServicePayment.SERVICE_LIMITS.bank_transfer.max}" step="1" required></label>
        <label class="field"><span>Reference</span><input class="input" name="reference" maxlength="120" placeholder="Demo Bank Transfer"></label>
        <div id="bankPreview" class="review-grid"></div>
      </section>
      <section class="wizard-step" data-step-panel="4" hidden>
        <h2 class="section-title">Step 4: Review transfer</h2>
        <div class="review-grid" id="bankReview"></div>
      </section>
      <section class="wizard-step" data-step-panel="5" hidden>
        <h2 class="section-title">Step 5: Confirm simulation</h2>
        <div class="notice">${icon("shield")}<span><strong>No real banking PIN.</strong>Type DEMO to create a simulated bank transfer transaction.</span></div>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
      </section>
      <section class="wizard-step" data-step-panel="6" hidden>
        <div id="bankSuccess"></div>
      </section>
      <div class="between no-print">
        <button class="button secondary" type="button" data-prev hidden>${icon("arrow-left")} Back</button>
        <button class="button" type="button" data-next>Next ${icon("send")}</button>
        <button class="button accent" type="submit" data-submit hidden>${icon("check")} Confirm</button>
      </div>
      <div id="formMessage"></div>
    </form>
  `;
  mobileLayout({ title: "Bank Transfer", subtitle: "Demo Bank Transfer", content, active: "home", profile });
  wireBankTransfer(profile, banks);
}

function setWizardStep(form, step, total = 6) {
  const nextStep = Math.max(1, Math.min(total, step));
  form.dataset.step = String(nextStep);
  form.querySelectorAll("[data-step-panel]").forEach((panel) => panel.hidden = Number(panel.dataset.stepPanel) !== nextStep);
  form.querySelectorAll("[data-dot]").forEach((dot) => dot.classList.toggle("active", Number(dot.dataset.dot) <= nextStep));
  form.querySelector("[data-prev]").hidden = nextStep === 1 || nextStep === total;
  form.querySelector("[data-next]").hidden = nextStep >= total - 1;
  form.querySelector("[data-submit]").hidden = nextStep !== total - 1;
  return nextStep;
}

function setServiceAmount(form, amount, update) {
  form.elements.amount.value = amount;
  form.querySelectorAll("[data-service-amount]").forEach((button) => button.classList.toggle("selected", button.dataset.serviceAmount === String(amount)));
  update();
}

function wireServiceAmountButtons(form, update) {
  form.querySelectorAll("[data-service-amount]").forEach((button) => {
    button.addEventListener("click", () => setServiceAmount(form, button.dataset.serviceAmount, update));
  });
}

function wireRecharge(profile, operators) {
  const form = document.getElementById("rechargeWizard");
  let step = 1;
  let requestId = ServicePayment.createServiceRequestId("recharge", profile.id);
  let submitting = false;

  const values = () => Object.fromEntries(new FormData(form));
  const selectedOperator = () => serviceById(operators, values().operatorId);
  const updateReview = () => {
    const data = values();
    const amount = Number(data.amount || 0);
    const operator = selectedOperator();
    const rows = [
      ["Demo phone", data.phone || "Not entered"],
      ["Operator", operator?.name || "Not selected"],
      ["Plan type", data.planType || "prepaid"],
      ["Amount", money(Number.isFinite(amount) ? amount : 0)],
      ["Demo fee", money(0)],
      ["Total deduction", money(Number.isFinite(amount) ? amount : 0)],
      ["Request ID", requestId]
    ];
    document.getElementById("rechargeReview").innerHTML = reviewRows(rows);
    document.getElementById("rechargePreview").innerHTML = reviewRows([
      ["Demo fee", money(0)],
      ["Total deduction", money(Number.isFinite(amount) ? amount : 0)]
    ]);
  };

  const validateStep = () => {
    const data = values();
    if (step === 1 && !/^[0-9\s-]{8,18}$/.test(data.phone || "")) return "Enter an 8 to 15 digit demo phone number.";
    if (step === 2 && !selectedOperator()) return "Choose a fictional recharge operator.";
    if (step === 3) {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount < ServicePayment.SERVICE_LIMITS.recharge.min) return "Enter a recharge amount of at least 20 demo taka.";
      if (amount > ServicePayment.SERVICE_LIMITS.recharge.max) return "The maximum recharge simulation is 5,000 demo taka.";
    }
    return "";
  };

  form.elements.amount.addEventListener("input", updateReview);
  form.elements.operatorId.addEventListener("change", updateReview);
  form.elements.planType.addEventListener("change", updateReview);
  form.elements.phone.addEventListener("input", updateReview);
  wireServiceAmountButtons(form, updateReview);

  form.querySelector("[data-next]").addEventListener("click", () => {
    const error = validateStep();
    if (error) return showMessage(error, "error");
    showMessage("", "clear");
    step = setWizardStep(form, step + 1);
    if (step === 4) updateReview();
  });
  form.querySelector("[data-prev]").addEventListener("click", () => {
    step = setWizardStep(form, step - 1);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const data = values();
    if ((data.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm this simulation.", "error");
    try {
      submitting = true;
      form.querySelector("[data-submit]").disabled = true;
      const tx = await ServicePayment.submitRecharge({
        userId: profile.id,
        phone: data.phone,
        operator: selectedOperator(),
        planType: data.planType,
        amount: Number(data.amount),
        idempotencyKey: requestId
      });
      document.getElementById("rechargeSuccess").innerHTML = receiptView(tx, profile.id, "Recharge simulation completed");
      step = setWizardStep(form, 6);
      wireReceiptButtons(tx);
      requestId = ServicePayment.createServiceRequestId("recharge", profile.id);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitting = false;
      form.querySelector("[data-submit]").disabled = step === 6;
    }
  });
  updateReview();
}

function wireBills(profile, categories, providers) {
  const form = document.getElementById("billWizard");
  let step = 1;
  let requestId = ServicePayment.createServiceRequestId("bill", profile.id);
  let submitting = false;

  const values = () => Object.fromEntries(new FormData(form));
  const selectedCategory = () => serviceById(categories, values().categoryId);
  const selectedProvider = () => serviceById(providers, values().providerId);
  const refreshProviders = () => {
    form.elements.providerId.innerHTML = providerOptionTags(providers, form.elements.categoryId.value);
  };
  const updateReview = () => {
    const data = values();
    const amount = Number(data.amount || 0);
    const rows = [
      ["Category", selectedCategory()?.name || "Not selected"],
      ["Provider", selectedProvider()?.name || "Not selected"],
      ["Demo account", data.accountNumber || "Not entered"],
      ["Amount", money(Number.isFinite(amount) ? amount : 0)],
      ["Demo fee", money(0)],
      ["Total deduction", money(Number.isFinite(amount) ? amount : 0)],
      ["Request ID", requestId]
    ];
    document.getElementById("billReview").innerHTML = reviewRows(rows);
    document.getElementById("billPreview").innerHTML = reviewRows([
      ["Demo fee", money(0)],
      ["Total deduction", money(Number.isFinite(amount) ? amount : 0)]
    ]);
  };

  const validateStep = () => {
    const data = values();
    if (step === 1 && (!selectedCategory() || !selectedProvider())) return "Choose a fictional bill category and provider.";
    if (step === 2 && !/^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$/.test(data.accountNumber || "")) return "Enter a valid fictional bill account number.";
    if (step === 3) {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount < ServicePayment.SERVICE_LIMITS.bill_payment.min) return "Enter a bill amount greater than zero.";
      if (amount > ServicePayment.SERVICE_LIMITS.bill_payment.max) return "The maximum bill payment simulation is 100,000 demo taka.";
    }
    return "";
  };

  if (!form.elements.categoryId.value && categories[0]) {
    form.elements.categoryId.value = categories[0].id;
    refreshProviders();
  }
  form.elements.categoryId.addEventListener("change", () => {
    refreshProviders();
    updateReview();
  });
  form.elements.providerId.addEventListener("change", updateReview);
  form.elements.accountNumber.addEventListener("input", updateReview);
  form.elements.amount.addEventListener("input", updateReview);

  form.querySelector("[data-next]").addEventListener("click", () => {
    const error = validateStep();
    if (error) return showMessage(error, "error");
    showMessage("", "clear");
    step = setWizardStep(form, step + 1);
    if (step === 4) updateReview();
  });
  form.querySelector("[data-prev]").addEventListener("click", () => {
    step = setWizardStep(form, step - 1);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const data = values();
    if ((data.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm this simulation.", "error");
    try {
      submitting = true;
      form.querySelector("[data-submit]").disabled = true;
      const tx = await ServicePayment.submitBillPayment({
        userId: profile.id,
        category: selectedCategory(),
        provider: selectedProvider(),
        accountNumber: data.accountNumber,
        amount: Number(data.amount),
        idempotencyKey: requestId
      });
      document.getElementById("billSuccess").innerHTML = receiptView(tx, profile.id, "Bill payment simulation completed");
      step = setWizardStep(form, 6);
      wireReceiptButtons(tx);
      requestId = ServicePayment.createServiceRequestId("bill", profile.id);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitting = false;
      form.querySelector("[data-submit]").disabled = step === 6;
    }
  });
  updateReview();
}

function wireBankTransfer(profile, banks) {
  const form = document.getElementById("bankWizard");
  let step = 1;
  let requestId = ServicePayment.createServiceRequestId("bank", profile.id);
  let submitting = false;

  const values = () => Object.fromEntries(new FormData(form));
  const selectedBank = () => serviceById(banks, values().bankId);
  const updateReview = () => {
    const data = values();
    const amount = Number(data.amount || 0);
    const fee = Wallet.calculateFee("bank_transfer", Number.isFinite(amount) ? amount : 0);
    const total = (Number.isFinite(amount) ? amount : 0) + fee;
    const rows = [
      ["Demo bank", selectedBank()?.name || "Not selected"],
      ["Fictional account", data.accountNumber || "Not entered"],
      ["Receiver", data.receiverName || "Not entered"],
      ["Amount", money(Number.isFinite(amount) ? amount : 0)],
      ["Demo fee", money(fee)],
      ["Total deduction", money(total)],
      ["Reference", data.reference || "Demo Bank Transfer"],
      ["Request ID", requestId]
    ];
    document.getElementById("bankReview").innerHTML = reviewRows(rows);
    document.getElementById("bankPreview").innerHTML = reviewRows([
      ["Demo fee", money(fee)],
      ["Total deduction", money(total)]
    ]);
  };

  const validateStep = () => {
    const data = values();
    if (step === 1 && !selectedBank()) return "Choose a fictional demo bank.";
    if (step === 2) {
      if (!/^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$/.test(data.accountNumber || "")) return "Enter a valid fictional bank account number.";
      if (!data.receiverName || data.receiverName.trim().length < 2) return "Enter a fictional receiver name.";
    }
    if (step === 3) {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount < ServicePayment.SERVICE_LIMITS.bank_transfer.min) return "Enter a bank transfer amount greater than zero.";
      if (amount > ServicePayment.SERVICE_LIMITS.bank_transfer.max) return "The maximum bank transfer simulation is 100,000 demo taka.";
    }
    return "";
  };

  form.elements.bankId.addEventListener("change", updateReview);
  form.elements.accountNumber.addEventListener("input", updateReview);
  form.elements.receiverName.addEventListener("input", updateReview);
  form.elements.amount.addEventListener("input", updateReview);
  form.elements.reference.addEventListener("input", updateReview);
  form.querySelector("[data-next]").addEventListener("click", () => {
    const error = validateStep();
    if (error) return showMessage(error, "error");
    showMessage("", "clear");
    step = setWizardStep(form, step + 1);
    if (step === 4) updateReview();
  });
  form.querySelector("[data-prev]").addEventListener("click", () => {
    step = setWizardStep(form, step - 1);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const data = values();
    if ((data.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm this simulation.", "error");
    try {
      submitting = true;
      form.querySelector("[data-submit]").disabled = true;
      const tx = await ServicePayment.submitBankTransfer({
        userId: profile.id,
        bank: selectedBank(),
        accountNumber: data.accountNumber,
        receiverName: data.receiverName,
        amount: Number(data.amount),
        reference: data.reference,
        idempotencyKey: requestId
      });
      document.getElementById("bankSuccess").innerHTML = receiptView(tx, profile.id, "Bank transfer simulation completed");
      step = setWizardStep(form, 6);
      wireReceiptButtons(tx);
      requestId = ServicePayment.createServiceRequestId("bank", profile.id);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitting = false;
      form.querySelector("[data-submit]").disabled = step === 6;
    }
  });
  updateReview();
}

async function renderSavings(profile, latestTx = null) {
  const goals = await Savings.listSavingsGoals(profile.id);
  const wallet = Wallet.getDashboardData(profile.id).wallet;
  const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0);
  const completed = goals.filter((goal) => goal.status === "completed").length;
  const content = `
    <div class="stack">
      ${latestTx ? receiptView(latestTx, profile.id, "Savings transaction completed") : ""}
      <section class="card card-pad stack">
        <div class="between">
          <h2 class="section-title">Savings overview</h2>
          <span class="badge">${escapeHtml(Savings.getSavingsModeLabel())}</span>
        </div>
        <div class="notice">${icon("shield")}<span><strong>${DISCLAIMER}</strong>Savings goals move only fake demo balance inside NexaPay.</span></div>
        <div class="metric-grid">
          <div class="metric"><span>Total saved</span><strong>${money(totalSaved)}</strong></div>
          <div class="metric"><span>Total targets</span><strong>${money(totalTarget)}</strong></div>
          <div class="metric"><span>Completed goals</span><strong>${completed}</strong></div>
          <div class="metric"><span>Wallet balance</span><strong>${money(wallet?.balance || 0)}</strong></div>
        </div>
      </section>

      <section class="card card-pad stack">
        <h2 class="section-title">Create savings goal</h2>
        <form class="auth-form" id="goalForm">
          <label class="field"><span>Goal title</span><input class="input" name="title" maxlength="120" placeholder="New Laptop" required></label>
          <label class="field"><span>Target amount</span><input class="input" name="targetAmount" type="number" min="1" max="${Savings.SAVINGS_LIMITS.targetMax}" step="1" required></label>
          <label class="field"><span>Target date</span><input class="input" name="targetDate" type="date" required></label>
          <button class="button full" type="submit">${icon("savings")} Create goal</button>
        </form>
        <div id="formMessage"></div>
      </section>

      <section class="stack">
        <div class="section-head"><h2 class="section-title">Your savings goals</h2><span class="badge">${goals.length} active</span></div>
        ${goals.length ? goals.map((goal) => savingsCard(goal)).join("") : `<div class="empty-state">${icon("savings")}<strong>No savings goals yet</strong><span class="muted">Create a target and practice deposits or withdrawals.</span></div>`}
      </section>
    </div>
  `;
  mobileLayout({ title: "Savings", subtitle: "Goals, deposits, withdrawals", content, active: "home", profile });
  if (latestTx) wireReceiptButtons(latestTx);
  wireSavings(profile, goals);
}

function savingsCard(goal) {
  const done = percent(goal.current_amount, goal.target_amount);
  const remaining = Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0));
  const history = (goal.entries || []).slice(0, 4);
  return `
    <section class="card card-pad stack">
      <div class="between">
        <h2 class="section-title">${escapeHtml(goal.title)}</h2>
        <span class="badge ${goal.status === "completed" ? "success" : goal.status === "cancelled" ? "danger" : ""}">${escapeHtml(goal.status)}</span>
      </div>
      <div class="progress" aria-label="${done}% saved"><span style="width:${done}%"></span></div>
      <div class="review-grid">
        ${reviewRows([
          ["Saved", money(goal.current_amount)],
          ["Target", money(goal.target_amount)],
          ["Remaining", money(remaining)],
          ["Target date", dateOnly(goal.target_date)],
          ["Progress", `${done}%`]
        ])}
      </div>
      <div class="grid-2">
        <form class="auth-form" data-savings-action>
          <input type="hidden" name="goalId" value="${goal.id}">
          <input type="hidden" name="direction" value="deposit">
          <label class="field"><span>Deposit amount</span><input class="input" name="amount" type="number" min="1" max="${remaining || 1}" step="1" placeholder="500" required></label>
          <label class="field"><span>Note</span><input class="input" name="note" maxlength="240" placeholder="Monthly save"></label>
          <button class="button secondary full" type="submit">${icon("savings")} Deposit</button>
        </form>
        <form class="auth-form" data-savings-action>
          <input type="hidden" name="goalId" value="${goal.id}">
          <input type="hidden" name="direction" value="withdrawal">
          <label class="field"><span>Withdraw amount</span><input class="input" name="amount" type="number" min="1" max="${goal.current_amount || 1}" step="1" placeholder="500" required></label>
          <label class="field"><span>Note</span><input class="input" name="note" maxlength="240" placeholder="Demo withdrawal"></label>
          <button class="button secondary full" type="submit">${icon("download")} Withdraw</button>
        </form>
      </div>
      <div class="stack-sm">
        <h3 class="section-title">Goal history</h3>
        ${history.length ? `<div class="list">${history.map((entry) => `
          <div class="list-item">
            <span class="item-main">
              <span class="icon-button">${icon(entry.entry_type === "deposit" ? "savings" : "download", 17)}</span>
              <span class="item-copy"><strong>${escapeHtml(txLabel(entry.entry_type))} ${money(entry.amount)}</strong><span>${escapeHtml(entry.note || "No note")} - ${dateTime(entry.created_at)}</span></span>
            </span>
          </div>
        `).join("")}</div>` : `<div class="empty-state compact">${icon("history")}<strong>No entries yet</strong></div>`}
      </div>
    </section>
  `;
}

function wireSavings(profile, goals) {
  const goalForm = document.getElementById("goalForm");
  goalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector("button[type='submit']");
    submit.disabled = true;
    try {
      await Savings.createSavingsGoal(profile.id, Object.fromEntries(new FormData(event.currentTarget)));
      await renderSavings(profile);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelectorAll("[data-savings-action]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const goal = serviceById(goals, values.goalId);
      const submit = event.currentTarget.querySelector("button[type='submit']");
      submit.disabled = true;
      try {
        const result = await Savings.moveSavingsMoney({
          userId: profile.id,
          goal,
          amount: Number(values.amount),
          direction: values.direction,
          note: values.note,
          idempotencyKey: Savings.createSavingsRequestId(values.direction, profile.id)
        });
        await renderSavings(profile, result.transaction);
      } catch (error) {
        showMessage(error.message, "error");
      } finally {
        submit.disabled = false;
      }
    });
  });
}

async function renderDonation(profile) {
  const organizations = await Donation.listDonationOrganizations();
  const wallet = Wallet.getDashboardData(profile.id).wallet;
  const content = `
    <form class="card card-pad stack" id="donationWizard" data-step="1">
      <div class="between">
        <span class="badge">${escapeHtml(Donation.getDonationModeLabel())}</span>
        <span class="muted">Fictional organizations only</span>
      </div>
      ${serviceStepDots(5)}
      <section class="wizard-step" data-step-panel="1">
        <h2 class="section-title">Step 1: Choose organization</h2>
        <div class="notice">${icon("shield")}<span><strong>Fictional demo entities.</strong>No real charity, payment network, or fundraiser is connected.</span></div>
        <label class="field"><span>Organization</span><select class="select" name="organizationId" required>${optionTags(organizations, "Choose fictional organization")}</select></label>
        <div id="donationOrgSummary" class="stack-sm"></div>
      </section>
      <section class="wizard-step" data-step-panel="2" hidden>
        <h2 class="section-title">Step 2: Amount and message</h2>
        <div class="notice">${icon("cash")}<span><strong>Available demo balance</strong>${money(wallet?.balance || 0)}. Donation range ${money(Donation.DONATION_LIMITS.min)} to ${money(Donation.DONATION_LIMITS.max)}.</span></div>
        <label class="field"><span>Demo amount</span><input class="input" name="amount" type="number" min="1" max="${Donation.DONATION_LIMITS.max}" step="1" required></label>
        <label class="field"><span>Optional message</span><textarea class="textarea" name="message" maxlength="240" placeholder="Hope this helps in the demo."></textarea></label>
        <div id="donationPreview" class="review-grid"></div>
      </section>
      <section class="wizard-step" data-step-panel="3" hidden>
        <h2 class="section-title">Step 3: Review donation</h2>
        <div class="review-grid" id="donationReview"></div>
      </section>
      <section class="wizard-step" data-step-panel="4" hidden>
        <h2 class="section-title">Step 4: Confirm simulation</h2>
        <div class="notice">${icon("shield")}<span><strong>No real donation is made.</strong>Type DEMO to create a simulated donation transaction.</span></div>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
      </section>
      <section class="wizard-step" data-step-panel="5" hidden>
        <div id="donationSuccess"></div>
      </section>
      <div class="between no-print">
        <button class="button secondary" type="button" data-prev hidden>${icon("arrow-left")} Back</button>
        <button class="button" type="button" data-next>Next ${icon("send")}</button>
        <button class="button accent" type="submit" data-submit hidden>${icon("check")} Confirm</button>
      </div>
      <div id="formMessage"></div>
    </form>
  `;
  mobileLayout({ title: "Donation", subtitle: "Fictional demo giving", content, active: "home", profile });
  wireDonation(profile, organizations);
}

function wireDonation(profile, organizations) {
  const form = document.getElementById("donationWizard");
  let step = 1;
  let requestId = Donation.createDonationRequestId(profile.id);
  let submitting = false;

  const values = () => Object.fromEntries(new FormData(form));
  const selectedOrganization = () => serviceById(organizations, values().organizationId);
  const updateReview = () => {
    const data = values();
    const amount = Number(data.amount || 0);
    const organization = selectedOrganization();
    document.getElementById("donationOrgSummary").innerHTML = organization ? `
      <div class="notice">${icon("donation")}<span><strong>${escapeHtml(organization.name)}</strong>${escapeHtml(organization.description || "Fictional demo organization")}</span></div>
    ` : "";
    const rows = [
      ["Organization", organization?.name || "Not selected"],
      ["Amount", money(Number.isFinite(amount) ? amount : 0)],
      ["Demo fee", money(0)],
      ["Total deduction", money(Number.isFinite(amount) ? amount : 0)],
      ["Message", data.message || "-"],
      ["Request ID", requestId]
    ];
    document.getElementById("donationReview").innerHTML = reviewRows(rows);
    document.getElementById("donationPreview").innerHTML = reviewRows([
      ["Demo fee", money(0)],
      ["Total deduction", money(Number.isFinite(amount) ? amount : 0)]
    ]);
  };

  const validateStep = () => {
    const data = values();
    if (step === 1 && !selectedOrganization()) return "Choose a fictional demo organization.";
    if (step === 2) {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount < Donation.DONATION_LIMITS.min) return "Enter a donation amount greater than zero.";
      if (amount > Donation.DONATION_LIMITS.max) return "The maximum demo donation is 100,000.";
      if ((data.message || "").length > 240) return "Donation message is too long.";
    }
    return "";
  };

  form.elements.organizationId.addEventListener("change", updateReview);
  form.elements.amount.addEventListener("input", updateReview);
  form.elements.message.addEventListener("input", updateReview);
  form.querySelector("[data-next]").addEventListener("click", () => {
    const error = validateStep();
    if (error) return showMessage(error, "error");
    showMessage("", "clear");
    step = setWizardStep(form, step + 1, 5);
    if (step === 3) updateReview();
  });
  form.querySelector("[data-prev]").addEventListener("click", () => {
    step = setWizardStep(form, step - 1, 5);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const data = values();
    if ((data.confirmation || "").trim().toUpperCase() !== "DEMO") return showMessage("Type DEMO to confirm this simulation.", "error");
    try {
      submitting = true;
      form.querySelector("[data-submit]").disabled = true;
      const tx = await Donation.submitDonation({
        userId: profile.id,
        organization: selectedOrganization(),
        amount: Number(data.amount),
        message: data.message,
        idempotencyKey: requestId
      });
      document.getElementById("donationSuccess").innerHTML = receiptView(tx, profile.id, "Donation simulation completed");
      step = setWizardStep(form, 5, 5);
      wireReceiptButtons(tx);
      requestId = Donation.createDonationRequestId(profile.id);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitting = false;
      form.querySelector("[data-submit]").disabled = step === 5;
    }
  });
  updateReview();
}

function actionCard({ title, notice, fields, button }) {
  return `
    <section class="card card-pad stack">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="notice">${icon("shield")}<span><strong>${DISCLAIMER}</strong>${escapeHtml(notice)}</span></div>
      <form class="auth-form" id="simpleActionForm">
        ${fields}
        <div class="review-grid" id="liveReview"></div>
        <button class="button full" type="submit">${icon("check")} ${escapeHtml(button)}</button>
      </form>
      <div id="formMessage"></div>
    </section>
  `;
}

function wireAmountButtons() {
  document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector('input[name="amount"]');
      if (input) input.value = button.dataset.amount;
    });
  });
}

function wireSimpleForm(action, userId) {
  document.getElementById("simpleActionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const tx = action(values);
      event.currentTarget.parentElement.innerHTML = receiptView(tx, userId, "Completed");
      wireReceiptButtons(tx);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

async function renderTransactions(profile) {
  const all = await Transactions.listTransactions(profile.id);
  const summary = Transactions.summarizeTransactions(all, profile.id);
  const content = `
    <div class="stack">
      <section class="card card-pad stack">
        <div class="between">
          <h2 class="section-title">Transaction history</h2>
          <span class="badge">${summary.count} records</span>
        </div>
        <div class="notice">${icon("shield")}<span><strong>${DISCLAIMER}</strong>Every record shown here is a simulated NexaPay ledger event.</span></div>
        <div class="metric-grid">
          <div class="metric"><span>Money in</span><strong class="amount-in">${money(summary.moneyIn)}</strong></div>
          <div class="metric"><span>Money out</span><strong class="amount-out">${money(summary.moneyOut)}</strong></div>
          <div class="metric"><span>Completed</span><strong>${summary.completed}</strong></div>
          <div class="metric"><span>Pending</span><strong>${summary.pending}</strong></div>
        </div>
      </section>

      <section class="card card-pad stack">
        <div class="filter-row wide">
          <label class="field"><span>Search</span><input class="input" id="txSearch" placeholder="Name, phone, transaction ID, reference"></label>
          <label class="field"><span>Status</span><select class="select" id="txStatus">${Transactions.STATUS_OPTIONS.map((status) => `<option value="${status}">${escapeHtml(txLabel(status))}</option>`).join("")}</select></label>
        </div>
        <div class="filter-row wide">
          <label class="field"><span>From</span><input class="input" id="txFrom" type="date"></label>
          <label class="field"><span>To</span><input class="input" id="txTo" type="date"></label>
        </div>
        <div class="segmented" id="txFilters">
          ${Transactions.TRANSACTION_FILTERS.map((item) => `<button class="segment ${item.id === "all" ? "active" : ""}" data-filter="${item.id}">${escapeHtml(item.label)}</button>`).join("")}
        </div>
        <div class="between">
          <span class="muted" id="txResultCount">${all.length} matching transactions</span>
          <button class="button ghost" type="button" id="txClearFilters">${icon("x", 17)} Clear</button>
        </div>
        <div id="txList">${transactionList(all, profile.id)}</div>
      </section>
    </div>
  `;
  mobileLayout({ title: "Transactions", subtitle: "History, filters, search, receipts", content, active: "transactions", profile });
  const list = document.getElementById("txList");
  const search = document.getElementById("txSearch");
  const status = document.getElementById("txStatus");
  const from = document.getElementById("txFrom");
  const to = document.getElementById("txTo");
  const count = document.getElementById("txResultCount");
  let activeFilter = "all";
  const apply = () => {
    const filtered = Transactions.filterTransactions(all, {
      userId: profile.id,
      filter: activeFilter,
      status: status.value,
      query: search.value,
      from: from.value,
      to: to.value
    });
    count.textContent = `${filtered.length} matching transaction${filtered.length === 1 ? "" : "s"}`;
    list.innerHTML = transactionList(filtered, profile.id);
  };
  [search, status, from, to].forEach((control) => control.addEventListener("input", apply));
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      apply();
    });
  });
  document.getElementById("txClearFilters").addEventListener("click", () => {
    activeFilter = "all";
    search.value = "";
    status.value = "all";
    from.value = "";
    to.value = "";
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
    apply();
  });
}

async function renderTransactionDetails(profile) {
  const params = new URLSearchParams(location.search);
  const tx = await Transactions.getTransactionById(profile.id, params.get("id")) || (await Transactions.listTransactions(profile.id))[0];
  const rolePaths = {
    merchant: ["pages/merchant/merchant-payments.html", "pages/merchant/merchant-dashboard.html"],
    agent: ["pages/agent/agent-transactions.html", "pages/agent/agent-dashboard.html"],
    customer: ["pages/customer/transactions.html", "pages/customer/dashboard.html"]
  };
  const [historyPath, homePath] = rolePaths[profile.role] || rolePaths.customer;
  const content = tx ? receiptView(tx, profile.id, "Transaction Details", { historyPath, homePath }) : `<div class="empty-state">${icon("receipt")}<strong>No transaction found</strong></div>`;
  mobileLayout({ title: "Receipt", subtitle: "Demo transaction details", content, active: "transactions", profile });
  if (tx) wireReceiptButtons(tx);
}

function receiptView(tx, userId, title, options = {}) {
  const direction = userId ? txDirection(tx, userId) : "out";
  const parties = Transactions.partiesFor(tx);
  const amountValue = direction === "in" ? tx.amount : tx.total_amount || tx.amount;
  const historyPath = options.historyPath || "pages/customer/transactions.html";
  const homePath = options.homePath || "pages/customer/dashboard.html";
  return `
    <section class="card card-pad stack">
      <div class="success-state">
        <span class="success-pulse">${icon(tx.status === "completed" ? "check" : "receipt", 32)}</span>
        <strong>${escapeHtml(title)}</strong>
        <span class="${direction === "in" ? "amount-in" : "amount-out"}" style="font-size:1.6rem">${direction === "in" ? "+" : "-"}${money(amountValue)}</span>
      </div>
      <div class="receipt-box" data-receipt>
        <div class="between">${brandRow("Demo receipt")}<span class="badge ${Transactions.statusClass(tx.status)}">${escapeHtml(tx.status || "completed")}</span></div>
        <div class="notice">${icon("shield")}<span><strong>${DISCLAIMER}</strong>This receipt is proof of a simulated database event only.</span></div>
        ${reviewRows([
          ["Transaction type", txLabel(tx.transaction_type)],
          ["Direction", direction === "in" ? "Money In" : "Money Out"],
          ["Status", tx.status || "completed"],
          ...(tx.metadata?.merchant_name ? [["Merchant", tx.metadata.merchant_name]] : []),
          ...(tx.metadata?.source ? [["Demo source", tx.metadata.source]] : []),
          ...(tx.metadata?.agent_name ? [["Registered agent", `${tx.metadata.agent_name} (${tx.metadata.agent_code || "Demo agent"})`]] : []),
          ...(tx.metadata?.agent_location ? [["Agent location", tx.metadata.agent_location]] : []),
          ...(tx.metadata?.operator_name ? [["Fictional operator", tx.metadata.operator_name]] : []),
          ...(tx.metadata?.phone ? [["Demo phone", tx.metadata.phone]] : []),
          ...(tx.metadata?.plan_type ? [["Plan type", tx.metadata.plan_type]] : []),
          ...(tx.metadata?.category_name ? [["Bill category", tx.metadata.category_name]] : []),
          ...(tx.metadata?.provider_name ? [["Fictional provider", tx.metadata.provider_name]] : []),
          ...(tx.metadata?.demo_account_number ? [["Demo account", tx.metadata.demo_account_number]] : []),
          ...(tx.metadata?.bank_name ? [["Demo bank", tx.metadata.bank_name]] : []),
          ...(tx.metadata?.fictional_account_number ? [["Fictional account", tx.metadata.fictional_account_number]] : []),
          ...(tx.metadata?.receiver_name ? [["Fictional receiver", tx.metadata.receiver_name]] : []),
          ...(tx.metadata?.savings_goal_title ? [["Savings goal", tx.metadata.savings_goal_title]] : []),
          ...(tx.metadata?.savings_direction ? [["Savings action", txLabel(tx.metadata.savings_direction)]] : []),
          ...(tx.metadata?.organization_name ? [["Fictional organization", tx.metadata.organization_name]] : []),
          ...(tx.metadata?.message ? [["Demo message", tx.metadata.message]] : []),
          ["Amount", money(tx.amount)],
          ["Fee", money(tx.fee)],
          ["Total", money(tx.total_amount)],
          ["Sender", parties.senderPhone ? `${parties.senderName} (${parties.senderPhone})` : parties.senderName],
          ["Receiver", parties.receiverPhone ? `${parties.receiverName} (${parties.receiverPhone})` : parties.receiverName],
          ["Reference", tx.reference || "-"],
          ["Date and time", dateTime(tx.created_at)],
          ...(tx.idempotency_key ? [["Request ID", tx.idempotency_key]] : []),
          ["Transaction ID", tx.transaction_id]
        ])}
      </div>
      <div class="cluster no-print">
        <button class="button secondary" data-receipt-print>${icon("print")} Print</button>
        <button class="button secondary" data-receipt-download>${icon("download")} Download</button>
        <button class="button secondary" data-receipt-share>${icon("copy")} Share Demo Receipt</button>
        <a class="button secondary" href="${href(historyPath)}">${icon("history")} History</a>
        <a class="button" href="${href(homePath)}">${icon("home")} Back to Home</a>
      </div>
      <div id="formMessage"></div>
    </section>
  `;
}

function wireReceiptButtons(tx, userId = Auth.getCurrentProfile()?.id || "") {
  document.querySelector("[data-receipt-print]")?.addEventListener("click", () => window.print());
  document.querySelector("[data-receipt-download]")?.addEventListener("click", () => {
    const text = Transactions.receiptText(tx, userId);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tx.transaction_id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  });
  document.querySelector("[data-receipt-share]")?.addEventListener("click", async () => {
    const text = Transactions.receiptText(tx, userId);
    try {
      await navigator.clipboard.writeText(text);
      showMessage("Demo receipt text copied.", "success");
    } catch {
      showMessage("Could not copy automatically. Use Download instead.", "error");
    }
  });
}

function notificationIcon(type) {
  if (type?.includes("request")) return "request";
  if (type?.includes("payment")) return "payment";
  if (type?.includes("admin")) return "shield";
  if (type?.includes("received")) return "add";
  if (type?.includes("sent")) return "send";
  return "bell";
}

function notificationList(items, emptyCopy = "No notifications in this view.") {
  if (!items.length) return `<div class="empty-state">${icon("bell")}<strong>${escapeHtml(emptyCopy)}</strong><span class="muted">New simulated wallet activity will appear here.</span></div>`;
  return `<div class="list notification-list">
    ${items.map((item) => `
      <article class="list-item notification-item ${item.is_read ? "" : "unread"}">
        <span class="item-main">
          <span class="icon-button" aria-hidden="true">${icon(notificationIcon(item.type), 18)}</span>
          <span class="item-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.message)}</span>
            <small>${dateTime(item.created_at)}</small>
          </span>
        </span>
        <span class="cluster notification-actions">
          <span class="badge ${item.is_read ? "" : "success"}">${item.is_read ? "Read" : "Unread"}</span>
          <button class="button ghost" data-mark="${item.id}">${item.is_read ? "Mark unread" : "Mark read"}</button>
          <button class="button ghost icon-only" data-delete="${item.id}" aria-label="Delete notification">${icon("trash", 17)}</button>
        </span>
      </article>
    `).join("")}
  </div>`;
}

async function renderNotifications(profile) {
  let notifications = [];
  let loadError = "";
  try {
    notifications = await Notifications.listNotifications(profile.id);
  } catch (error) {
    notifications = Wallet.listNotifications(profile.id);
    loadError = error.message;
  }
  const selectedFilter = new URLSearchParams(location.search).get("view") || "all";
  const groups = Notifications.splitByRead(notifications);
  const visible = selectedFilter === "unread" ? groups.unread : selectedFilter === "read" ? groups.read : notifications;
  const tabs = [
    ["all", "All", notifications.length],
    ["unread", "Unread", groups.unread.length],
    ["read", "Read", groups.read.length]
  ];
  const content = `
    <div class="stack">
      <section class="metric-grid">
        <div class="metric"><span>Total</span><strong>${notifications.length}</strong></div>
        <div class="metric"><span>Unread</span><strong>${groups.unread.length}</strong></div>
        <div class="metric"><span>Read</span><strong>${groups.read.length}</strong></div>
        <div class="metric"><span>Demo only</span><strong>Safe</strong></div>
      </section>
      <section class="card card-pad stack">
        ${loadError ? `<div class="error-state">${icon("shield")}<strong>${escapeHtml(loadError)}</strong></div>` : ""}
        <div class="section-head">
          <div>
            <h2 class="section-title">In-app notifications</h2>
            <p class="muted">Stored per demo account with read, unread, and delete controls.</p>
          </div>
          <button class="button secondary" data-mark-all ${groups.unread.length ? "" : "disabled"}>${icon("check")} Mark all read</button>
        </div>
        <div class="segmented" role="tablist" aria-label="Notification filter">
          ${tabs.map(([key, label, count]) => `<a class="segment ${selectedFilter === key ? "active" : ""}" href="${href(`pages/customer/notifications.html?view=${key}`)}">${label} (${count})</a>`).join("")}
        </div>
        ${notificationList(visible, selectedFilter === "unread" ? "No unread notifications." : selectedFilter === "read" ? "No read notifications yet." : "No notifications yet.")}
      </section>
    </div>
  `;
  mobileLayout({ title: "Notifications", subtitle: "Read, unread, delete", content, active: "notifications", profile });
  document.querySelector("[data-mark-all]")?.addEventListener("click", async () => {
    try {
      await Notifications.markAllNotifications(profile.id);
      await renderNotifications(profile);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
  document.querySelectorAll("[data-mark]").forEach((button) => button.addEventListener("click", async () => {
    const item = notifications.find((notification) => notification.id === button.dataset.mark);
    if (!item) return;
    try {
      await Notifications.markNotification(button.dataset.mark, profile.id, !item.is_read);
      await renderNotifications(profile);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }));
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
    try {
      await Notifications.deleteNotification(button.dataset.delete, profile.id);
      await renderNotifications(profile);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }));
}

function contactActionButton(contact, favoriteIds, compact = false) {
  const isFavorite = favoriteIds.has(contact.id);
  return `
    <button class="button ghost ${compact ? "icon-only" : ""}" data-favorite="${contact.id}" aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}">
      ${icon("star", 17)}${compact ? "" : ` ${isFavorite ? "Remove" : "Add"}`}
    </button>
  `;
}

function contactListMarkup(contacts, favoriteIds, emptyTitle = "No contacts found") {
  if (!contacts.length) return `<div class="empty-state compact">${icon("users")}<strong>${escapeHtml(emptyTitle)}</strong><span class="muted">Search by fictional name or demo phone number.</span></div>`;
  return `<div class="list contact-results">
    ${contacts.map((contact) => `
      <div class="list-item contact-result">
        <span class="item-main">
          ${avatar(contact, 38)}
          <span class="item-copy">
            <strong>${escapeHtml(contact.full_name)}</strong>
            <span>${escapeHtml(contact.phone || "No demo phone")} - ${escapeHtml(roleName(contact.role || "customer"))}</span>
          </span>
        </span>
        <span class="cluster">
          <a class="button ghost icon-only" href="${href("pages/customer/send-money.html")}" aria-label="Send demo money">${icon("send", 17)}</a>
          ${contactActionButton(contact, favoriteIds)}
        </span>
      </div>
    `).join("")}
  </div>`;
}

function favoriteStripMarkup(favorites) {
  if (!favorites.length) return `<div class="empty-state compact">${icon("star")}<strong>No favorites yet</strong><span class="muted">Add contacts from search or recent activity.</span></div>`;
  return `<div class="contact-strip favorite-strip">
    ${favorites.map((favorite) => {
      const contact = favorite.profile;
      return `
        <article class="favorite-card">
          ${avatar(contact, 46)}
          <strong>${escapeHtml(contact.full_name.split(" ")[0])}</strong>
          <span>${escapeHtml(roleName(contact.role || "customer"))}</span>
          <button class="button ghost" data-remove-favorite="${contact.id}">${icon("trash", 16)} Remove</button>
        </article>
      `;
    }).join("")}
  </div>`;
}

function localFavoriteRows(userId) {
  const state = getState();
  return state.favorites
    .filter((favorite) => favorite.user_id === userId)
    .map((favorite) => ({
      ...favorite,
      profile: state.profiles.find((profile) => profile.id === favorite.favorite_user_id)
    }))
    .filter((favorite) => favorite.profile);
}

async function renderContactSearchResults(profile, favoriteIds, query = "") {
  const mount = document.getElementById("contactSearchResults");
  if (!mount) return;
  try {
    const results = await Contacts.searchContacts(query, profile.id);
    mount.innerHTML = contactListMarkup(results, favoriteIds, query ? "No matching demo contacts" : "No demo contacts available");
    wireFavoriteButtons(profile);
  } catch (error) {
    mount.innerHTML = `<div class="empty-state compact">${icon("shield")}<strong>Contact search failed</strong><span class="muted">${escapeHtml(error.message)}</span></div>`;
  }
}

function wireFavoriteButtons(profile) {
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    if (button.dataset.wired === "true") return;
    button.dataset.wired = "true";
    button.addEventListener("click", async () => {
      try {
        await Contacts.toggleFavorite(profile.id, button.dataset.favorite);
        await renderProfile(Auth.getCurrentProfile());
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-remove-favorite]").forEach((button) => {
    if (button.dataset.wired === "true") return;
    button.dataset.wired = "true";
    button.addEventListener("click", async () => {
      try {
        await Contacts.removeFavorite(profile.id, button.dataset.removeFavorite);
        await renderProfile(Auth.getCurrentProfile());
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  });
}

async function renderProfile(profile) {
  let favorites = [];
  let recentContacts = [];
  let contactLoadError = "";
  try {
    [favorites, recentContacts] = await Promise.all([
      Contacts.listFavorites(profile.id),
      Contacts.listRecentContacts(profile.id)
    ]);
  } catch (error) {
    contactLoadError = error.message;
    favorites = localFavoriteRows(profile.id);
    recentContacts = Contacts.recentContactsFromTransactions(Wallet.getTransactionsForUser(profile.id), profile.id);
  }
  const favoriteIds = new Set(favorites.map((item) => item.favorite_user_id));
  const content = `
    <div class="stack">
      ${contactLoadError ? `<div class="error-state">${icon("shield")}<strong>${escapeHtml(contactLoadError)}</strong><span class="muted">Run the latest Supabase RPC migration, then reload this page.</span></div>` : ""}
      <section class="card card-pad stack">
        <div class="between">${avatar(profile, 64)}<span class="badge">${roleName(profile.role)}</span></div>
        <form class="auth-form" id="profileForm">
          <label class="field"><span>Full name</span><input class="input" name="full_name" value="${escapeHtml(profile.full_name)}"></label>
          <label class="field"><span>Email</span><input class="input" value="${escapeHtml(profile.email)}" disabled></label>
          <label class="field"><span>Demo phone number</span><input class="input" name="phone" value="${escapeHtml(profile.phone)}"></label>
          <label class="field"><span>Profile photo URL</span><input class="input" name="avatar_url" value="${escapeHtml(profile.avatar_url || "")}"></label>
          <span class="muted">Joined ${dateOnly(profile.created_at)}</span>
          <button class="button full" type="submit">${icon("edit")} Save profile</button>
        </form>
        <div class="cluster">
          <button class="button secondary" data-theme-toggle>${icon("settings")} <span data-theme-label>${currentThemeLabel()}</span></button>
          <button class="button secondary" data-action="logout">${icon("logout")} Logout</button>
        </div>
        <div id="formMessage"></div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head">
          <div>
            <h2 class="section-title">Favorite contacts</h2>
            <p class="muted">Saved demo people and businesses for faster practice transfers.</p>
          </div>
          <span class="badge">${favorites.length} saved</span>
        </div>
        ${favoriteStripMarkup(favorites)}
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head">
          <div>
            <h2 class="section-title">Recent contacts</h2>
            <p class="muted">Built from your simulated transaction history.</p>
          </div>
          <span class="badge">Auto</span>
        </div>
        ${contactListMarkup(recentContacts, favoriteIds, "No recent contacts yet")}
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head">
          <div>
            <h2 class="section-title">Find demo contacts</h2>
            <p class="muted">Search registered demo users only. NexaPay never reads your real device contacts.</p>
          </div>
          <span class="badge warning">Demo directory</span>
        </div>
        <form class="filter-row" id="contactSearchForm">
          <label class="field sr-only"><span>Search contacts</span></label>
          <input class="input" id="contactSearchInput" name="query" placeholder="Name or demo phone number">
          <button class="button secondary" type="submit">${icon("search")} Search</button>
        </form>
        <div id="contactSearchResults" class="contact-search-results"></div>
        <div class="notice">${icon("shield")}<span><strong>No real contacts imported.</strong>Favorites are saved only between registered NexaPay demo profiles.</span></div>
      </section>
    </div>
  `;
  mobileLayout({ title: "Profile", subtitle: "Account, privacy, favorites", content, active: "profile", profile });
  document.getElementById("profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      Wallet.updateProfile(profile.id, Object.fromEntries(new FormData(event.currentTarget)));
      showMessage("Profile updated.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
  document.getElementById("contactSearchForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await renderContactSearchResults(profile, favoriteIds, new FormData(event.currentTarget).get("query") || "");
  });
  wireFavoriteButtons(profile);
  await renderContactSearchResults(profile, favoriteIds);
}

function merchantMissingState() {
  return `
    <section class="card card-pad stack">
      <div class="empty-state">
        ${icon("merchant")}
        <strong>No merchant record found</strong>
        <span class="muted">This signed-in profile has the merchant role, but no active demo business record is linked yet.</span>
      </div>
      <div class="notice">${icon("shield")}<span><strong>Merchant authentication protected.</strong>Only signed-in merchant-role profiles can open merchant pages. Create a merchant row in Supabase or use the local Merchant demo account.</span></div>
    </section>
  `;
}

function merchantSalesChart(summary) {
  const max = Math.max(...summary.lastSevenDays.map((item) => item.amount), 1);
  return `
    <div class="merchant-bars" aria-label="Seven day payment volume">
      ${summary.lastSevenDays.map((item) => {
        const height = Math.max(8, Math.round((item.amount / max) * 100));
        return `<span><i style="height:${height}%"></i><small>${escapeHtml(item.label)}</small></span>`;
      }).join("")}
    </div>
  `;
}

function merchantPaymentList(payments, userId) {
  if (!payments.length) {
    return `<div class="empty-state">${icon("payment")}<strong>No merchant payments found</strong><span class="muted">Customer merchant payments will appear here.</span></div>`;
  }
  return `<div class="list merchant-payment-list">
    ${payments.map((tx) => {
      const parties = Transactions.partiesFor(tx);
      return `
        <article class="list-item transaction-row merchant-payment-row">
          <span class="item-main">
            <span class="icon-button" aria-hidden="true">${icon("payment", 18)}</span>
            <span class="item-copy">
              <strong>${escapeHtml(parties.senderName || "Demo customer")}</strong>
              <span>${escapeHtml(tx.reference || tx.metadata?.merchant_name || "Merchant payment")} - ${dateTime(tx.created_at)}</span>
              <small>${escapeHtml(tx.transaction_id)} - ${escapeHtml(parties.senderPhone || "Demo customer profile")}</small>
            </span>
          </span>
          <span class="tx-row-meta">
            <span class="badge ${Transactions.statusClass(tx.status)}">${escapeHtml(tx.status || "completed")}</span>
            <strong class="amount-in">+${money(tx.amount)}</strong>
            <a class="button ghost" href="${href(`pages/customer/transaction-details.html?id=${encodeURIComponent(tx.id)}`)}">${icon("receipt", 16)} Receipt</a>
          </span>
        </article>
      `;
    }).join("")}
  </div>`;
}

async function renderMerchantDashboard(profile) {
  const data = await Merchant.getMerchantDashboard(profile.id);
  const { merchant, wallet, payments, summary } = data;
  const content = !merchant ? merchantMissingState() : `
    <div class="stack">
      <section class="dashboard-hero merchant-hero">
        <div class="hero-copy">
          <span class="badge">Merchant protected area</span>
          <h2>${escapeHtml(merchant.business_name)}</h2>
          <p>${escapeHtml(merchant.category)} - ${escapeHtml(merchant.merchant_code)} - simulated payments only.</p>
        </div>
        <a class="notification-summary" href="${href("pages/merchant/merchant-qr.html")}">
          ${icon("qrcode", 20)}
          <span><strong>QR</strong><small>Safe ID</small></span>
        </a>
      </section>
      <section class="balance-card dashboard-balance">
        <div class="balance-label"><span>Merchant Demo Balance</span><span class="badge success">${escapeHtml(wallet?.status || "active")}</span></div>
        <strong class="balance-value">${money(wallet?.balance || 0)}</strong>
        <span>Educational merchant balance. No real settlement, bank deposit, or payment gateway is connected.</span>
      </section>
      <section class="metric-grid">
        <div class="metric"><span>Today's payments</span><strong>${summary.todayCount}</strong></div>
        <div class="metric"><span>Today's amount</span><strong>${money(summary.todayAmount)}</strong></div>
        <div class="metric"><span>Total payments</span><strong>${summary.count}</strong></div>
        <div class="metric"><span>Total volume</span><strong>${money(summary.totalAmount)}</strong></div>
        <div class="metric"><span>Average payment</span><strong>${money(summary.averageAmount)}</strong></div>
        <div class="metric"><span>Completed</span><strong>${summary.completed}</strong></div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Seven day payment volume</h2><span class="badge">Demo analytics</span></div>
        ${merchantSalesChart(summary)}
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Merchant tools</h2><span class="badge">${escapeHtml(merchant.merchant_code)}</span></div>
        <div class="quick-grid">
          <a class="quick-action" href="${href("pages/merchant/merchant-qr.html")}">${icon("qrcode")}<span>Generate QR</span></a>
          <a class="quick-action" href="${href("pages/merchant/merchant-payments.html")}">${icon("history")}<span>Payment History</span></a>
          <a class="quick-action" href="${href("pages/merchant/merchant-profile.html")}">${icon("merchant")}<span>Profile</span></a>
        </div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Recent payments</h2><a class="badge" href="${href("pages/merchant/merchant-payments.html")}">View all</a></div>
        ${merchantPaymentList(payments.slice(0, 5), profile.id)}
      </section>
      <section class="card card-pad stack-sm merchant-qr-preview">
        <div class="section-head"><h2 class="section-title">QR preview</h2><span class="badge warning">No secrets encoded</span></div>
        ${fakeQr(Merchant.qrPayload(merchant))}
        <code>${escapeHtml(Merchant.qrPayload(merchant))}</code>
      </section>
    </div>
  `;
  mobileLayout({ title: "Merchant", subtitle: "Dashboard, QR, payments", content, active: "home", profile });
}

async function renderMerchantPayments(profile) {
  const payments = await Merchant.listMerchantPayments(profile.id);
  const summary = Merchant.summarizePayments(payments);
  const content = `
    <div class="stack">
      <section class="card card-pad stack">
        <div class="section-head">
          <div>
            <h2 class="section-title">Payment history</h2>
            <p class="muted">Search simulated merchant payments and open educational receipts.</p>
          </div>
          <span class="badge">${summary.count} records</span>
        </div>
        <div class="notice">${icon("shield")}<span><strong>${DISCLAIMER}</strong>Merchant payments are simulated ledger rows only.</span></div>
        <div class="metric-grid">
          <div class="metric"><span>Total volume</span><strong>${money(summary.totalAmount)}</strong></div>
          <div class="metric"><span>Today</span><strong>${money(summary.todayAmount)}</strong></div>
          <div class="metric"><span>Completed</span><strong>${summary.completed}</strong></div>
          <div class="metric"><span>Pending</span><strong>${summary.pending}</strong></div>
        </div>
      </section>
      <section class="card card-pad stack">
        <div class="filter-row wide">
          <label class="field"><span>Search payments</span><input class="input" id="merchantPaymentSearch" placeholder="Customer, transaction ID, reference"></label>
          <label class="field"><span>Status</span><select class="select" id="merchantPaymentStatus">${Transactions.STATUS_OPTIONS.map((status) => `<option value="${status}">${escapeHtml(txLabel(status))}</option>`).join("")}</select></label>
        </div>
        <div class="filter-row wide">
          <label class="field"><span>From</span><input class="input" id="merchantPaymentFrom" type="date"></label>
          <label class="field"><span>To</span><input class="input" id="merchantPaymentTo" type="date"></label>
        </div>
        <div class="between">
          <span class="muted" id="merchantPaymentCount">${payments.length} matching payments</span>
          <button class="button ghost" id="merchantPaymentClear" type="button">${icon("x", 17)} Clear</button>
        </div>
        <div id="merchantPaymentList">${merchantPaymentList(payments, profile.id)}</div>
      </section>
    </div>
  `;
  mobileLayout({ title: "Merchant Payments", subtitle: "Search, history, receipts", content, active: "transactions", profile });
  const search = document.getElementById("merchantPaymentSearch");
  const status = document.getElementById("merchantPaymentStatus");
  const from = document.getElementById("merchantPaymentFrom");
  const to = document.getElementById("merchantPaymentTo");
  const count = document.getElementById("merchantPaymentCount");
  const list = document.getElementById("merchantPaymentList");
  const apply = () => {
    const filtered = Merchant.filterPayments(payments, {
      userId: profile.id,
      query: search.value,
      status: status.value,
      from: from.value,
      to: to.value
    });
    count.textContent = `${filtered.length} matching payment${filtered.length === 1 ? "" : "s"}`;
    list.innerHTML = merchantPaymentList(filtered, profile.id);
  };
  [search, status, from, to].forEach((control) => control.addEventListener("input", apply));
  document.getElementById("merchantPaymentClear").addEventListener("click", () => {
    search.value = "";
    status.value = "all";
    from.value = "";
    to.value = "";
    apply();
  });
}

async function renderMerchantQr(profile) {
  const merchant = await Merchant.getMerchantRecord(profile.id);
  const qrValue = Merchant.qrPayload(merchant) || "NEXAPAY:MERCHANT:NPM-1001";
  const internalLink = new URL(href(`pages/customer/scan.html?qr=${encodeURIComponent(qrValue)}`), location.href).toString();
  const content = !merchant ? merchantMissingState() : `
    <div class="stack">
      <section class="qr-card card merchant-qr-card">
        <div class="between full">
          <div>
            <h2 class="section-title">${escapeHtml(merchant.business_name)}</h2>
            <p class="muted">${escapeHtml(merchant.category)} - ${escapeHtml(merchant.merchant_code)}</p>
          </div>
          <span class="badge success">${escapeHtml(merchant.status)}</span>
        </div>
        ${fakeQr(qrValue)}
        <label class="field full"><span>Safe QR payload</span><input class="input" value="${escapeHtml(qrValue)}" readonly></label>
        <label class="field full"><span>Internal demo payment link</span><input class="input" value="${escapeHtml(internalLink)}" readonly></label>
        <div class="cluster">
          <button class="button secondary" type="button" data-copy-link="${escapeHtml(qrValue)}">${icon("copy", 17)} Copy payload</button>
          <button class="button secondary" type="button" data-copy-link="${escapeHtml(internalLink)}">${icon("copy", 17)} Copy link</button>
        </div>
        <div class="notice">${icon("shield")}<span><strong>Safe QR rule.</strong>This QR contains only an internal merchant identifier. It never includes passwords, tokens, secret keys, card numbers, or real payment data.</span></div>
        <div id="formMessage"></div>
      </section>
      <section class="card card-pad stack-sm">
        <h2 class="section-title">How customers use it</h2>
        <div class="list">
          <div class="list-item"><span class="item-main">${icon("scan")}<span class="item-copy"><strong>Open Scan</strong><span>Customer enters or scans the safe payload.</span></span></span></div>
          <div class="list-item"><span class="item-main">${icon("payment")}<span class="item-copy"><strong>Review payment</strong><span>Customer sees merchant name, category, amount, and reference.</span></span></span></div>
          <div class="list-item"><span class="item-main">${icon("receipt")}<span class="item-copy"><strong>Get receipt</strong><span>Both sides receive simulated transaction records.</span></span></span></div>
        </div>
      </section>
    </div>
  `;
  mobileLayout({ title: "Merchant QR", subtitle: "Safe QR generation", content, active: "scan", profile });
  document.querySelectorAll("[data-copy-link]").forEach((button) => button.addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(event.currentTarget.dataset.copyLink);
      showMessage("Demo QR data copied.", "success");
    } catch {
      showMessage("Copy is not available in this browser. Select the field manually.", "error");
    }
  }));
}

async function renderMerchantProfile(profile) {
  const merchant = await Merchant.getMerchantRecord(profile.id);
  const content = !merchant ? merchantMissingState() : `
    <div class="stack">
      <section class="card card-pad stack">
        <div class="section-head">
          <div>
            <h2 class="section-title">Merchant profile</h2>
            <p class="muted">Update safe demo owner and business details.</p>
          </div>
          <span class="badge">${escapeHtml(merchant.merchant_code)}</span>
        </div>
        <form class="auth-form" id="merchantProfileForm">
          <label class="field"><span>Business name</span><input class="input" name="business_name" value="${escapeHtml(merchant.business_name)}" required></label>
          <label class="field"><span>Category</span><input class="input" name="category" value="${escapeHtml(merchant.category)}" required></label>
          <label class="field"><span>Owner full name</span><input class="input" name="full_name" value="${escapeHtml(profile.full_name)}" required></label>
          <label class="field"><span>Email</span><input class="input" value="${escapeHtml(profile.email)}" disabled></label>
          <label class="field"><span>Demo phone number</span><input class="input" name="phone" value="${escapeHtml(profile.phone)}" required></label>
          <label class="field"><span>Profile photo URL</span><input class="input" name="avatar_url" value="${escapeHtml(profile.avatar_url || "")}"></label>
          <label class="field"><span>Merchant code</span><input class="input" value="${escapeHtml(merchant.merchant_code)}" disabled></label>
          <label class="field"><span>QR identifier</span><input class="input" value="${escapeHtml(merchant.qr_identifier)}" disabled></label>
          <button class="button full" type="submit">${icon("edit")} Save merchant profile</button>
        </form>
        <div id="formMessage"></div>
      </section>
      <section class="card card-pad stack-sm">
        <h2 class="section-title">Profile safety</h2>
        <div class="notice">${icon("shield")}<span><strong>Educational merchant profile.</strong>No bank account, settlement account, tax ID, real trade license, or payment gateway credential is collected.</span></div>
        <div class="cluster">
          <button class="button secondary" data-theme-toggle>${icon("settings")} <span data-theme-label>${currentThemeLabel()}</span></button>
          <button class="button secondary" data-action="logout">${icon("logout")} Logout</button>
        </div>
      </section>
    </div>
  `;
  mobileLayout({ title: "Merchant Profile", subtitle: "Business details and safety", content, active: "profile", profile });
  document.getElementById("merchantProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const result = await Merchant.updateMerchantProfile(profile.id, Object.fromEntries(new FormData(event.currentTarget)));
      profile.full_name = result.profile?.full_name || profile.full_name;
      profile.phone = result.profile?.phone || profile.phone;
      profile.avatar_url = result.profile?.avatar_url || profile.avatar_url;
      showMessage("Merchant profile updated.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function agentMissingState() {
  return `
    <section class="card card-pad stack">
      <div class="empty-state">
        ${icon("agent")}
        <strong>No active agent record found</strong>
        <span class="muted">This signed-in profile has the agent role, but no active demo agent record is linked yet.</span>
      </div>
      <div class="notice">${icon("shield")}<span><strong>Agent role protected.</strong>Only signed-in agent-role profiles can open agent tools. Create an active agent row in Supabase or use the local Agent demo account.</span></div>
    </section>
  `;
}

function agentTransactionList(transactions, userId) {
  if (!transactions.length) {
    return `<div class="empty-state">${icon("history")}<strong>No agent transactions found</strong><span class="muted">Cash-in and cash-out simulations will appear here.</span></div>`;
  }

  return `<div class="list agent-transaction-list">
    ${transactions.map((tx) => {
      const parties = Transactions.partiesFor(tx);
      const cashIn = Agent.isCashIn(tx, userId);
      const cashOut = Agent.isCashOut(tx, userId);
      const customerName = cashIn ? parties.receiverName : cashOut ? parties.senderName : parties.senderName || parties.receiverName;
      const amountClass = cashIn ? "amount-out" : "amount-in";
      return `
        <article class="list-item transaction-row agent-transaction-row">
          <span class="item-main">
            <span class="icon-button" aria-hidden="true">${icon(cashIn ? "add" : cashOut ? "cash" : "history", 18)}</span>
            <span class="item-copy">
              <strong>${cashIn ? "Cash-in simulation" : cashOut ? "Cash-out simulation" : escapeHtml(txLabel(tx.transaction_type))}</strong>
              <span>${escapeHtml(customerName || "Registered demo customer")} - ${dateTime(tx.created_at)}</span>
              <small>${escapeHtml(tx.transaction_id)} - ${escapeHtml(tx.reference || "Agent activity")}</small>
            </span>
          </span>
          <span class="tx-row-meta">
            <span class="badge ${Transactions.statusClass(tx.status)}">${escapeHtml(tx.status || "completed")}</span>
            <strong class="${amountClass}">${cashIn ? "-" : "+"}${money(cashIn ? tx.total_amount || tx.amount : tx.amount)}</strong>
            <a class="button ghost" href="${href(`pages/customer/transaction-details.html?id=${encodeURIComponent(tx.id)}`)}">${icon("receipt", 16)} Receipt</a>
          </span>
        </article>
      `;
    }).join("")}
  </div>`;
}

function agentCustomerOptions(customers) {
  return customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.full_name)} - ${escapeHtml(customer.phone)}</option>`).join("");
}

function agentCustomerList(customers) {
  if (!customers.length) return `<div class="empty-state compact">${icon("users")}<strong>No customers found</strong><span class="muted">Search registered demo customers by name or phone.</span></div>`;
  return `<div class="list contact-results">
    ${customers.map((customer) => `
      <button class="list-item contact-result as-button" type="button" data-pick-customer="${customer.id}">
        <span class="item-main">${avatar(customer, 38)}<span class="item-copy"><strong>${escapeHtml(customer.full_name)}</strong><span>${escapeHtml(customer.phone)} - Customer</span></span></span>
        <span class="badge">Select</span>
      </button>
    `).join("")}
  </div>`;
}

function agentCustomerSummary(customer) {
  if (!customer) return `<div class="empty-state compact">${icon("users")}<strong>Select a registered demo customer</strong></div>`;
  return `<div class="notice">${icon("user")}<span><strong>${escapeHtml(customer.full_name)}</strong>${escapeHtml(customer.phone || "Demo customer profile")}</span></div>`;
}

async function renderAgentDashboard(profile) {
  const data = await Agent.getAgentDashboard(profile.id);
  const { agent, wallet, transactions, summary } = data;
  const content = !agent ? agentMissingState() : `
    <div class="stack">
      <section class="dashboard-hero agent-hero">
        <div class="hero-copy">
          <span class="badge">Agent protected area</span>
          <h2>${escapeHtml(agent.profile?.full_name || profile.full_name)}</h2>
          <p>${escapeHtml(agent.agent_code)} - ${escapeHtml(agent.location)} - registered demo users only.</p>
        </div>
        <a class="notification-summary" href="${href("pages/agent/agent-transactions.html")}">
          ${icon("history", 20)}
          <span><strong>${summary.todayCount}</strong><small>Today</small></span>
        </a>
      </section>
      <section class="balance-card dashboard-balance">
        <div class="balance-label"><span>Agent Demo Balance</span><span class="badge success">${escapeHtml(wallet?.status || "active")}</span></div>
        <strong class="balance-value">${money(wallet?.balance || 0)}</strong>
        <span>Cash-in and cash-out simulations only. No real cash is handled or dispensed.</span>
      </section>
      <section class="metric-grid">
        <div class="metric"><span>Today's count</span><strong>${summary.todayCount}</strong></div>
        <div class="metric"><span>Today's volume</span><strong>${money(summary.todayVolume)}</strong></div>
        <div class="metric"><span>Cash-in amount</span><strong>${money(summary.cashInAmount)}</strong></div>
        <div class="metric"><span>Cash-out amount</span><strong>${money(summary.cashOutAmount)}</strong></div>
        <div class="metric"><span>Total activity</span><strong>${summary.count}</strong></div>
        <div class="metric"><span>Completed</span><strong>${summary.completed}</strong></div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Agent tools</h2><span class="badge">${escapeHtml(agent.agent_code)}</span></div>
        <div class="quick-grid">
          <a class="quick-action" href="${href("pages/agent/agent-cash-in.html")}">${icon("add")}<span>Cash In</span></a>
          <a class="quick-action" href="${href("pages/agent/agent-cash-out.html")}">${icon("cash")}<span>Cash Out</span></a>
          <a class="quick-action" href="${href("pages/agent/agent-transactions.html")}">${icon("history")}<span>History</span></a>
        </div>
      </section>
      <section class="card card-pad stack-sm">
        <div class="section-head"><h2 class="section-title">Recent activity</h2><a class="badge" href="${href("pages/agent/agent-transactions.html")}">View all</a></div>
        ${agentTransactionList(transactions.slice(0, 6), profile.id)}
      </section>
    </div>
  `;
  mobileLayout({ title: "Agent", subtitle: "Cash-in, cash-out, daily stats", content, active: "home", profile });
}

async function renderAgentAction(profile, mode) {
  const isCashIn = mode === "cash_in";
  const [agent, customers] = await Promise.all([
    Agent.getAgentRecord(profile.id),
    Agent.searchCustomers("", profile.id)
  ]);
  const requestId = Agent.createAgentRequestId(isCashIn ? "cash-in" : "cash-out", profile.id);
  const content = !agent ? agentMissingState() : `
    <section class="card card-pad stack" id="agentActionFlow">
      <div class="section-head">
        <div>
          <h2 class="section-title">${isCashIn ? "Cash-in simulation" : "Cash-out simulation"}</h2>
          <p class="muted">${isCashIn ? "Agent transfers demo balance to a registered customer." : "Agent records a simulated customer cash-out. No real cash is dispensed."}</p>
        </div>
        <span class="badge">${escapeHtml(agent.agent_code)}</span>
      </div>
      <div class="notice">${icon("shield")}<span><strong>${isCashIn ? "Simulation only." : "Simulation Only - No Real Cash Is Dispensed."}</strong>${isCashIn ? "This deducts agent demo balance and credits a customer demo wallet." : "This deducts the customer demo wallet, credits the agent demo wallet, and creates an audit record."}</span></div>
      <form class="auth-form" id="agentActionForm">
        <div class="filter-row">
          <label class="field"><span>Search customer</span><input class="input" name="customerSearch" placeholder="Name or demo phone"></label>
          <button class="button secondary" type="button" data-agent-customer-search>${icon("search")} Search</button>
        </div>
        <div id="agentCustomerResults">${agentCustomerList(customers)}</div>
        <label class="field"><span>Selected customer</span><select class="select" name="customerId" required>${agentCustomerOptions(customers)}</select></label>
        <div id="agentCustomerSummary"></div>
        <label class="field"><span>Amount</span><input class="input" name="amount" type="number" min="1" max="100000" step="1" required></label>
        <label class="field"><span>Confirmation word</span><input class="input" name="confirmation" placeholder="DEMO" required></label>
        <div class="review-grid" id="agentActionReview"></div>
        <button class="button full" type="submit">${icon(isCashIn ? "add" : "cash")} ${isCashIn ? "Process cash-in" : "Process cash-out"}</button>
      </form>
      <div id="formMessage"></div>
    </section>
  `;
  mobileLayout({
    title: isCashIn ? "Cash In" : "Cash Out",
    subtitle: isCashIn ? "Agent customer credit simulation" : "Agent withdrawal simulation",
    content,
    active: isCashIn ? "scan" : "transactions",
    profile
  });
  if (agent) wireAgentActionFlow({ profile, mode, customers, requestId });
}

function wireAgentActionFlow({ profile, mode, customers, requestId }) {
  const isCashIn = mode === "cash_in";
  const form = document.getElementById("agentActionForm");
  const results = document.getElementById("agentCustomerResults");
  const select = form.elements.customerId;
  const summary = document.getElementById("agentCustomerSummary");
  const review = document.getElementById("agentActionReview");
  let customerList = [...customers];
  let selectedCustomer = customerList[0] || null;

  const mergeCustomers = (items) => {
    items.forEach((item) => {
      if (!customerList.some((customer) => customer.id === item.id)) customerList.push(item);
    });
  };

  const renderCustomers = (items) => {
    mergeCustomers(items);
    results.innerHTML = agentCustomerList(items);
    select.innerHTML = agentCustomerOptions(customerList);
    if (selectedCustomer) select.value = selectedCustomer.id;
  };

  const setCustomer = (customerId) => {
    selectedCustomer = customerList.find((customer) => customer.id === customerId) || null;
    select.value = selectedCustomer?.id || "";
    summary.innerHTML = agentCustomerSummary(selectedCustomer);
    updateReview();
  };

  const updateReview = () => {
    const amount = Number(form.elements.amount.value || 0);
    const fee = isCashIn ? 0 : Agent.calculateCashOutFee(amount);
    review.innerHTML = reviewRows([
      ["Customer", selectedCustomer ? `${selectedCustomer.full_name} (${selectedCustomer.phone})` : "Not selected"],
      ["Amount", money(Number.isFinite(amount) ? amount : 0)],
      ["Demo fee", money(fee)],
      ["Total customer deduction", money(isCashIn ? amount : amount + fee)],
      ["Simulation", isCashIn ? "Agent Cash-in" : "Agent Cash-out"],
      ["Request ID", requestId]
    ]);
  };

  form.querySelector("[data-agent-customer-search]").addEventListener("click", async () => {
    try {
      const found = await Agent.searchCustomers(form.elements.customerSearch.value, profile.id);
      renderCustomers(found);
      if (found.length === 1) setCustomer(found[0].id);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-customer]");
    if (button) setCustomer(button.dataset.pickCustomer);
  });
  select.addEventListener("change", () => setCustomer(select.value));
  form.elements.amount.addEventListener("input", updateReview);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if ((form.elements.confirmation.value || "").trim().toUpperCase() !== "DEMO") {
      showMessage("Type DEMO to confirm this simulation.", "error");
      return;
    }
    if (!selectedCustomer) {
      showMessage("Choose a registered demo customer.", "error");
      return;
    }
    try {
      const tx = isCashIn
        ? await Agent.processCashIn({ agentUserId: profile.id, customer: selectedCustomer, amount: Number(form.elements.amount.value), idempotencyKey: requestId })
        : await Agent.processCashOut({ agentUserId: profile.id, customer: selectedCustomer, amount: Number(form.elements.amount.value), idempotencyKey: requestId });
      document.getElementById("agentActionFlow").innerHTML = receiptView(tx, profile.id, isCashIn ? "Cash-in simulation completed" : "Cash-out simulation completed", {
        historyPath: "pages/agent/agent-transactions.html",
        homePath: "pages/agent/agent-dashboard.html"
      });
      wireReceiptButtons(tx, profile.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  renderCustomers(customerList);
  if (selectedCustomer) setCustomer(selectedCustomer.id);
  updateReview();
}

function renderAgentCashIn(profile) {
  return renderAgentAction(profile, "cash_in");
}

function renderAgentCashOut(profile) {
  return renderAgentAction(profile, "cash_out");
}

async function renderAgentTransactions(profile) {
  const transactions = await Agent.listAgentTransactions(profile.id);
  const summary = Agent.summarizeAgentTransactions(transactions, profile.id);
  const content = `
    <div class="stack">
      <section class="card card-pad stack">
        <div class="section-head">
          <div>
            <h2 class="section-title">Agent transaction history</h2>
            <p class="muted">Search cash-in, cash-out, receipts, and audit-friendly records.</p>
          </div>
          <span class="badge">${summary.count} records</span>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Cash-in volume</span><strong>${money(summary.cashInAmount)}</strong></div>
          <div class="metric"><span>Cash-out volume</span><strong>${money(summary.cashOutAmount)}</strong></div>
          <div class="metric"><span>Today</span><strong>${money(summary.todayVolume)}</strong></div>
          <div class="metric"><span>Completed</span><strong>${summary.completed}</strong></div>
        </div>
      </section>
      <section class="card card-pad stack">
        <div class="filter-row wide">
          <label class="field"><span>Search</span><input class="input" id="agentTxSearch" placeholder="Customer, phone, transaction ID, reference"></label>
          <label class="field"><span>Status</span><select class="select" id="agentTxStatus">${Transactions.STATUS_OPTIONS.map((status) => `<option value="${status}">${escapeHtml(txLabel(status))}</option>`).join("")}</select></label>
        </div>
        <div class="filter-row wide">
          <label class="field"><span>From</span><input class="input" id="agentTxFrom" type="date"></label>
          <label class="field"><span>To</span><input class="input" id="agentTxTo" type="date"></label>
        </div>
        <div class="segmented" id="agentTxFilters">
          ${[
            ["all", "All"],
            ["cash_in", "Cash In"],
            ["cash_out", "Cash Out"]
          ].map(([key, label]) => `<button class="segment ${key === "all" ? "active" : ""}" data-agent-filter="${key}">${label}</button>`).join("")}
        </div>
        <div class="between">
          <span class="muted" id="agentTxCount">${transactions.length} matching records</span>
          <button class="button ghost" type="button" id="agentTxClear">${icon("x", 17)} Clear</button>
        </div>
        <div id="agentTxList">${agentTransactionList(transactions, profile.id)}</div>
      </section>
    </div>
  `;
  mobileLayout({ title: "Agent Transactions", subtitle: "Search, filters, receipts", content, active: "transactions", profile });
  const search = document.getElementById("agentTxSearch");
  const status = document.getElementById("agentTxStatus");
  const from = document.getElementById("agentTxFrom");
  const to = document.getElementById("agentTxTo");
  const count = document.getElementById("agentTxCount");
  const list = document.getElementById("agentTxList");
  let activeFilter = "all";
  const apply = () => {
    const filtered = Agent.filterAgentTransactions(transactions, {
      userId: profile.id,
      filter: activeFilter,
      status: status.value,
      query: search.value,
      from: from.value,
      to: to.value
    });
    count.textContent = `${filtered.length} matching record${filtered.length === 1 ? "" : "s"}`;
    list.innerHTML = agentTransactionList(filtered, profile.id);
  };
  [search, status, from, to].forEach((control) => control.addEventListener("input", apply));
  document.querySelectorAll("[data-agent-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.agentFilter;
      document.querySelectorAll("[data-agent-filter]").forEach((item) => item.classList.toggle("active", item === button));
      apply();
    });
  });
  document.getElementById("agentTxClear").addEventListener("click", () => {
    activeFilter = "all";
    search.value = "";
    status.value = "all";
    from.value = "";
    to.value = "";
    document.querySelectorAll("[data-agent-filter]").forEach((item) => item.classList.toggle("active", item.dataset.agentFilter === "all"));
    apply();
  });
}

function adminMetricCards(items) {
  return `
    <div class="admin-grid">
      ${items.map(([label, value, iconName = "chart"]) => `
        <div class="metric admin-metric">
          <span>${icon(iconName, 18)} ${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function statusBadge(status) {
  const value = String(status || "unknown").toLowerCase();
  const tone =
    ["active", "completed"].includes(value) ? "success" :
    ["pending"].includes(value) ? "warning" :
    ["suspended", "failed", "cancelled", "declined"].includes(value) ? "danger" :
    "";
  return `<span class="badge ${tone}">${escapeHtml(txLabel(value))}</span>`;
}

function managedStatusButton(table, row) {
  const next = row.status === "active" ? "suspended" : "active";
  const label = row.status === "active" ? "Suspend" : "Activate";
  return `<button class="button ghost" data-admin-managed-status="${escapeHtml(table)}" data-record-id="${escapeHtml(row.id)}" data-next-status="${next}">${label}</button>`;
}

function profileStatusButton(row, currentAdminId) {
  const isSelf = row.id === currentAdminId;
  const next = row.account_status === "active" ? "suspended" : "active";
  const label = row.account_status === "active" ? "Suspend" : "Activate";
  return `<button class="button ghost" data-admin-profile-status="${escapeHtml(row.id)}" data-next-status="${next}" ${isSelf && next === "suspended" ? "disabled" : ""}>${label}</button>`;
}

function settingNumber(data, key, fallback) {
  const setting = data.system_settings.find((item) => item.key === key);
  const value = Number(setting?.value?.amount ?? setting?.value ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function adminProfileName(data, id) {
  return Admin.profileById(data, id)?.full_name || id || "System";
}

function walletOwnerName(data, walletId) {
  const userId = Admin.userIdByWallet(data, walletId);
  return userId ? adminProfileName(data, userId) : "NexaPay Demo Clearing";
}

function wireManagedStatus(profile, rerender) {
  document.querySelectorAll("[data-admin-managed-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await Admin.setManagedStatus(profile.id, button.dataset.adminManagedStatus, button.dataset.recordId, button.dataset.nextStatus);
        await rerender(profile);
        wireGlobalActions();
      } catch (error) {
        showMessage(error.message, "error");
        button.disabled = false;
      }
    });
  });
}

async function renderAdminOverview(profile) {
  const data = await Admin.loadAdminData();
  const stats = Admin.analytics(data);
  const maxVolume = Math.max(1, ...stats.daily.map((item) => item.volume));
  const recentRows = data.transactions.slice(0, 8).map((tx) => ({
    ...tx,
    sender_name: walletOwnerName(data, tx.sender_wallet_id),
    receiver_name: walletOwnerName(data, tx.receiver_wallet_id)
  }));
  const content = `
    ${adminMetricCards([
      ["Total Users", stats.totalUsers, "users"],
      ["Active Users", stats.activeUsers, "check"],
      ["Customers", stats.customers, "user"],
      ["Merchants", stats.merchants, "merchant"],
      ["Agents", stats.agents, "agent"],
      ["Total Transactions", stats.totalTransactions, "history"],
      ["Today's Transactions", stats.todayTransactions, "calendar"],
      ["Demo Money In", money(stats.moneyIn), "add"],
      ["Demo Money Out", money(stats.moneyOut), "send"],
      ["Active Promotions", stats.activePromotions, "star"],
      ["Service Items", stats.serviceItems, "settings"],
      ["Failed Transactions", stats.failedTransactions, "x"]
    ])}
    <section class="card card-pad stack">
      <div class="between">
        <div>
          <h2 class="section-title">Seven-day activity</h2>
          <p class="muted">Completed simulated transaction volume only.</p>
        </div>
        <span class="badge">${money(stats.totalVolume)} total volume</span>
      </div>
      <div class="bar-chart">
        ${stats.daily.map((item) => {
          const height = Math.max(12, Math.round((item.volume / maxVolume) * 100));
          return `<div class="bar"><span style="height:${height}%"></span><small>${escapeHtml(item.label)}</small><strong>${money(item.volume)}</strong></div>`;
        }).join("")}
      </div>
    </section>
    <section class="card card-pad stack">
      <div class="between"><h2 class="section-title">Recent activity</h2><a class="button ghost" href="${href("pages/admin/admin-transactions.html")}">${icon("history")} View all</a></div>
      ${adminTable(recentRows, ["transaction_id", "transaction_type", "sender_name", "receiver_name", "amount", "status", "created_at"])}
    </section>
  `;
  adminLayout("Admin Overview", content, profile);
}

async function renderAdminUsers(profile) {
  const data = await Admin.loadAdminData();
  const content = `
    <section class="card card-pad stack">
      <div class="between">
        <div>
          <h2 class="section-title">User management</h2>
          <p class="muted">Admins can activate or suspend demo accounts. Passwords are never visible here.</p>
        </div>
        <span class="badge">${data.profiles.filter((item) => item.role !== "system").length} profiles</span>
      </div>
      <div class="admin-toolbar">
        <label class="field"><span>Search</span><input class="input" id="adminUserSearch" placeholder="Name, email, phone"></label>
        <label class="field"><span>Role</span><select class="select" id="adminUserRole"><option value="all">All roles</option><option value="customer">Customer</option><option value="merchant">Merchant</option><option value="agent">Agent</option><option value="admin">Admin</option></select></label>
        <label class="field"><span>Status</span><select class="select" id="adminUserStatus"><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
      </div>
      <p class="help-text" id="adminUserCount"></p>
      <div id="adminUsersTable"></div>
    </section>
    <div id="formMessage"></div>
  `;
  adminLayout("Users", content, profile);
  const search = document.getElementById("adminUserSearch");
  const role = document.getElementById("adminUserRole");
  const status = document.getElementById("adminUserStatus");
  const count = document.getElementById("adminUserCount");
  const table = document.getElementById("adminUsersTable");
  const redraw = () => {
    const rows = Admin.filterProfiles(data.profiles, {
      query: search.value,
      role: role.value,
      status: status.value
    });
    count.textContent = `${rows.length} matching user${rows.length === 1 ? "" : "s"}`;
    table.innerHTML = adminTable(rows, ["full_name", "email", "phone", "role", "account_status", "created_at"], (row) => profileStatusButton(row, profile.id));
  };
  [search, role, status].forEach((control) => control.addEventListener("input", redraw));
  table.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-admin-profile-status]");
    if (!button) return;
    button.disabled = true;
    try {
      await Admin.setAccountStatus(profile.id, button.dataset.adminProfileStatus, button.dataset.nextStatus);
      await renderAdminUsers(profile);
      wireGlobalActions();
    } catch (error) {
      showMessage(error.message, "error");
      button.disabled = false;
    }
  });
  redraw();
}

async function renderAdminMerchants(profile) {
  const data = await Admin.loadAdminData();
  const rows = data.merchants.map((merchant) => ({
    ...merchant,
    owner_name: adminProfileName(data, merchant.owner_id)
  }));
  const content = `
    <section class="card card-pad stack">
      <div class="between">
        <div>
          <h2 class="section-title">Merchant management</h2>
          <p class="muted">Manage fictional merchants, QR status, and payment availability.</p>
        </div>
        <span class="badge">${rows.length} merchants</span>
      </div>
      ${adminTable(rows, ["business_name", "category", "merchant_code", "owner_name", "status", "created_at"], (row) => managedStatusButton("merchants", row))}
    </section>
    <div id="formMessage"></div>
  `;
  adminLayout("Merchants", content, profile);
  wireManagedStatus(profile, renderAdminMerchants);
}

async function renderAdminAgents(profile) {
  const data = await Admin.loadAdminData();
  const rows = data.agents.map((agent) => ({
    ...agent,
    agent_name: adminProfileName(data, agent.user_id),
    phone: Admin.profileById(data, agent.user_id)?.phone || "-"
  }));
  const content = `
    <section class="card card-pad stack">
      <div class="between">
        <div>
          <h2 class="section-title">Agent management</h2>
          <p class="muted">Control registered demo agents used for cash-in and cash-out simulations.</p>
        </div>
        <span class="badge">${rows.length} agents</span>
      </div>
      ${adminTable(rows, ["agent_name", "phone", "agent_code", "location", "status", "created_at"], (row) => managedStatusButton("agents", row))}
    </section>
    <div id="formMessage"></div>
  `;
  adminLayout("Agents", content, profile);
  wireManagedStatus(profile, renderAdminAgents);
}

async function renderAdminTransactions(profile) {
  const data = await Admin.loadAdminData();
  const rows = data.transactions.map((tx) => ({
    ...tx,
    sender_name: walletOwnerName(data, tx.sender_wallet_id),
    receiver_name: walletOwnerName(data, tx.receiver_wallet_id)
  }));
  const types = [...new Set(rows.map((tx) => tx.transaction_type).filter(Boolean))].sort();
  const content = `
    <section class="card card-pad stack">
      <div class="between">
        <div>
          <h2 class="section-title">Transaction management</h2>
          <p class="muted">Completed history is view-only. Corrections should use new auditable records.</p>
        </div>
        <span class="badge">${rows.length} records</span>
      </div>
      <div class="admin-toolbar">
        <label class="field"><span>Search</span><input class="input" id="adminTxSearch" placeholder="Name, ID, reference"></label>
        <label class="field"><span>Type</span><select class="select" id="adminTxType"><option value="all">All types</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(txLabel(type))}</option>`).join("")}</select></label>
        <label class="field"><span>Status</span><select class="select" id="adminTxStatus"><option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      <p class="help-text" id="adminTxCount"></p>
      <div id="adminTxTable"></div>
    </section>
  `;
  adminLayout("Transactions", content, profile);
  const search = document.getElementById("adminTxSearch");
  const type = document.getElementById("adminTxType");
  const status = document.getElementById("adminTxStatus");
  const count = document.getElementById("adminTxCount");
  const table = document.getElementById("adminTxTable");
  const redraw = () => {
    const filtered = Admin.filterTransactions(rows, {
      query: search.value,
      type: type.value,
      status: status.value
    });
    count.textContent = `${filtered.length} matching transaction${filtered.length === 1 ? "" : "s"}`;
    table.innerHTML = adminTable(filtered, ["transaction_id", "transaction_type", "sender_name", "receiver_name", "amount", "fee", "total_amount", "status", "created_at"]);
  };
  [search, type, status].forEach((control) => control.addEventListener("input", redraw));
  redraw();
}

function managedForm(table, fieldsHtml) {
  return `
    <form class="admin-form-grid" data-managed-form="${escapeHtml(table)}">
      ${fieldsHtml}
      <button class="button" type="submit">${icon("check")} Save</button>
    </form>
  `;
}

function servicePanel(title, table, rows, columns, formHtml) {
  return `
    <section class="card card-pad stack">
      <div class="between"><h2 class="section-title">${escapeHtml(title)}</h2><span class="badge">${rows.length} records</span></div>
      ${formHtml}
      ${adminTable(rows, columns, (row) => managedStatusButton(table, row))}
    </section>
  `;
}

async function renderAdminServices(profile) {
  const data = await Admin.loadAdminData();
  const billProviders = data.bill_providers.map((provider) => ({
    ...provider,
    category_name: data.bill_categories.find((category) => category.id === provider.category_id)?.name || provider.category_id
  }));
  const categoryOptions = data.bill_categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join("");
  const content = `
    <div class="admin-section-grid">
      ${servicePanel("Service categories", "service_categories", data.service_categories, ["name", "icon", "status"],
        managedForm("service_categories", `
          <label class="field"><span>Name</span><input class="input" name="name" placeholder="Cash services"></label>
          <label class="field"><span>Icon key</span><input class="input" name="icon" placeholder="settings"></label>
        `))}
      ${servicePanel("Recharge operators", "recharge_operators", data.recharge_operators, ["name", "logo_url", "status"],
        managedForm("recharge_operators", `
          <label class="field"><span>Name</span><input class="input" name="name" placeholder="Sky Demo Mobile"></label>
          <label class="field"><span>Logo URL</span><input class="input" name="logo_url" placeholder="Optional demo image URL"></label>
        `))}
      ${servicePanel("Bill categories", "bill_categories", data.bill_categories, ["name", "icon", "status"],
        managedForm("bill_categories", `
          <label class="field"><span>Name</span><input class="input" name="name" placeholder="Insurance"></label>
          <label class="field"><span>Icon key</span><input class="input" name="icon" placeholder="bill"></label>
        `))}
      ${servicePanel("Bill providers", "bill_providers", billProviders, ["name", "category_name", "logo_url", "status"],
        managedForm("bill_providers", `
          <label class="field"><span>Category</span><select class="select" name="category_id"><option value="">Choose category</option>${categoryOptions}</select></label>
          <label class="field"><span>Name</span><input class="input" name="name" placeholder="CloudLink Demo Fiber"></label>
          <label class="field"><span>Logo URL</span><input class="input" name="logo_url" placeholder="Optional demo image URL"></label>
        `))}
      ${servicePanel("Demo banks", "banks", data.banks, ["name", "status"],
        managedForm("banks", `
          <label class="field"><span>Name</span><input class="input" name="name" placeholder="Crescent Demo Bank"></label>
        `))}
      ${servicePanel("Donation organizations", "donation_organizations", data.donation_organizations, ["name", "description", "status"],
        managedForm("donation_organizations", `
          <label class="field"><span>Name</span><input class="input" name="name" placeholder="Bright Futures Demo Trust"></label>
          <label class="field"><span>Description</span><input class="input" name="description" placeholder="Fictional demo organization"></label>
        `))}
    </div>
    <div id="formMessage"></div>
  `;
  adminLayout("Services", content, profile);
  document.querySelectorAll("[data-managed-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        await Admin.saveManagedItem(profile.id, form.dataset.managedForm, Object.fromEntries(new FormData(form)));
        await renderAdminServices(profile);
        wireGlobalActions();
      } catch (error) {
        showMessage(error.message, "error");
        button.disabled = false;
      }
    });
  });
  wireManagedStatus(profile, renderAdminServices);
}

async function renderAdminAnnouncements(profile) {
  const data = await Admin.loadAdminData();
  const rows = data.notifications
    .filter((item) => item.type === "admin_announcement")
    .map((item) => ({
      ...item,
      recipient_name: adminProfileName(data, item.user_id)
    }));
  const content = `
    <section class="card card-pad stack">
      <div>
        <h2 class="section-title">Create announcement</h2>
        <p class="muted">Announcements become in-app notifications for active demo users.</p>
      </div>
      <form class="admin-form-grid wide" id="announcementForm">
        <label class="field"><span>Title</span><input class="input" name="title" maxlength="120" placeholder="Demo maintenance notice" required></label>
        <label class="field"><span>Target</span><select class="select" name="targetRole"><option value="all">All active users</option><option value="customer">Customers</option><option value="merchant">Merchants</option><option value="agent">Agents</option><option value="admin">Admins</option></select></label>
        <label class="field span-all"><span>Message</span><textarea class="textarea" name="message" maxlength="500" placeholder="Write a short educational demo announcement." required></textarea></label>
        <button class="button" type="submit">${icon("bell")} Publish announcement</button>
      </form>
    </section>
    <section class="card card-pad stack">
      <div class="between"><h2 class="section-title">Announcement log</h2><span class="badge">${rows.length} delivered records</span></div>
      ${adminTable(rows, ["title", "recipient_name", "message", "is_read", "created_at"])}
    </section>
    <div id="formMessage"></div>
  `;
  adminLayout("Announcements", content, profile);
  document.getElementById("announcementForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      await Admin.createAnnouncement(profile.id, Object.fromEntries(new FormData(event.currentTarget)));
      await renderAdminAnnouncements(profile);
      wireGlobalActions();
    } catch (error) {
      showMessage(error.message, "error");
      button.disabled = false;
    }
  });
}

async function renderAdminPromotions(profile) {
  const data = await Admin.loadAdminData();
  const content = `
    <section class="card card-pad stack">
      <div>
        <h2 class="section-title">Promotional banners</h2>
        <p class="muted">Create fictional demo banners without editing HTML.</p>
      </div>
      <form class="admin-form-grid wide" id="promotionForm">
        <label class="field"><span>Title</span><input class="input" name="title" placeholder="Practice merchant QR payments" required></label>
        <label class="field"><span>Status</span><select class="select" name="status"><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
        <label class="field"><span>Start date</span><input class="input" name="start_date" type="date"></label>
        <label class="field"><span>End date</span><input class="input" name="end_date" type="date"></label>
        <label class="field span-all"><span>Description</span><textarea class="textarea" name="description" maxlength="500" placeholder="Short banner copy for the demo dashboard."></textarea></label>
        <label class="field"><span>Image URL</span><input class="input" name="image_url" placeholder="Optional demo image URL"></label>
        <label class="field"><span>Link</span><input class="input" name="link" placeholder="pages/customer/payment.html"></label>
        <button class="button" type="submit">${icon("star")} Save promotion</button>
      </form>
    </section>
    <section class="card card-pad stack">
      <div class="between"><h2 class="section-title">Current promotions</h2><span class="badge">${data.promotions.length} banners</span></div>
      ${adminTable(data.promotions, ["title", "description", "link", "status", "start_date", "end_date"], (row) => managedStatusButton("promotions", row))}
    </section>
    <div id="formMessage"></div>
  `;
  adminLayout("Promotions", content, profile);
  document.getElementById("promotionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      await Admin.savePromotion(profile.id, Object.fromEntries(new FormData(event.currentTarget)));
      await renderAdminPromotions(profile);
      wireGlobalActions();
    } catch (error) {
      showMessage(error.message, "error");
      button.disabled = false;
    }
  });
  wireManagedStatus(profile, renderAdminPromotions);
}

async function renderAdminAudit(profile) {
  const data = await Admin.loadAdminData();
  const rows = data.audit_logs.map((item) => ({
    ...item,
    actor_name: adminProfileName(data, item.actor_id)
  }));
  const content = `
    <section class="card card-pad stack">
      <div class="between">
        <div>
          <h2 class="section-title">Audit logs</h2>
          <p class="muted">Admin and privileged demo actions are recorded for review.</p>
        </div>
        <span class="badge">${rows.length} events</span>
      </div>
      <div class="admin-toolbar single">
        <label class="field"><span>Search</span><input class="input" id="adminAuditSearch" placeholder="Actor, action, entity"></label>
      </div>
      <p class="help-text" id="adminAuditCount"></p>
      <div id="adminAuditTable"></div>
    </section>
  `;
  adminLayout("Audit Logs", content, profile);
  const search = document.getElementById("adminAuditSearch");
  const count = document.getElementById("adminAuditCount");
  const table = document.getElementById("adminAuditTable");
  const redraw = () => {
    const filtered = rows.filter((row) => Admin.textSearch(row, search.value));
    count.textContent = `${filtered.length} matching audit event${filtered.length === 1 ? "" : "s"}`;
    table.innerHTML = adminTable(filtered, ["actor_name", "action", "entity_type", "entity_id", "metadata", "created_at"]);
  };
  search.addEventListener("input", redraw);
  redraw();
}

async function renderAdminSettings(profile) {
  const data = await Admin.loadAdminData();
  const startingBalance = settingNumber(data, "starting_demo_balance", 25000);
  const maxTransaction = settingNumber(data, "max_demo_transaction_amount", 100000);
  const addMoneyLimit = settingNumber(data, "demo_daily_add_money_limit", 20000);
  const content = `
    <section class="card card-pad stack">
      <div>
        <h2 class="section-title">System settings</h2>
        <p class="muted">Settings are stored in the database, not hard-coded in admin HTML.</p>
      </div>
      <form class="admin-form-grid" id="settingsForm">
        <label class="field"><span>Starting demo balance</span><input class="input" type="number" min="0" step="100" name="starting_demo_balance" value="${startingBalance}"></label>
        <label class="field"><span>Maximum demo transaction</span><input class="input" type="number" min="1" step="100" name="max_demo_transaction_amount" value="${maxTransaction}"></label>
        <label class="field"><span>Daily add-money limit</span><input class="input" type="number" min="1" step="100" name="demo_daily_add_money_limit" value="${addMoneyLimit}"></label>
        <button class="button" type="submit">${icon("settings")} Save settings</button>
      </form>
      ${adminTable(data.system_settings, ["key", "value", "updated_at"])}
    </section>
    <section class="card card-pad stack">
      <div class="notice">${icon("shield")}<span><strong>Reset local preview data</strong>This only clears this browser's local demo database. Supabase data should be reset with controlled SQL and audit approval.</span></div>
      <button class="button danger" data-reset-demo>${icon("trash")} Reset local demo data</button>
    </section>
    <div id="formMessage"></div>
  `;
  adminLayout("Settings", content, profile);
  document.getElementById("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      await Promise.all(Object.entries(values).map(([key, value]) => Admin.updateSystemSetting(profile.id, key, { amount: Number(value) })));
      await renderAdminSettings(profile);
      wireGlobalActions();
    } catch (error) {
      showMessage(error.message, "error");
      button.disabled = false;
    }
  });
  document.querySelector("[data-reset-demo]").addEventListener("click", () => {
    if (!confirm("Reset this browser's local NexaPay demo data?")) return;
    Admin.resetLocalDemoData(profile.id);
    location.href = href("login.html");
  });
}

function adminTable(rows, columns, actions = null) {
  if (!rows.length) return `<div class="empty-state">${icon("receipt")}<strong>No records</strong></div>`;
  return `<div class="data-table"><table><thead><tr>${columns.map((col) => `<th>${escapeHtml(txLabel(col))}</th>`).join("")}${actions ? "<th>Action</th>" : ""}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((col) => `<td>${formatAdminCell(row, col)}</td>`).join("")}${actions ? `<td>${actions(row)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

function formatAdminCell(row, column) {
  const value = row[column];
  if (column === "status" || column === "account_status") return statusBadge(value);
  if (column === "is_read") return statusBadge(value ? "read" : "unread");
  if (["amount", "fee", "total_amount", "balance", "demo_money_in", "demo_money_out"].includes(column)) return escapeHtml(money(value));
  return escapeHtml(formatCell(value));
}

function formatCell(value) {
  if (typeof value === "number") return value.toLocaleString("en-BD");
  if (typeof value === "string" && value.includes("T")) return dateTime(value);
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return value ?? "-";
}

function fakeQr(value) {
  const seed = [...String(value)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cells = Array.from({ length: 81 }, (_, index) => {
    const finder =
      (index < 21 && index % 9 < 3) ||
      (index < 27 && index % 9 > 5) ||
      (index > 53 && index % 9 < 3);
    const dark = finder || ((seed + index * 17 + Math.floor(index / 3)) % 5 < 2);
    return `<span class="${dark ? "" : "light"}"></span>`;
  }).join("");
  return `<div class="fake-qr" aria-label="Simulated QR for ${escapeHtml(value)}">${cells}</div>`;
}

function wireDashboard() {
  const button = document.querySelector("[data-action='toggle-balance']");
  const value = document.getElementById("balanceValue");
  const realValue = value?.textContent || "";
  const sensitiveValues = [...document.querySelectorAll("[data-sensitive-value]")].map((node) => ({
    node,
    value: node.textContent
  }));
  let hidden = false;
  button?.addEventListener("click", () => {
    hidden = !hidden;
    value.textContent = hidden ? "৳••••••" : realValue;
    sensitiveValues.forEach((item) => {
      item.node.textContent = hidden ? "Hidden" : item.value;
    });
    button.innerHTML = icon(hidden ? "eye-off" : "eye");
  });
}

function wireDemoButtons() {
  document.querySelectorAll("[data-demo-role]").forEach((button) => {
    button.addEventListener("click", () => {
      const profile = Auth.startDemoSession(button.dataset.demoRole);
      const destinations = {
        customer: "pages/customer/dashboard.html",
        merchant: "pages/merchant/merchant-dashboard.html",
        agent: "pages/agent/agent-dashboard.html",
        admin: "pages/admin/admin-dashboard.html"
      };
      location.href = href(destinations[profile.role] || "pages/customer/dashboard.html");
    });
  });
}

function wireGlobalActions() {
  document.querySelectorAll("[data-action='logout']").forEach((button) => {
    button.addEventListener("click", async () => {
      await Auth.signOut();
      location.href = href("login.html");
    });
  });
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleTheme();
      document.querySelectorAll("[data-theme-label]").forEach((label) => {
        label.textContent = currentThemeLabel();
      });
    });
  });
}

function showMessage(message, type = "success") {
  const target = document.getElementById("formMessage");
  if (!target) return;
  if (!message || type === "clear") {
    target.innerHTML = "";
    return;
  }
  const className = type === "error" ? "error-state" : "success-state";
  target.innerHTML = `<div class="${className}">${icon(type === "error" ? "x" : "check")}<strong>${escapeHtml(message)}</strong></div>`;
}

async function render() {
  let authInitError = null;
  try {
    await Auth.initializeAuth();
  } catch (error) {
    authInitError = error;
    console.error(error);
  }

  const publicRoutes = {
    index: renderLanding,
    login: renderLogin,
    signup: renderSignupPhase3,
    "forgot-password": renderForgotPasswordPhase3,
    "reset-password": renderResetPassword
  };
  if (publicRoutes[PAGE]) {
    publicRoutes[PAGE]();
    if (authInitError) {
      showMessage(`Supabase session check failed: ${authInitError.message}`, "error");
    }
    wireGlobalActions();
    return;
  }

  if (authInitError) {
    const content = `
      <div class="auth-card card">
        ${brandRow("Authentication setup")}
        <h1>Supabase session check needs attention</h1>
        <p class="muted">${escapeHtml(authInitError.message)}</p>
        <a class="button full" href="${href("login.html")}">${icon("lock")} Back to login</a>
      </div>
    `;
    publicLayout(content);
    return;
  }

  const routeMap = {
    "customer-dashboard": ["customer", renderDashboard],
    "send-money": ["customer", renderSendMoney],
    "request-money": ["customer", renderRequestMoney],
    payment: ["customer", renderPayment],
    scan: ["customer", renderScan],
    "add-money": ["customer", renderAddMoney],
    "cash-out": ["customer", renderCashOut],
    recharge: ["customer", renderRecharge],
    bills: ["customer", renderBills],
    "bank-transfer": ["customer", renderBankTransfer],
    savings: ["customer", renderSavings],
    donation: ["customer", renderDonation],
    transactions: ["customer", renderTransactions],
    "transaction-details": [["customer", "merchant", "agent"], renderTransactionDetails],
    notifications: [["customer", "merchant", "agent"], renderNotifications],
    profile: [["customer", "agent"], renderProfile],
    "merchant-dashboard": ["merchant", renderMerchantDashboard],
    "merchant-payments": ["merchant", renderMerchantPayments],
    "merchant-qr": ["merchant", renderMerchantQr],
    "merchant-profile": ["merchant", renderMerchantProfile],
    "agent-dashboard": ["agent", renderAgentDashboard],
    "agent-cash-in": ["agent", renderAgentCashIn],
    "agent-cash-out": ["agent", renderAgentCashOut],
    "agent-transactions": ["agent", renderAgentTransactions],
    "admin-dashboard": ["admin", renderAdminOverview],
    "admin-users": ["admin", renderAdminUsers],
    "admin-merchants": ["admin", renderAdminMerchants],
    "admin-agents": ["admin", renderAdminAgents],
    "admin-transactions": ["admin", renderAdminTransactions],
    "admin-services": ["admin", renderAdminServices],
    "admin-announcements": ["admin", renderAdminAnnouncements],
    "admin-promotions": ["admin", renderAdminPromotions],
    "admin-audit-logs": ["admin", renderAdminAudit],
    "admin-settings": ["admin", renderAdminSettings]
  };

  const route = routeMap[PAGE] || routeMap["customer-dashboard"];
  const allowedRoles = Array.isArray(route[0]) ? route[0] : [route[0]];
  const profile = guard(allowedRoles);
  if (!profile) return;
  await route[1](profile);
  wireGlobalActions();
}

render().catch((error) => {
  console.error(error);
  publicLayout(`
    <div class="auth-card card">
      ${brandRow("App error")}
      <h1>NexaPay could not finish loading</h1>
      <p class="muted">${escapeHtml(error.message || "Unexpected error")}</p>
      <a class="button full" href="${href("login.html")}">${icon("lock")} Back to login</a>
    </div>
  `);
});
