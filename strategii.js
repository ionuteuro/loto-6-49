/* ============================================================
   ALGORITMI STRATEGICI SUPLIMENTARI - Loto 6/49
   ------------------------------------------------------------
   Acest modul adaugă algoritmi de analiză și generare care
   completează ceea ce există deja în analysis.js / algorithms.js:

   ANALIZĂ
     1) gapAnalysis          - decalaje între apariții (model Poisson)
     2) cooccurrenceAnalysis - perechi / triple care apar împreună
     3) bootstrapSignificance - semnificația statistică a numerelor „calde”
     4) entropyAnalysis      - test chi-pătrat de uniformitate

   GENERARE / OPTIMIZARE
     5) bayesianProbabilities - probabilități posterior (Beta-Binomial)
     6) lowDiscrepancyGenerate - secvențe Sobol / Halton (acoperire uniformă)
     7) geneticGenerate      - algoritm genetic pentru bilete echilibrate
     8) monteCarloHitRate    - estimare Monte Carlo a șanselor unui sistem

   IMPORTANT: niciunul dintre acești algoritmi NU prezice câștigătorul.
   Extragerile sunt independente și aleatorii. Toate metodele de mai jos
   descriu trecutul sau produc combinații „plauzibile” / bine răspândite,
   fără să crească șansa reală de câștig. Sunt instrumente educative.
   ============================================================ */

/* ------------------------------------------------------------
   Utilitare comune
   ------------------------------------------------------------ */

// Numărul total de apariții așteptate per număr într-un istoric:
// fiecare extragere are 6 numere din 49, deci probabilitatea ca un
// anumit număr să apară într-o extragere este p = 6/49 (aproximativ).
const LOTO_P = 6 / 49;

// Funcția de eroare (erf) – aproximare Abramowitz & Stegun 7.1.26
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

// CDF a distribuției normale standard
function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// Funcția de distribuție acumulată (CDF) a lui chi-pătrat cu k grade
// de libertate, prin aproximarea Wilson-Hilferty (stabilă numeric):
//   (χ²/k)^(1/3) ≈ Normal( mean = 1 - 2/(9k), var = 2/(9k) )
function chiSquareCdf(x, k) {
  if (x <= 0) return 0;
  const m = x / k;
  const z =
    (Math.cbrt(m) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k));
  return normalCdf(z);
}

// Valoarevan der Corput (Halton de bază 2) pentru un indice
function vanDerCorput(index, base) {
  let result = 0;
  let f = 1 / base;
  let n = index;
  while (n > 0) {
    result += f * (n % base);
    n = Math.floor(n / base);
    f /= base;
  }
  return result; // în [0,1)
}

// Secvență Halton pentru o bază dată
function halton(index, base) {
  return vanDerCorput(index, base);
}

/* ============================================================
   1) ANALIZA DECALAJELOR (GAP) - model Poisson / geometric
   ------------------------------------------------------------
   Pentru fiecare număr calculăm câte extrageri au trecut de la
   ultima sa apariție (decalajul curent). Sub ipoteza independenței,
   timpul de așteptare până la următoarea apariție urmează o lege
   geometrică cu parametrul p = 6/49.
   - gapAșteptat  = (1-p)/p   (medie geometrică)
   - deviațieStd  = (1-p)/p   (geometrică are mean = std)
   - scorZ        = (decalaj - medie) / std
   - probMaiMult  = (1-p)^decalaj  -> șansa ca numărul să NU apară
                   în următoarele „decalaj” extrageri (scade dacă e
                   de mult absent -> senzația de „scadență”)
   Notă: senzația de „scadență” este un efect psihologic; în realitate
   probabilitatea de apariție la următoarea extragere rămâne p.
   ============================================================ */
function gapAnalysis(draws) {
  if (draws.length === 0) return null;
  const total = draws.length;
  const lastSeen = new Array(50).fill(-1);
  for (let t = 0; t < total; t++) {
    for (const n of draws[t]) lastSeen[n] = t;
  }

  const expected = (1 - LOTO_P) / LOTO_P;
  const list = [];
  for (let n = 1; n <= 49; n++) {
    const gap = lastSeen[n] === -1 ? total : total - 1 - lastSeen[n];
    const z = (gap - expected) / expected;
    const probMaiMult = Math.pow(1 - LOTO_P, gap); // P(decalaj >= gap)
    const probUrgență = 1 - probMaiMult; // cât de „scadent” pare
    list.push({
      n,
      gap,
      expected: expected,
      z: z,
      probMaiMult: probMaiMult,
      probUrgență: probUrgență,
      esteScadent: gap > expected + expected, // peste ~2 deviații
    });
  }
  const due = [...list].filter((x) => x.esteScadent).map((x) => x.n).sort((a, b) => b.z - a.z);
  const sorted = [...list].sort((a, b) => b.z - a.z);
  return {
    total,
    expected,
    list,
    scadente: due,
    topScadente: sorted.slice(0, 6),
    note: "Probabilitatea de apariție la următoarea extragere rămâne constantă (p = 6/49); „scadența” este doar o percepție.",
  };
}

