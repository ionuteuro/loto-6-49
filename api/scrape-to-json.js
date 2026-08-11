// Scrape loto.ro and write results.json at the repo root (used by GitHub Actions).
const fs = require("fs");
const path = require("path");
const { fetchLoto649 } = require("./lotoProxy");

fetchLoto649()
  .then((d) => {
    const out = path.resolve(__dirname, "..", "results.json");
    fs.writeFileSync(out, JSON.stringify(d, null, 2) + "\n");
    console.log("results.json written:", d.date, d.numbers.join(", "));
  })
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  });
