/* ============================================================
   Generator Loto 6/49 - logica aplicatiei
   ============================================================ */

/* ---------- Utilitare comune ---------- */

// Amestecare Fisher-Yates cu Crypto (aleator de calitate)
function secureShuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Numar aleator intreg in [0, max) folosind crypto daca e disponibil
function randomInt(max) {
  if (window.crypto && window.crypto.getRandomValues) {
    const range = 2 ** 32;
    const limit = range - (range % max);
    const buf = new Uint32Array(1);
    let x;
    do {
      window.crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }
  return Math.floor(Math.random() * max);
}

// Generează o variantă 6/49 (6 numere unice, sortate)
function drawSix() {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  return secureShuffle(pool).slice(0, 6).sort((a, b) => a - b);
}

function ballsHtml(numbers) {
  return (
    '<div class="balls">' +
    numbers.map((n) => `<span class="ball">${n}</span>`).join("") +
    "</div>"
  );
}

function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1600);
}

/* ============================================================
   TABURI
   ============================================================ */
document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* ============================================================
   TAB 1: GENERATOR ALEATOR
   ============================================================ */
const genResults = document.getElementById("gen-results");
let lastGenerated = [];

document.getElementById("gen-btn").addEventListener("click", () => {
  const count = Math.max(1, Math.min(50, parseInt(document.getElementById("gen-count").value) || 1));
  const noDup = document.getElementById("gen-no-duplicates").checked;

  const tickets = [];
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = count * 200;

  while (tickets.length < count && attempts < maxAttempts) {
    attempts++;
    const t = drawSix();
    const key = t.join("-");
    if (noDup && seen.has(key)) continue;
    seen.add(key);
    tickets.push(t);
  }

  lastGenerated = tickets;
  renderGenResults(tickets);
});

function renderGenResults(tickets) {
  if (!tickets.length) {
    genResults.innerHTML = '<p class="empty">Nicio variantă generată.</p>';
    return;
  }
  genResults.innerHTML = tickets
    .map(
      (t, i) =>
        `<div class="ticket"><span class="ticket-label">Varianta ${i + 1}</span>${ballsHtml(t)}</div>`
    )
    .join("");
}

document.getElementById("gen-clear").addEventListener("click", () => {
  lastGenerated = [];
  genResults.innerHTML = "";
});

document.getElementById("gen-copy").addEventListener("click", () => {
  if (!lastGenerated.length) {
    toast("Nimic de copiat");
    return;
  }
  const text = lastGenerated.map((t) => t.join(", ")).join("\n");
  copyText(text);
});

/* ---------- Buton "Ma simt norocos" ---------- */
document.getElementById("lucky-btn").addEventListener("click", () => {
  const count = Math.max(1, Math.min(50, parseInt(document.getElementById("gen-count").value) || 1));

  const results = [];
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = count * 60;

  // genereaza `count` variante (evitand duplicate)
  while (results.length < count && attempts < maxAttempts) {
    attempts++;
    const seed = "lucky-" + Date.now() + "-" + attempts + "-" + Math.floor(Math.random() * 1e6);
    const rng = (typeof ChaCha20RNG === "function") ? ChaCha20RNG(seed) : null;
    const res = luckyGenerate(history, rng);
    const key = res.combo.join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(res);
  }

  lastGenerated = results.map((r) => r.combo);

  // info comun (algoritmii combinati) - luat din prima varianta
  const first = results[0];
  const reasonsHtml = first.reasons.map((r) => `<li>${r}</li>`).join("");
  const noteHtml = first.usedHistory
    ? ""
    : '<p class="lucky-note">Fără istoric încărcat: se folosesc doar filtre de bază. Încarcă extragerile în tab-ul Analiză pentru mai multe filtre.</p>';

  // cate o "varianta" pe rand
  const combosHtml = results
    .map((res, i) => {
      const st = res.stats;
      const label = results.length > 1 ? `Varianta ${i + 1}` : "Varianta ta norocoasă";
      return `<div class="lucky-item">
          <div class="lucky-item-head">🎰 ${label}</div>
          ${ballsHtml(res.combo)}
          <div class="lucky-stats">
            <span>Sumă <b>${st.sum}</b></span>
            <span>Par/impar <b>${st.odd}-${st.even}</b></span>
            <span>Prime <b>${st.primes}</b></span>
          </div>
        </div>`;
    })
    .join("");

  genResults.innerHTML =
    `<div class="lucky-card">
       ${combosHtml}
       <p class="lucky-sub">Algoritmi combinați:</p>
       <ul class="lucky-reasons">${reasonsHtml}</ul>
       ${noteHtml}
       <p class="lucky-disclaimer">Doar divertisment — nu crește șansa de câștig.</p>
     </div>`;
});

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => toast("Copiat!"),
      () => fallbackCopy(text)
    );
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); toast("Copiat!"); } catch (e) { toast("Nu s-a putut copia"); }
  document.body.removeChild(ta);
}

