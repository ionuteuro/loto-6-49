// Fetch + parse the latest Loto 6/49 draw from loto.ro
// Zero external dependencies (Node built-in fetch, requires Node >= 18).

const RESULTS_URL =
  "https://www.loto.ro/loto-new/newLotoSiteNexioFinalVersion/web/app2.php/jocuri/649_si_noroc/rezultate_extragere.html";

function parseLotoHtml(html) {
  // First draw block on the page is the most recent one.
  const blockStart = html.indexOf('class="rezultate-extrageri-content');
  if (blockStart === -1) throw new Error("Nu am gasit sectiunea de rezultate");
  const block = html.slice(blockStart, blockStart + 6000);

  const balls = [];
  const re = /bile\/(\d+)\.png/g;
  let m;
  while ((m = re.exec(block)) !== null && balls.length < 6) {
    balls.push(parseInt(m[1], 10));
  }
  if (balls.length < 6) throw new Error("Nu am putut extrage cele 6 numere");

  const dateMatch = block.match(/la 6\/49 din <span>([\d.]+)<\/span>/);
  const date = dateMatch ? dateMatch[1] : null;

  return { date, numbers: balls };
}

async function fetchLoto649() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let text;
  try {
    const res = await fetch(RESULTS_URL, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    text = await res.text();
  } finally {
    clearTimeout(timer);
  }
  const parsed = parseLotoHtml(text);
  return { ...parsed, source: RESULTS_URL, fetchedAt: new Date().toISOString() };
}

module.exports = { fetchLoto649, parseLotoHtml, RESULTS_URL };
