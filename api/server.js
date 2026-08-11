// Tiny zero-dependency server for the Loto 6/49 app.
//  - Serves the static PWA from the project root
//  - Exposes GET /api/loto649 with a cached scrape of loto.ro
// Run:  node api/server.js   (then open http://localhost:3000)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { fetchLoto649 } = require("./lotoProxy");

const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.PORT || 3000;
const CACHE_TTL = 15 * 60 * 1000; // 15 min

let cache = null; // { time, data }

async function getLoto() {
  const now = Date.now();
  if (cache && now - cache.time < CACHE_TTL) return cache.data;
  try {
    const data = await fetchLoto649();
    cache = { time: now, data };
    return data;
  } catch (e) {
    if (cache) return { ...cache.data, stale: true, error: e.message };
    throw e;
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/loto649" || url.pathname === "/results.json") {
    try {
      const data = await getLoto();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // static files
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(ROOT, "index.html"), (e2, idx) => {
        if (e2) {
          res.writeHead(404);
          res.end("Not found");
        } else {
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          res.end(idx);
        }
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log(`Loto app + API running at http://localhost:${PORT}`);
});
