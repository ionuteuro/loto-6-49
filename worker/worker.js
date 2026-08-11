// Cloudflare Worker: servește results.json de pe GitHub Pages
// cu headere CORS + cache, ca telefoanele să nu folosească un proxy public.
export default {
  async fetch(request, env, ctx) {
    const SOURCE = "https://ionuteuro.github.io/loto-6-49/results.json";
    try {
      const res = await fetch(SOURCE, { cf: { cacheTtl: 300 } });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