/* ============================================================
   TAB 2: SCHEME REDUSE
   ============================================================ */
const schemeSelect = document.getElementById("scheme-select");
const schemeInfo = document.getElementById("scheme-info");
const schemeGrid = document.getElementById("scheme-grid");
const schemeSelectedCount = document.getElementById("scheme-selected-count");
const schemeRequired = document.getElementById("scheme-required");
const schemePickHint = document.getElementById("scheme-pick-hint");
const schemeResults = document.getElementById("scheme-results");

let currentScheme = null;
let schemeSelection = []; // numerele efective alese (1..49)

// Populeaza dropdown-ul
LOTO_SCHEMES.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s.id;
  opt.textContent = s.name;
  schemeSelect.appendChild(opt);
});

// Construiește grila 1..49
for (let n = 1; n <= 49; n++) {
  const cell = document.createElement("div");
  cell.className = "num-cell";
  cell.textContent = n;
  cell.dataset.num = n;
  cell.addEventListener("click", () => toggleSchemeNumber(n, cell));
  schemeGrid.appendChild(cell);
}

function toggleSchemeNumber(n, cell) {
  if (!currentScheme) loadScheme(schemeSelect.value);
  const idx = schemeSelection.indexOf(n);
  if (idx >= 0) {
    schemeSelection.splice(idx, 1);
    cell.classList.remove("selected");
  } else {
    if (schemeSelection.length >= currentScheme.picks) {
      toast(`Ai atins limita de ${currentScheme.picks} numere`);
      return;
    }
    schemeSelection.push(n);
    cell.classList.add("selected");
  }
  updateSchemeStatus();
}

function updateSchemeStatus() {
  schemeSelectedCount.textContent = schemeSelection.length;
  // dezactiveaza celulele neselectate cand s-a atins limita
  const atLimit = schemeSelection.length >= currentScheme.picks;
  schemeGrid.querySelectorAll(".num-cell").forEach((cell) => {
    const n = parseInt(cell.dataset.num);
    if (!schemeSelection.includes(n)) {
      cell.classList.toggle("disabled", atLimit);
    } else {
      cell.classList.remove("disabled");
    }
  });
}

function loadScheme(id) {
  currentScheme = LOTO_SCHEMES.find((s) => s.id === id);
  schemeSelection = [];
  schemeGrid.querySelectorAll(".num-cell").forEach((c) => {
    c.classList.remove("selected", "disabled");
  });
  schemeRequired.textContent = currentScheme.picks;
  schemePickHint.textContent = `Alege exact ${currentScheme.picks} numere din 49:`;
  const blockCount = getSchemeBlocks(currentScheme).length;
  schemeInfo.innerHTML =
    `<p><b>Garanție:</b> ${currentScheme.guarantee}</p>` +
    `<p><b>Detalii:</b> ${currentScheme.detail}</p>` +
    `<p><b>Numere de ales:</b> ${currentScheme.picks} · <b>Bilete generate:</b> ${blockCount}</p>`;
  schemeResults.innerHTML = "";
  updateSchemeStatus();
}

schemeSelect.addEventListener("change", () => loadScheme(schemeSelect.value));
// Initializam schema selectata implicit (altfel currentScheme ramane null
// pana se schimba dropdown-ul — pe mobil, selectarea unei optiuni deja
// preselectate nu declanseaza intotdeauna "change" si tab-ul pare blocat).
loadScheme(schemeSelect.value);

document.getElementById("scheme-random").addEventListener("click", () => {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  schemeSelection = secureShuffle(pool).slice(0, currentScheme.picks);
  schemeGrid.querySelectorAll(".num-cell").forEach((cell) => {
    const n = parseInt(cell.dataset.num);
    cell.classList.toggle("selected", schemeSelection.includes(n));
  });
  updateSchemeStatus();
});

