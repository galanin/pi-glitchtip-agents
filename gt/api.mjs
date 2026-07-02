// Centralised Sentry-compatible (GlitchTip) REST endpoints + client.
export const ENDPOINTS = {
  // query: statsPeriod, status, query, limit
  issues: (org) => `/api/0/organizations/${org}/issues/`,
  issue: (id) => `/api/0/issues/${id}/`,
  latestEvent: (id) => `/api/0/issues/${id}/events/latest/`,
};

export function createClient(config, fetchImpl = fetch) {
  const baseUrl = (config.baseUrl || "").replace(/\/+$/, "");
  const token = config.token;

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
    const res = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let payload;
    try {
      payload = await res.json();
    } catch {
      payload = {};
    }
    if (!res.ok) {
      // Prefer the body's `detail` field (Sentry/GlitchTip convention); fall
      // back to a JSON dump of the payload, or its string form for non-objects.
      let detail;
      if (payload && typeof payload === "object") {
        detail = payload.detail != null ? String(payload.detail) : JSON.stringify(payload);
      } else {
        detail = String(payload);
      }
      throw new Error(`${res.status}: ${detail}`);
    }
    return payload;
  }

  return { request };
}
