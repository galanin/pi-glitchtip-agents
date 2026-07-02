// Centralised Sentry-compatible (GlitchTip) REST endpoints + client.
export const ENDPOINTS = {
  // query: statsPeriod, status, query, limit
  issues: (org) => `/api/0/organizations/${org}/issues/`,
  issue: (id) => `/api/0/issues/${id}/`,
  latestEvent: (id) => `/api/0/issues/${id}/events/latest/`,
};

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export function createClient(config, fetchImpl = fetch, { maxRetries = 2, baseDelayMs = 200 } = {}) {
  const baseUrl = (config.baseUrl || "").replace(/\/+$/, "");
  const token = config.token;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function request(path, { query, method = "GET", body } = {}) {
    let url = baseUrl + path;
    if (query && Object.keys(query).length) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        qs.set(k, String(v));
      }
      url += `?${qs.toString()}`;
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const init = { method, headers, body: body ? JSON.stringify(body) : undefined };

    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let res;
      try {
        res = await fetchImpl(url, init);
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) { await sleep(baseDelayMs * 2 ** attempt); continue; }
        throw err;
      }
      let payload;
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }
      if (!res.ok) {
        const detail = payload && typeof payload === "object"
          ? (payload.detail != null ? String(payload.detail) : JSON.stringify(payload))
          : String(payload);
        lastErr = new Error(`${res.status}: ${detail}`);
        if (RETRYABLE.has(res.status) && attempt < maxRetries) {
          const retryAfter = res.headers?.get?.("retry-after");
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelayMs * 2 ** attempt;
          await sleep(delay);
          continue;
        }
        throw lastErr;
      }
      return payload;
    }
    throw lastErr;
  }

  return { request };
}