document.getElementById("scheme-clear").addEventListener("click", () => {
  schemeSelection = [];
  schemeGrid.querySelectorAll(".num-cell").forEach((c) => c.classList.remove("selected"));
  updateSchemeStatus();
  schemeResults.innerHTML = "";
});

document.getElementById("scheme-build").addEventListener("click", () => {
  if (schemeSelection.length !== currentScheme.picks) {
    toast(`Alege exact ${currentScheme.picks} numere`);
    return;
  }
  // sorteaza numerele alese, apoi mapeaza indicii blocurilor
  const chosen = schemeSelection.slice().sort((a, b) => a - b);
  const blocks = getSchemeBlocks(currentScheme);
  const tickets = blocks.map((block) =>
    block.map((i) => chosen[i - 1]).sort((a, b) => a - b)
  );

  schemeResults.innerHTML =
    `<div class="ticket"><span class="ticket-label">Numere</span>${ballsHtml(chosen)}</div>` +
    `<p class="muted" style="margin:14px 0 6px;">Bilete de jucat (${tickets.length}):</p>` +
    tickets
      .map(
        (t, i) =>
          `<div class="ticket"><span class="ticket-label">Bilet ${i + 1}</span>${ballsHtml(t)}</div>`
      )
      .join("");
});

/* ============================================================
   TAB 3: PROBABILITATI
   ============================================================ */
function combGeneric(n, r) {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let num = 1, den = 1;
  for (let i = 0; i < r; i++) {
    num *= n - i;
    den *= i + 1;
  }
  return num / den;
}

function buildProbTable() {
  const total = combGeneric(49, 6); // 13.983.816
  const rows = [];
  const catNames = {
    6: "Categoria I",
    5: "Categoria II",
    4: "Categoria III",
    3: "Categoria IV",
    2: "Doar 2 numere",
  };
  const catDesc = {
    6: "6 numere",
    5: "5 numere",
    4: "4 numere",
    3: "3 numere",
    2: "necastigator",
  };
  for (let k = 6; k >= 2; k--) {
    const favorable = combGeneric(6, k) * combGeneric(43, 6 - k);
    const prob = favorable / total;
    const oneIn = Math.round(1 / prob);
    rows.push({
      k,
      name: catNames[k],
      desc: catDesc[k],
      favorable,
      oneIn,
      pct: (prob * 100).toFixed(k >= 5 ? 7 : 5),
    });
  }

  const fmt = (x) => x.toLocaleString("ro-RO");

  const html =
    '<ul class="prob-list">' +
    rows
      .map(
        (r) =>
          `<li class="prob-row">
             <div class="prob-main">
               <span class="prob-name">${r.name}</span>
               <span class="prob-desc">${r.desc}</span>
             </div>
             <div class="prob-vals">
               <span class="prob-odds">1 din ${fmt(r.oneIn)}</span>
               <span class="prob-pct">${r.pct}%</span>
             </div>
           </li>`
      )
      .join("") +
    `<li class="prob-row prob-total">
       <div class="prob-main"><span class="prob-name">Total combinații</span></div>
       <div class="prob-vals"><span class="prob-odds">${fmt(total)}</span></div>
     </li>` +
    "</ul>";

  document.getElementById("prob-table").innerHTML = html;
}

/* ============================================================
   TAB 4: ANALIZA (istoric + algoritmi statistici)
   ============================================================ */
const STORAGE_KEY = "loto649_history";
let history = []; // array de extrageri, fiecare = [6 numere sortate]

// ---- Persistenta locala ----
function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (e) {}
}
function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) history = JSON.parse(raw) || [];
  } catch (e) { history = []; }
}

// ---- Parsare text/CSV in extrageri ----
// Accepta linii de forma: "2024-01-01, 3 12 24 31 40 45" sau doar "3,12,24,31,40,45"
function parseDrawsText(text) {
  const draws = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    // extrage toate numerele din linie
    const nums = (line.match(/\d+/g) || []).map(Number);
    // ignora un eventual an/data: pastram doar numerele intre 1..49
    const valid = nums.filter((n) => n >= 1 && n <= 49);
    // luam ultimele 6 numere valide (in caz ca data contine cifre)
    if (valid.length >= 6) {
      const six = valid.slice(-6);
      const uniq = [...new Set(six)];
      if (uniq.length === 6) draws.push(uniq.sort((a, b) => a - b));
    }
  }
  return draws;
}

