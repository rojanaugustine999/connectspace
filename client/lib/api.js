// Every call from React to the Express API goes through this one helper.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function api(path, options = {}) {
  const hasBody = options.body !== undefined;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include", // send the JWT cookie (from Week 2)
    // Only send Content-Type when there IS a JSON body. On a cross-origin request, this header makes
    // the browser send an extra OPTIONS "preflight" request first, which would double every GET.
    headers: { ...(hasBody && { "Content-Type": "application/json" }), ...options.headers },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data.details || {}; // per-field messages, e.g. { email: "Enter a valid email" }
    throw err;
  }
  return data;
}
