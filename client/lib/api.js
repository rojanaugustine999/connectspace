// Every call from React to the Express API goes through this one helper.
// Relative URLs ("/api/...") go to this same site, and next.config.mjs passes them on to the Express API.
const API_URL = "";

// The API runs on Render's free plan, which goes to sleep after 15 minutes without visitors and
// takes up to about a minute to wake up. While it's waking, the Vercel proxy answers with an error
// page (not our JSON) or the connection fails. Instead of showing "Couldn't load", GET requests
// quietly retry for about a minute, and <WakingBanner /> tells the user what's happening.
const RETRY_DELAYS_MS = [1500, 2500, 4000, 5000, 7000, 8000, 10000, 10000, 12000]; // ≈ 60 s in total

let waitingRequests = 0; // how many requests are currently waiting for the server
function setWaking(delta) {
  waitingRequests += delta;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("api:waking", { detail: { waking: waitingRequests > 0 } }));
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Our Express API always answers with JSON. A 5xx that ISN'T our JSON came from the proxy,
// which means the API itself didn't answer (asleep, restarting, or deploying).
function isServerUnreachable(res) {
  if (!res) return true; // network error
  const isOurJson = res.headers.get("content-type")?.includes("application/json");
  return res.status >= 500 && !isOurJson;
}

export async function api(path, options = {}) {
  const hasBody = options.body !== undefined;
  const method = (options.method || "GET").toUpperCase();
  // Only GETs are retried: repeating a POST (e.g. "send message") could do it twice.
  const canRetry = method === "GET";

  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include", // send the JWT cookie (from Week 2)
      // Only send Content-Type when there IS a JSON body. On a cross-origin request, this header makes
      // the browser send an extra OPTIONS "preflight" request first, which would double every GET.
      headers: { ...(hasBody && { "Content-Type": "application/json" }), ...options.headers },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    }).catch(() => null); // network error → null, handled below

  let res = await send();
  if (canRetry && isServerUnreachable(res)) {
    setWaking(+1);
    try {
      for (const delay of RETRY_DELAYS_MS) {
        await sleep(delay);
        res = await send();
        if (!isServerUnreachable(res)) break;
      }
    } finally {
      setWaking(-1);
    }
  }

  if (!res) {
    const err = new Error("Can't reach the server. Check your connection and try again.");
    err.status = 0;
    err.details = {};
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.error || (res.status >= 500 ? "The server isn't responding right now. Try again in a minute." : `Request failed (${res.status})`)
    );
    err.status = res.status;
    err.details = data.details || {}; // per-field messages, e.g. { email: "Enter a valid email" }
    throw err;
  }
  return data;
}