// ---- Set demo (generat aleator, NEREAL) ----
function generateDemoHistory(count = 300) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(drawSix());
  return out;
}

// ---- UI refs ----
const histStatus = document.getElementById("hist-status");
const histImportText = document.getElementById("hist-import-text");
const analysisOutput = document.getElementById("analysis-output");
const analysisEmpty = document.getElementById("analysis-empty-hint");

function updateHistStatus() {
  if (!histStatus) return;
  if (history.length === 0) {
    histStatus.innerHTML = '<span class="badge badge-warn">Fără date</span> Importă extragerile sau încarcă setul demo.';
  } else {
    histStatus.innerHTML = `<span class="badge badge-ok">${history.length} extrageri</span> disponibile pentru analiza.`;
  }
}

function refreshAnalysisVisibility() {
  const has = history.length > 0;
  if (analysisEmpty) {
    analysisEmpty.style.display = has ? "none" : "block";
    if (!has) analysisEmpty.innerHTML =
      '<div class="empty">Nicio extragere încărcată. Importă date sau folosește setul demo pentru a vedea analizele.</div>';
  }
  if (analysisOutput) analysisOutput.style.display = has ? "block" : "none";
}

// ---- Randare rezultate analiza ----
function miniBalls(numbers) {
  return (
    '<div class="balls mini">' +
    numbers.map((n) => `<span class="ball mini">${n}</span>`).join("") +
    "</div>"
  );
}

function runAllAnalyses() {
  if (history.length === 0) { refreshAnalysisVisibility(); return; }
  refreshAnalysisVisibility();

  const freq = frequencyAnalysis(history);
  const markov = markovAnalysis(history);
  const km = kmeansAnalysis(history, 3);
  const sum = sumAnalysis(history);
  const pp = parityPrimeAnalysis(history);

  let html = "";

  // --- Frecventa ---
  html += analysisBlock(
    "Frecvența numerelor",
    "Cele mai des și mai rar extrase numere din istoric.",
    `<p class="an-sub">Calde (frecvente)</p>${miniBalls(freq.hot.map((x) => x.n))}
     <p class="an-sub">Reci (rare)</p>${miniBalls(freq.cold.map((x) => x.n))}`
  );

  // --- Markov ---
  if (markov) {
    html += analysisBlock(
      "Lanturi Markov",
      "Numere cu cea mai mare probabilitate de tranzitie dupa ultima extragere.",
      `<p class="an-sub">Ultima extragere</p>${miniBalls(markov.last)}
       <p class="an-sub">Top candidati (scor tranzitie)</p>${miniBalls(markov.top.map((x) => x.n))}`
    );
  }

  // --- K-Means ---
  if (km) {
    let clHtml = "";
    for (const c of km.clusters) {
      clHtml += `<div class="cluster">
        <div class="cluster-head"><span class="an-sub">${c.label}</span>
        <span class="an-meta">${c.numbers.length} nr · frecv. medie ${c.avgFreq.toFixed(1)}</span></div>
        ${miniBalls(c.numbers)}
      </div>`;
    }
    html += analysisBlock(
      "Clustering K-Means",
      "Grupează numerele după frecvență și recenta în 3 grupuri.",
      clHtml
    );
  }

  // --- Suma / Normala ---
  if (sum) {
    const maxBin = Math.max(...sum.bins.map((b) => b.count), 1);
    const barsHtml = sum.bins
      .map(
        (b) =>
          `<div class="bar-row">
             <span class="bar-label">${b.from}-${b.to}</span>
             <span class="bar-track"><span class="bar-fill" style="width:${(b.count / maxBin) * 100}%"></span></span>
             <span class="bar-val">${b.count}</span>
           </div>`
      )
      .join("");
    html += analysisBlock(
      "Filtru de sumă (distribuția normală)",
      "Suma celor 6 numere tinde spre o distributie normala.",
      `<div class="stat-grid">
         <div><span class="stat-num">${sum.mean.toFixed(0)}</span><span class="stat-lbl">medie</span></div>
         <div><span class="stat-num">${sum.std.toFixed(0)}</span><span class="stat-lbl">abatere</span></div>
         <div><span class="stat-num">${sum.range68[0]}-${sum.range68[1]}</span><span class="stat-lbl">interval tipic</span></div>
       </div>
       <p class="an-sub">Distribuția sumelor</p>
       <div class="bars">${barsHtml}</div>`
    );
  }

  // --- Par/Impar/Prime ---
  if (pp) {
    const oeHtml = pp.oeDist
      .slice(0, 5)
      .map((o) => `<div class="dist-row"><span>${o.key} (impar-par)</span><span class="dist-pct">${o.pct.toFixed(1)}%</span></div>`)
      .join("");
    const primeHtml = pp.primeDist
      .map((p) => `<div class="dist-row"><span>${p.primes} prime</span><span class="dist-pct">${p.pct.toFixed(1)}%</span></div>`)
      .join("");
    html += analysisBlock(
      "Raport par/impar & numere prime",
      "Tiparele de paritate și numărul de prime din extrageri.",
      `<div class="stat-grid">
         <div><span class="stat-num">${pp.oddRatio.toFixed(0)}%</span><span class="stat-lbl">impare</span></div>
         <div><span class="stat-num">${pp.evenRatio.toFixed(0)}%</span><span class="stat-lbl">pare</span></div>
         <div><span class="stat-num">${pp.avgPrimes.toFixed(1)}</span><span class="stat-lbl">prime/extragere</span></div>
       </div>
       <p class="an-sub">Tipare impar-par frecvente</p>${oeHtml}
       <p class="an-sub">Distribuția numerelor prime</p>${primeHtml}`
    );
  }

  analysisOutput.innerHTML = html;
}

