import { ENDPOINTS } from "./api.mjs";

export const LEVEL_RANK = { fatal: 40, error: 30, warning: 20, info: 10 };
export const STATUS_RANK = { unresolved: 0, muted: 1, resolved: 2, ignored: 1 };

export function parseSince(since) {
  if (since === "0" || since === "none") return undefined;
  return since ?? "2w";
}

export function issuesQuery({ since, status, query, limit } = {}) {
  const q = {};
  const sp = parseSince(since);
  if (sp) q.statsPeriod = sp;
  if (status) q.status = status;
  if (query) q.query = query;
  if (limit) q.limit = limit;
  return q;
}

export function sortCriticality(issues) {
  return [...issues].sort((a, b) => {
    const la = LEVEL_RANK[a.level] ?? 0;
    const lb = LEVEL_RANK[b.level] ?? 0;
    if (lb !== la) return lb - la;
    // GlitchTip exposes times-seen as the string field `count`.
    const ta = Number(a.count) || 0;
    const tb = Number(b.count) || 0;
    if (tb !== ta) return tb - ta;
    const da = Date.parse(a.lastSeen ?? 0) || 0;
    const db = Date.parse(b.lastSeen ?? 0) || 0;
    if (db !== da) return db - da;
    return (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
  });
}

// --- handlers: each takes { client, config, args }, returns JSON-serialisable data ---

export async function ping({ client, config }) {
  // light probe: list a single issue for the configured org to validate auth+url+org
  return client.request(ENDPOINTS.issues(config.org), { query: { limit: 1 } })
    .then(() => ({ ok: true }))
    .catch((err) => ({ ok: false, error: err.message }));
}

export async function issues({ client, config, args }) {
  const q = issuesQuery(args);
  return client.request(ENDPOINTS.issues(config.org), { query: q });
}

export async function triage({ client, config, args }) {
  const q = issuesQuery({ ...args, status: args.status ?? "unresolved" });
  const list = await client.request(ENDPOINTS.issues(config.org), { query: q });
  return sortCriticality(Array.isArray(list) ? list : []);
}

export async function issue({ client, args }) {
  return client.request(ENDPOINTS.issue(args.id));
}

export async function event({ client, args }) {
  return client.request(ENDPOINTS.latestEvent(args.id));
}

export async function resolve({ client, args }) {
  return client.request(ENDPOINTS.issue(args.id), { method: "PUT", body: { status: "resolved" } });
}

export async function unresolve({ client, args }) {
  return client.request(ENDPOINTS.issue(args.id), { method: "PUT", body: { status: "unresolved" } });
}

export async function mute({ client, args }) {
  return client.request(ENDPOINTS.issue(args.id), { method: "PUT", body: { status: "muted" } });
}