/* ============================================================
   2) ANALIZA CO-APARIȚIEI (perechi / triple)
   ------------------------------------------------------------
   Numără de câte ori două (sau trei) numere apar împreună în aceeași
   extragere. Diferit de lanțurile Markov (care țin cont de ordine),
   aici vedem asocieri pure de numere. Utile pentru a construi
   combinații care „se pupă” des în istoric.
   ============================================================ */
function cooccurrenceAnalysis(draws, topN = 8) {
  if (draws.length === 0) return null;

  const pairCount = {};
  const tripleCount = {};
  for (const d of draws) {
    const arr = d.slice().sort((a, b) => a - b);
    // perechi
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = `${arr[i]}-${arr[j]}`;
        pairCount[key] = (pairCount[key] || 0) + 1;
      }
    }
    // triple
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        for (let k = j + 1; k < arr.length; k++) {
          const key = `${arr[i]}-${arr[j]}-${arr[k]}`;
          tripleCount[key] = (tripleCount[key] || 0) + 1;
        }
      }
    }
  }

  const pairs = Object.entries(pairCount)
    .map(([k, v]) => ({ nums: k.split("-").map(Number), count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  const triples = Object.entries(tripleCount)
    .map(([k, v]) => ({ nums: k.split("-").map(Number), count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return { pairs, triples, total: draws.length };
}

/* ============================================================
   3) SEMNIFICAȚIA STATISTICĂ (Bootstrap)
   ------------------------------------------------------------
   Pentru fiecare număr comparăm frecvența observată cu frecvența
   așteptată (total * p). Folosim bootstrap: re-eșantionăm istoricul
   cu înlocuire de multe ori și construim distribuția frecvenței.
   p-value (bilateral) = fracțiunea de eșantioane bootstrap în care
   |frecvența| este cel puțin la fel de extremă ca cea observată.
   Numerele cu p-value mic sunt „semnificativ” calde/reci — însă,
   cum testăm 49 numere, aplicăm o corecție simplă de multiplu test
   (Bonferroni): pragul devine 0.05/49.
   ============================================================ */
function bootstrapSignificance(draws, opts = {}) {
  if (draws.length < 10) return null;
  const sims = opts.sims || 2000;
  const N = draws.length;
  const expectedFreq = N * LOTO_P;

  // frecvențe observate
  const obs = new Array(50).fill(0);
  for (const d of draws) for (const n of d) obs[n]++;

  // bootstrap: pentru fiecare simulare alegem N extrageri cu înlocuire
  // și numărăm aparițiile fiecărui număr
  const bootFreq = Array.from({ length: 50 }, () => new Float64Array(sims));
  for (let s = 0; s < sims; s++) {
    // alegem N indici cu înlocuire
    const counts = new Array(50).fill(0);
    for (let i = 0; i < N; i++) {
      const idx = Math.floor(Math.random() * N);
      for (const n of draws[idx]) counts[n]++;
    }
    for (let n = 1; n <= 49; n++) bootFreq[n][s] = counts[n];
  }

  const results = [];
  for (let n = 1; n <= 49; n++) {
    const o = obs[n];
    let extreme = 0;
    const arr = bootFreq[n];
    for (let s = 0; s < sims; s++) {
      if (Math.abs(arr[s] - expectedFreq) >= Math.abs(o - expectedFreq)) extreme++;
    }
    const pValue = extreme / sims;
    results.push({
      n,
      observed: o,
      expected: expectedFreq,
      ratio: o / expectedFreq,
      pValue: pValue,
      semnificativ: pValue < 0.05 / 49, // corecție Bonferroni
    });
  }
  results.sort((a, b) => a.pValue - b.pValue);
  return {
    sims,
    expectedFreq,
    pragBonferroni: 0.05 / 49,
    results,
    semnificative: results.filter((r) => r.semnificativ),
    note: "Chiar dacă apar numere „semnificative”, cu 49 teste este foarte probabil să avem fals-pozitive prin simplul zgomot.",
  };
}

/* ============================================================
   4) ANALIZA ENTROPIEI / TEST CHI-PĂTRAT
   ------------------------------------------------------------
   Verifică dacă distribuția numerelor extrase este compatibilă cu
   o sursă uniformă aleatoare.
   - chi-pătrat de uniformitate: pentru fiecare număr comparăm
     numărul de apariții cu media așteptată (totalAparitii/49).
   - p-value mare (> 0.05) => nu avem dovezi că distribuția se abate
     de la uniformitate (deci extragerile par aleatorii).
   ============================================================ */
function entropyAnalysis(draws) {
  if (draws.length === 0) return null;
  const freq = new Array(50).fill(0);
  let totalApp = 0;
  for (const d of draws) {
    for (const n of d) {
      freq[n]++;
      totalApp++;
    }
  }
  const expected = totalApp / 49;
  let chi = 0;
  const deviatii = [];
  for (let n = 1; n <= 49; n++) {
    const d = freq[n] - expected;
    chi += (d * d) / expected;
    deviatii.push({ n, count: freq[n], diff: d });
  }
  const df = 48;
  const pValue = 1 - chiSquareCdf(chi, df);

  // entropie Shannon normalizată a distribuției (1 = perfect uniform)
  let h = 0;
  for (let n = 1; n <= 49; n++) {
    if (freq[n] > 0) {
      const p = freq[n] / totalApp;
      h += -p * Math.log2(p);
    }
  }
  const entropieMax = Math.log2(49);
  const entropieNorm = h / entropieMax;

  const verdict =
    pValue > 0.05
      ? "Distribuția este compatibilă cu o sursă uniformă aleatoare."
      : "Distribuția prezintă abateri de la uniformitate (posibil zgomot la eșantioane mici).";

  return {
    chiPatrat: chi,
    gradeLibertate: df,
    pValue,
    entropie: h,
    entropieNorm,
    verdict,
    deviatii: deviatii.sort((a, b) => b.diff - a.diff),
    note: "Un p-value mare nu demonstrează că e „trucata” în favoarea cuiva, doar că nu vedem un model clar.",
  };
}

/* ============================================================
   5) PROBABILITĂȚI BAYESIANE (Beta-Binomial)
   ------------------------------------------------------------
   Modelăm apariția numărului i într-o extragere ca o variabilă
   Bernoulli de parametru θ_i. Prior neinformativ Beta(1,1) (uniform).
   După ce observăm count_i apariții în N extrageri, probabilitatea
   posterioară medie este:
        θ_i = (count_i + 1) / (N + 2)
   Aceasta „netezește” frecvențele brute (evită 0 = imposibil) și
   converge spre 6/49 pe măsură ce istoricul crește.
   ============================================================ */
function bayesianProbabilities(draws) {
  if (draws.length === 0) return null;
  const N = draws.length;
  const count = new Array(50).fill(0);
  for (const d of draws) for (const n of d) count[n]++;

  const list = [];
  for (let n = 1; n <= 49; n++) {
    const theta = (count[n] + 1) / (N + 2);
    list.push({ n, count: count[n], probabilitate: theta });
  }
  list.sort((a, b) => b.probabilitate - a.probabilitate);
  return {
    N,
    aPriori: 1,
    list,
    top: list.slice(0, 6),
    asteptat: LOTO_P,
    note: "Probabilitățile posterioare sunt aproape toate foarte apropiate de 6/49; diferențele sunt zgomot statistic.",
  };
}

/* ============================================================
   6) GENERARE CU DISCREPANȚĂ MICĂ (Sobol / Halton)
   ------------------------------------------------------------
   În loc de aleator pur, folosim secvențe Halton (baze prime diferite)
   pentru a alege numerele astfel încât biletele rezultate să fie
   bine răspândite în spațiul 1..49 (discrepanță mică), evitând
   clusterele care apar la întâmplare. Fiecare bilet folosește 6
   baze prime diferite; numerele sunt garantat distincte.
   ============================================================ */
function lowDiscrepancyGenerate(count, opts = {}) {
  const bases = opts.bases || [2, 3, 5, 7, 11, 13];
  const start = opts.start || 1;
  const tickets = [];
  for (let t = 0; t < count; t++) {
    const chosen = new Set();
    for (let d = 0; d < 6; d++) {
      // valoare Halton în [0,1) pentru acest bilet și această dimensiune
      const v = halton(t * 6 + d + start, bases[d % bases.length]);
      let slot = Math.floor(v * 49); // 0..48
      while (chosen.has(slot)) slot = (slot + 1) % 49;
      chosen.add(slot);
    }
    tickets.push([...chosen].map((s) => s + 1).sort((a, b) => a - b));
  }
  return {
    tickets,
    metoda: "Secvențe Halton (discrepanță mică)",
    note: "Biletele sunt răspândite uniform în spațiul numerelor; asta nu crește șansa de câștig, doar diversifică acoperirea.",
  };
}

/* ============================================================
   7) ALGORITM GENETIC PENTRU BILETE ECHILIBRATE
   ------------------------------------------------------------
   Evoluează o populație de bilete spre un „fitness” mare, unde
   fitness-ul recompensează:
     - sumă tipică (apropiată de media istorică, conform curbei normale)
     - raport par/impar frecvent în istoric
     - numere cu probabilitate Bayesiană mare
   și penalizează duplicatele. La final returnează cele mai bune
   bilete găsite. (Divertisment; nu crește șansa reală.)
   ============================================================ */
function geneticGenerate(draws, opts = {}) {
  const count = opts.count || 5;
  const popSize = opts.popSize || 80;
  const generations = opts.generations || 120;
  const hasHistory = Array.isArray(draws) && draws.length >= 5;

  // context istoric (dacă există) – folosim funcțiile din analysis.js
  const sumAnalysisFn =
    typeof sumAnalysis !== "undefined"
      ? sumAnalysis
      : (typeof globalThis !== "undefined" && globalThis.sumAnalysis) || null;
  const parityFn =
    typeof parityPrimeAnalysis !== "undefined"
      ? parityPrimeAnalysis
      : (typeof globalThis !== "undefined" && globalThis.parityPrimeAnalysis) || null;

  // context istoric (dacă există)
  let mean = 150,
    std = 40,
    targetOE = "3-3",
    bayes = null;
  if (hasHistory && sumAnalysisFn && parityFn) {
    const sum = sumAnalysisFn(draws);
    const pp = parityFn(draws);
    mean = sum.mean;
    std = sum.std;
    targetOE = pp.mostCommonOE ? pp.mostCommonOE.key : "3-3";
    bayes = bayesianProbabilities(draws);
  }
  const bayesMap = new Map();
  if (bayes) for (const b of bayes.list) bayesMap.set(b.n, b.probabilitate);

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }
  function randomTicket() {
    const s = new Set();
    while (s.size < 6) s.add(1 + randInt(49));
    return [...s].sort((a, b) => a - b);
  }
  function fitness(t) {
    const s = t.reduce((a, b) => a + b, 0);
    const z = std === 0 ? 0 : (s - mean) / std;
    const fitSum = Math.exp(-0.5 * z * z); // 1 lângă medie
    let odd = 0;
    for (const n of t) if (n % 2) odd++;
    const oeKey = `${odd}-${6 - odd}`;
    const fitOE = oeKey === targetOE ? 1 : 0.5;
    let bayesBonus = 0;
    if (bayesMap.size) {
      let sumP = 0;
      for (const n of t) sumP += bayesMap.get(n) || LOTO_P;
      bayesBonus = sumP / 6 / LOTO_P; // normalizat la ~1
    }
    return fitSum * 0.4 + fitOE * 0.3 + Math.min(bayesBonus, 1.5) * 0.3;
  }
  function crossover(a, b) {
    const set = new Set();
    // luăm câteva din primul părinte, restul completăm din al doilea
    const take = 2 + randInt(3);
    for (let i = 0; i < take && i < a.length; i++) set.add(a[i]);
    for (const n of b) {
      if (set.size >= 6) break;
      set.add(n);
    }
    while (set.size < 6) set.add(1 + randInt(49));
    return [...set].sort((x, y) => x - y);
  }
  function mutate(t) {
    const arr = t.slice();
    const pos = randInt(6);
    let nv = 1 + randInt(49);
    let guard = 0;
    while (arr.includes(nv) && guard < 50) {
      nv = 1 + randInt(49);
      guard++;
    }
    if (!arr.includes(nv)) arr[pos] = nv;
    return [...new Set(arr)].sort((a, b) => a - b);
  }

  // populația inițială
  let pop = [];
  for (let i = 0; i < popSize; i++) pop.push(randomTicket());
  let best = null,
    bestFit = -Infinity;

  for (let gen = 0; gen < generations; gen++) {
    // evaluare
    const scored = pop.map((t) => ({ t, f: fitness(t) }));
    scored.sort((a, b) => b.f - a.f);
    if (scored[0].f > bestFit) {
      bestFit = scored[0].f;
      best = scored[0].t;
    }
    // selecție prin turneu + elitism
    const next = [];
    const elite = Math.max(1, Math.floor(popSize * 0.1));
    for (let i = 0; i < elite; i++) next.push(scored[i].t);
    while (next.length < popSize) {
      const tournament = () => {
        const a = scored[randInt(scored.length)];
        const b = scored[randInt(scored.length)];
        return a.f >= b.f ? a.t : b.t;
      };
      const child = mutate(crossover(tournament(), tournament()));
      next.push(child);
    }
    pop = next;
  }

  // selectăm `count` bilete distincte cu fitness mare
  const all = pop
    .map((t) => ({ t, f: fitness(t) }))
    .sort((a, b) => b.f - a.f);
  const seen = new Set();
  const tickets = [];
  for (const item of all) {
    const key = item.t.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    tickets.push(item.t);
    if (tickets.length >= count) break;
  }
  // completăm dacă nu ajungem la `count`
  while (tickets.length < count) {
    const t = randomTicket();
    const key = t.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      tickets.push(t);
    }
  }

  return {
    tickets,
    metoda: "Algoritm genetic (fitness: sumă + paritate + Bayesian)",
    fitness: bestFit,
    note: "Biletele rezultate sunt „echilibrate” statistic; asta nu crește șansa reală de câștig.",
  };
}

/* ============================================================
   8) ESTIMARE MONTE CARLO A ȘANSELOR UNUI SISTEM
   ------------------------------------------------------------
   Primim o listă de bilete (fiecare cu 6 numere). Simulăm multe
   extrageri câștigătoare aleatorii și, pentru fiecare bilet,
   numărăm câte numere au fost nimerite. Returnează:
     - hist[meci]    = câte simulări au dat exact `meci` nr. nimerite
     - prob[meci]    = P(meci numere nimerite) per bilet
     - overall       = probabilități agregate peste tot sistemul
     - așteptate     = numărul mediu de categorii câștigate per extragere
   ============================================================ */
function monteCarloHitRate(tickets, opts = {}) {
  const sims = opts.sims || 20000;
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return { error: "Nu ați furnizat bilete pentru evaluare." };
  }
  // pregătim seturi pentru fiecare bilet
  const sets = tickets.map((t) => new Set(t));
  const hist = sets.map(() => new Array(7).fill(0)); // 0..6 meciuri

  for (let s = 0; s < sims; s++) {
    // extragere câștigătoare aleatorie (6 din 49, fără înlocuire)
    const pool = Array.from({ length: 49 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const winning = new Set(pool.slice(0, 6));
    for (let k = 0; k < sets.length; k++) {
      let hits = 0;
      for (const n of winning) if (sets[k].has(n)) hits++;
      hist[k][hits]++;
    }
  }

  const perTicket = sets.map((_, k) => {
    const h = hist[k];
    const prob = h.map((c) => c / sims);
    return {
      bilet: tickets[k],
      probabilități: prob, // index = nr. nimerite (0..6)
      pCelPutin3: prob[3] + prob[4] + prob[5] + prob[6],
      pCelPutin4: prob[4] + prob[5] + prob[6],
    };
  });

  // agregat: la o extragere, ce șansă are SISTEMUL să nimerească >=k?
  // (cel puțin un bilet cu >=k numere)
  // Aproximare: P(sistem >=k) ≈ 1 - ∏(1 - P(bilet_k >= k))
  const overallProb = new Array(7).fill(0);
  for (let k = 3; k <= 6; k++) {
    let prod = 1;
    for (const t of perTicket) {
      let pk = 0;
      for (let m = k; m <= 6; m++) pk += t.probabilități[m];
      prod *= 1 - pk;
    }
    overallProb[k] = 1 - prod;
  }

  // număr mediu de bilete care nimeresc >=3 per extragere
  let sumAșteptate = 0;
  for (const t of perTicket) sumAșteptate += t.pCelPutin3;
  const așteptatePerExtragere = sumAșteptate; // = sumă de probabilități

  return {
    sims,
    numBilete: tickets.length,
    perTicket,
    overallProb, // index 3..6 (P(sistem >= k))
    așteptatePerExtragere,
    note: "Estimarea folosește extrageri complet aleatorii; șansele reale sunt exact cele din tab-ul Șanse, însă aici vezi efectul numărului de bilete jucate.",
  };
}

/* ---------- Export pentru Node (teste) ---------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    gapAnalysis,
    cooccurrenceAnalysis,
    bootstrapSignificance,
    entropyAnalysis,
    bayesianProbabilities,
    lowDiscrepancyGenerate,
    geneticGenerate,
    monteCarloHitRate,
    halton,
    chiSquareCdf,
  };
}