function analysisBlock(title, desc, body) {
  return `<div class="card an-card">
    <h3 class="an-title">${title}</h3>
    <p class="an-desc">${desc}</p>
    ${body}
  </div>`;
}

// ---- Generator ghidat ----
function renderGuided() {
  const out = document.getElementById("guided-results");
  if (history.length === 0) { toast("Importă mai întâi extragerile"); return; }
  const useSum = document.getElementById("guided-sum").checked;
  const useParity = document.getElementById("guided-parity").checked;
  const useMarkov = document.getElementById("guided-markov").checked;
  const combos = [];
  for (let i = 0; i < 5; i++) {
    combos.push(guidedGenerate(history, { useSum, useParity, useMarkov }));
  }
  out.innerHTML = combos
    .map((c, i) => `<div class="ticket"><span class="ticket-label">Var. ${i + 1}</span>${ballsHtml(c)}</div>`)
    .join("");
}

// ---- Event handlers analiza ----
function initAnalysisTab() {
  loadHistoryFromStorage();
  updateHistStatus();
  refreshAnalysisVisibility();
  if (history.length > 0) runAllAnalyses();

  const importBtn = document.getElementById("hist-import-btn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      const parsed = parseDrawsText(histImportText.value);
      if (parsed.length === 0) {
        toast("Nu am găsit extrageri valide");
        return;
      }
      history = parsed;
      saveHistory();
      updateHistStatus();
      runAllAnalyses();
      toast(`${parsed.length} extrageri importate`);
    });
  }

  const fileInput = document.getElementById("hist-file");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        histImportText.value = reader.result;
        toast("Fișier încărcat - apăsați Importa");
      };
      reader.readAsText(file);
    });
  }

  const demoBtn = document.getElementById("hist-demo-btn");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      history = generateDemoHistory(300);
      saveHistory();
      updateHistStatus();
      runAllAnalyses();
      toast("Set demo încărcat (300 extrageri nereale)");
    });
  }

  const clearBtn = document.getElementById("hist-clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      history = [];
      saveHistory();
      updateHistStatus();
      refreshAnalysisVisibility();
      analysisOutput.innerHTML = "";
      document.getElementById("guided-results").innerHTML = "";
      toast("Istoric șters");
    });
  }

  const guidedBtn = document.getElementById("guided-btn");
  if (guidedBtn) guidedBtn.addEventListener("click", renderGuided);

  initGreedyAnneal();
}

/* ============================================================
   GREEDY + SIMULATED ANNEALING (in tab Analiza)
   ============================================================ */
let lastGreedy = null; // { tickets, numbers, M, K }

function parseChosenNumbers(str) {
  const nums = (str.match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 49);
  return [...new Set(nums)].sort((a, b) => a - b);
}

