import { createSeedState } from "./demo-data.js";

const STATE_KEY = "nexapay.demo.state.v1";
const SESSION_KEY = "nexapay.demo.session.v1";

export function getState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) {
    const seed = createSeedState();
    localStorage.setItem(STATE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const seed = createSeedState();
    localStorage.setItem(STATE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  return state;
}

export function withState(mutator) {
  const state = getState();
  const result = mutator(state);
  saveState(state);
  return result;
}

export function resetState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(createSeedState()));
  localStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