function initGreedyAnneal() {
  const kSel = document.getElementById("greedy-k");
  const mSel = document.getElementById("greedy-m");
  const numsInput = document.getElementById("greedy-nums");
  const info = document.getElementById("greedy-info");
  const results = document.getElementById("greedy-results");
  const annealInfo = document.getElementById("anneal-info");
  const annealResults = document.getElementById("anneal-results");
  if (!kSel || !mSel) return;

  // pop010 optiuni K (3..6) si M (3..6)
  for (let k = 3; k <= 6; k++) {
    const o = document.createElement("option");
    o.value = k; o.textContent = k;
    if (k === 4) o.selected = true;
    kSel.appendChild(o);
  }
  for (let m = 3; m <= 6; m++) {
    const o = document.createElement("option");
    o.value = m; o.textContent = m;
    if (m === 4) o.selected = true;
    mSel.appendChild(o);
  }

  document.getElementById("greedy-random").addEventListener("click", () => {
    // 8-10 numere aleatorii
    const howMany = 8 + Math.floor(Math.random() * 3);
    const pool = Array.from({ length: 49 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    numsInput.value = pool.slice(0, howMany).sort((a, b) => a - b).join(" ");
  });

  const GREEDY_MAX_NUMBERS = 14; // limita ca să nu blocăm UI-ul (combinatorică)

  document.getElementById("greedy-build").addEventListener("click", () => {
    const numbers = parseChosenNumbers(numsInput.value);
    let K = parseInt(kSel.value), M = parseInt(mSel.value);
    if (numbers.length < 6) { toast("Alege minim 6 numere"); return; }
    if (numbers.length > GREEDY_MAX_NUMBERS) {
      toast(`Maxim ${GREEDY_MAX_NUMBERS} numere (altfel durează prea mult)`);
      return;
    }
    if (K > M) { toast("K nu poate fi mai mare decât M"); return; }
    if (M > numbers.length) { toast("M nu poate depăși numerele alese"); return; }

    info.innerHTML = '<div class="empty">Se construiește...</div>';
    results.innerHTML = "";
    annealInfo.innerHTML = "";
    annealResults.innerHTML = "";

    // ruleaza asincron ca sa nu blocheze UI
    setTimeout(() => {
      const g = greedyCover(numbers, M, K);
      lastGreedy = { tickets: g.tickets, numbers, M, K };
      const badge = g.guaranteed
        ? '<span class="badge badge-ok">garantat</span>'
        : '<span class="badge badge-warn">partial</span>';
      info.innerHTML =
        `<div class="card an-inline">${badge}
         <strong>${g.tickets.length}</strong> bilete pentru
         ${numbers.length} numere · garanție ${K} din ${M}
         · ${g.targetsTotal} combinații acoperite</div>`;
      results.innerHTML =
        `<div class="ticket"><span class="ticket-label">Numere</span>${ballsHtml(numbers)}</div>` +
        `<p class="an-sub">Bilete (${g.tickets.length})</p>` +
        g.tickets
          .map((t, i) => `<div class="ticket"><span class="ticket-label">Bilet ${i + 1}</span>${ballsHtml(t)}</div>`)
          .join("");
    }, 20);
  });

  document.getElementById("anneal-btn").addEventListener("click", () => {
    if (!lastGreedy || lastGreedy.tickets.length === 0) {
      toast("Construiește mai întâi o schemă");
      return;
    }
    annealInfo.innerHTML = '<div class="empty">Se optimizează...</div>';
    annealResults.innerHTML = "";

    setTimeout(() => {
      const { tickets, numbers, M, K } = lastGreedy;
      const sa = simulatedAnnealing(tickets, numbers, M, K, {
        iterations: 4000, T0: 2, cooling: 0.998,
      });
      const saved = sa.reducedFrom - sa.reducedTo;
      const badge = sa.guaranteed
        ? '<span class="badge badge-ok">Garanție păstrată</span>'
        : '<span class="badge badge-warn">verifică</span>';
      annealInfo.innerHTML =
        `<div class="card an-inline">${badge}
         ${sa.reducedFrom} → <strong>${sa.reducedTo}</strong> bilete
         ${saved > 0 ? `(−${saved})` : "(deja optim)"}</div>`;
      annealResults.innerHTML =
        `<p class="an-sub">Bilete optimizate (${sa.tickets.length})</p>` +
        sa.tickets
          .map((t, i) => `<div class="ticket"><span class="ticket-label">Bilet ${i + 1}</span>${ballsHtml(t)}</div>`)
          .join("");
    }, 20);
  });
}

/* ============================================================
   BACKTRACKING (generator cu constrangeri, in tab Analiza)
   ============================================================ */
function initBacktracking() {
  const evenSel = document.getElementById("bt-even");
  const primeSel = document.getElementById("bt-prime");
  if (!evenSel || !primeSel) return;

  // optiuni: "oricat" (null) + 0..6
  const fillSel = (sel) => {
    const any = document.createElement("option");
    any.value = ""; any.textContent = "oricât";
    sel.appendChild(any);
    for (let i = 0; i <= 6; i++) {
      const o = document.createElement("option");
      o.value = i; o.textContent = i;
      sel.appendChild(o);
    }
  };
  fillSel(evenSel);
  fillSel(primeSel);

  const info = document.getElementById("bt-info");
  const results = document.getElementById("bt-results");

  const parseNums = (str) =>
    [...new Set((str.match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 49))];

  document.getElementById("bt-reset").addEventListener("click", () => {
    document.getElementById("bt-summin").value = "";
    document.getElementById("bt-summax").value = "";
    evenSel.value = "";
    primeSel.value = "";
    document.getElementById("bt-include").value = "";
    document.getElementById("bt-exclude").value = "";
    document.getElementById("bt-count").value = "3";
    info.innerHTML = "";
    results.innerHTML = "";
  });

  document.getElementById("bt-build").addEventListener("click", () => {
    const sumMinRaw = document.getElementById("bt-summin").value.trim();
    const sumMaxRaw = document.getElementById("bt-summax").value.trim();
    const evenRaw = evenSel.value;
    const primeRaw = primeSel.value;
    const include = parseNums(document.getElementById("bt-include").value);
    const exclude = parseNums(document.getElementById("bt-exclude").value);
    const limit = Math.max(1, Math.min(20, parseInt(document.getElementById("bt-count").value) || 3));

    const constraints = {
      sumMin: sumMinRaw ? parseInt(sumMinRaw) : 21,
      sumMax: sumMaxRaw ? parseInt(sumMaxRaw) : 279,
      evenCount: evenRaw === "" ? null : parseInt(evenRaw),
      primeCount: primeRaw === "" ? null : parseInt(primeRaw),
      include,
      exclude,
    };

    if (constraints.sumMin > constraints.sumMax) {
      toast("Suma min nu poate depăși suma max");
      return;
    }

    info.innerHTML = '<div class="empty">Se caută soluții...</div>';
    results.innerHTML = "";

    setTimeout(() => {
      const rng = (typeof ChaCha20RNG === "function")
        ? ChaCha20RNG("bt-" + Date.now())
        : null;
      const r = backtrackGenerate(constraints, { limit, shuffle: true, rng });

      if (!r.valid) {
        const reason = (r.reason || "Nicio soluție.").replace(/&#\d+;/g, (m) => m);
        info.innerHTML =
          `<div class="card an-inline"><span class="badge badge-warn">fără soluție</span> ${r.reason || ""}</div>`;
        return;
      }

      // descriere constrangeri aplicate
      const parts = [];
      if (sumMinRaw || sumMaxRaw) parts.push(`sumă ${constraints.sumMin}–${constraints.sumMax}`);
      if (constraints.evenCount !== null) parts.push(`${constraints.evenCount} pare`);
      if (constraints.primeCount !== null) parts.push(`${constraints.primeCount} prime`);
      if (include.length) parts.push(`include ${include.join(",")}`);
      if (exclude.length) parts.push(`exclude ${exclude.length} nr.`);
      const desc = parts.length ? parts.join(" · ") : "fără constrângeri";

      info.innerHTML =
        `<div class="card an-inline"><span class="badge badge-ok">${r.solutions.length} soluții</span>
         ${desc} · ${r.steps} pași</div>`;

      results.innerHTML = r.solutions
        .map((s, i) => {
          const sum = s.reduce((a, b) => a + b, 0);
          return `<div class="ticket"><span class="ticket-label">Var. ${i + 1}</span>${ballsHtml(s)}<span class="ticket-sum">&Sigma;${sum}</span></div>`;
        })
        .join("");
    }, 20);
  });
}

/* ============================================================
   LIVE RESULTS (Loto 6/49 via loto.ro)
   ============================================================ */
const LOTO_API_URL = "https://raw.githubusercontent.com/ionuteuro/loto-6-49/main/results.json";
const LOTO_SOURCE_URL =
  "https://www.loto.ro/loto-new/newLotoSiteNexioFinalVersion/web/app2.php/jocuri/649_si_noroc/rezultate_extragere.html";
const LOTO_REFRESH_MS = 10 * 60 * 1000; // auto-refresh every 10 min

let liveLastFetched = null;

function parseLotoHtmlDOM(htmlStr) {
  const doc = new DOMParser().parseFromString(htmlStr, "text/html");
  const block = doc.querySelector(".rezultate-extrageri-content");
  if (!block) throw new Error("Nu am gasit rezultatele");
  const imgs = block.querySelectorAll(".numere-extrase img");
  const numbers = [];
  imgs.forEach((img) => {
    const m = (img.getAttribute("src") || "").match(/bile\/(\d+)\.png/);
    if (m && numbers.length < 6) numbers.push(parseInt(m[1], 10));
  });
  if (numbers.length < 6) throw new Error("Numere incomplete");
  const det = block.querySelector(".button-open-details span");
  return { date: det ? det.textContent.trim() : null, numbers };
}

async function fetchLotoFallback() {
  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?url=",
  ];
  for (const base of proxies) {
    try {
      const res = await fetch(base + encodeURIComponent(LOTO_SOURCE_URL));
      if (!res.ok) continue;
      const html = await res.text();
      return { ...parseLotoHtmlDOM(html), fetchedAt: new Date().toISOString() };
    } catch (_) {
      /* try next proxy */
    }
  }
  throw new Error("Nu s-au putut prelua rezultatele");
}

async function tryJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const d = await res.json();
  if (!d || !Array.isArray(d.numbers) || d.numbers.length !== 6) {
    throw new Error("date invalide");
  }
  return { ...d, fetchedAt: d.fetchedAt || new Date().toISOString() };
}

async function fetchLoto() {
  // 1) results.json served same-origin (GitHub Pages / local server)
  // 2) local Node API
  // 3) public CORS proxy fallback (client-only)
  const sources = ["results.json", LOTO_API_URL];
  for (const src of sources) {
    try {
      return await tryJson(src);
    } catch (_) {
      /* try next */
    }
  }
  return fetchLotoFallback();
}

function timeAgo(iso) {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "acum câteva secunde";
  const min = Math.round(sec / 60);
  if (min < 60) return `actualizat acum ${min} min`;
  const h = Math.round(min / 60);
  return `actualizat acum ${h} h`;
}

function renderLive(data) {
  const balls = document.getElementById("live-balls");
  const dateEl = document.getElementById("live-date");
  const updEl = document.getElementById("live-updated");
  if (!data || !data.numbers || data.numbers.length !== 6) {
    balls.innerHTML = '<span class="live-loading">Rezultate indisponibile</span>';
    return;
  }
  balls.innerHTML = ballsHtml(data.numbers);
  dateEl.textContent = data.date ? `Extragere ${data.date}` : "";
  liveLastFetched = data.fetchedAt || new Date().toISOString();
  updEl.textContent = timeAgo(liveLastFetched) + (data.stale ? " (date mai vechi)" : "");
}

async function loadLiveResults() {
  const balls = document.getElementById("live-balls");
  if (balls) balls.innerHTML = '<span class="live-loading">Se încarcă…</span>';
  try {
    const data = await fetchLoto();
    renderLive(data);
  } catch (e) {
    if (balls) balls.innerHTML = '<span class="live-loading">Rezultate indisponibile</span>';
    const updEl = document.getElementById("live-updated");
    if (updEl) updEl.textContent = "Eroare la preluare";
  }
}

function initLiveResults() {
  const btn = document.getElementById("live-refresh");
  if (btn) btn.addEventListener("click", loadLiveResults);
  loadLiveResults();
  setInterval(loadLiveResults, LOTO_REFRESH_MS);
  setInterval(() => {
    if (liveLastFetched) {
      const updEl = document.getElementById("live-updated");
      if (updEl) updEl.textContent = timeAgo(liveLastFetched);
    }
  }, 30000);
}

/* ============================================================
   INIT
   ============================================================ */
loadScheme(LOTO_SCHEMES[0].id);
buildProbTable();
initAnalysisTab();
initBacktracking();
initLiveResults();
// genereaza o varianta initiala pentru demonstratie
document.getElementById("gen-btn").click();

/* ============================================================
   LOADING OVERLAY
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const loading = document.getElementById("app-loading");
  const phone = document.querySelector(".phone");
  if (loading && phone) {
    setTimeout(() => {
      loading.classList.add("hidden");
      phone.classList.add("loaded");
    }, 600);
  }
});
