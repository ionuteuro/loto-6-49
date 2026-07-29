/* ============================================================
   MODULE DE ANALIZA STATISTICA - Loto 6/49
   ------------------------------------------------------------
   IMPORTANT: acesti algoritmi NU pot prezice numerele extrase.
   Extragerile sunt independente si aleatorii. Instrumentele de
   mai jos sunt DOAR pentru analiza statistica si scop educativ.
   Ei descriu ce s-a intamplat in trecut, nu ce va urma.
   ============================================================ */

/* ---------- Utilitare ---------- */

// Verifica daca un numar este prim
function isPrime(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// Set cu numerele prime 1..49 (pentru viteza)
const PRIMES_49 = (function () {
  const s = new Set();
  for (let n = 1; n <= 49; n++) if (isPrime(n)) s.add(n);
  return s;
})();

// Media si abaterea standard a unui array
function meanStd(values) {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance =
    values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

// Densitatea distributiei normale N(mean, std) in punctul x
function normalPdf(x, mean, std) {
  if (std === 0) return x === mean ? 1 : 0;
  const z = (x - mean) / std;
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
}

/* ============================================================
   1) FRECVENTA NUMERELOR (baza pentru "calde/reci")
   ============================================================ */
function frequencyAnalysis(draws) {
  const freq = new Array(50).fill(0); // index 1..49
  for (const d of draws) for (const n of d) freq[n]++;
  const list = [];
  for (let n = 1; n <= 49; n++) list.push({ n, count: freq[n] });
  const hot = [...list].sort((a, b) => b.count - a.count).slice(0, 6);
  const cold = [...list].sort((a, b) => a.count - b.count).slice(0, 6);
  return { freq, list, hot, cold };
}

/* ============================================================
   2) LANTURI MARKOV (Markov Chains)
   ------------------------------------------------------------
   Construieste o matrice de tranzitie: cat de des numarul j
   apare in extragerea URMATOARE dupa ce numarul i a aparut.
   Apoi, pornind de la ultima extragere, scoreaza candidatii
   dupa probabilitatea de tranzitie agregata.
   ============================================================ */
function markovAnalysis(draws) {
  if (draws.length < 2) return null;
  // matrice 50x50 (folosim 1..49)
  const trans = Array.from({ length: 50 }, () => new Array(50).fill(0));
  const rowTotals = new Array(50).fill(0);

  for (let t = 0; t < draws.length - 1; t++) {
    const cur = draws[t];
    const next = draws[t + 1];
    for (const i of cur) {
      for (const j of next) {
        trans[i][j]++;
        rowTotals[i]++;
      }
    }
  }

  // scor pentru fiecare candidat j, pe baza ultimei extrageri
  const last = draws[draws.length - 1];
  const scores = new Array(50).fill(0);
  for (let j = 1; j <= 49; j++) {
    let s = 0;
    for (const i of last) {
      if (rowTotals[i] > 0) s += trans[i][j] / rowTotals[i];
    }
    scores[j] = s / last.length; // probabilitate medie de tranzitie
  }

  const ranked = [];
  for (let j = 1; j <= 49; j++) ranked.push({ n: j, score: scores[j] });
  ranked.sort((a, b) => b.score - a.score);

  return {
    last,
    top: ranked.slice(0, 6),
    ranked,
  };
}

/* ============================================================
   3) CLUSTERING K-MEANS
   ------------------------------------------------------------
   Grupeaza numerele 1..49 in K clustere pe baza a 2 trasaturi:
   frecventa aparitiei si "recenta" (cat de recent a aparut).
   Ajuta la a vedea grupuri de numere cu comportament similar.
   ============================================================ */
function kmeansAnalysis(draws, K = 3, maxIter = 50) {
  if (draws.length === 0) return null;

  // trasaturi pentru fiecare numar 1..49
  const freq = new Array(50).fill(0);
  const lastSeen = new Array(50).fill(-1); // indexul ultimei extrageri
  for (let t = 0; t < draws.length; t++) {
    for (const n of draws[t]) {
      freq[n]++;
      lastSeen[n] = t;
    }
  }
  const totalDraws = draws.length;

  // recenta = cate extrageri au trecut de la ultima aparitie (mic = recent)
  const points = [];
  for (let n = 1; n <= 49; n++) {
    const recency = lastSeen[n] === -1 ? totalDraws : totalDraws - 1 - lastSeen[n];
    points.push({ n, f: freq[n], r: recency });
  }

  // normalizare min-max pe fiecare trasatura
  const fs = points.map((p) => p.f);
  const rs = points.map((p) => p.r);
  const fMin = Math.min(...fs), fMax = Math.max(...fs);
  const rMin = Math.min(...rs), rMax = Math.max(...rs);
  const norm = (v, mn, mx) => (mx === mn ? 0.5 : (v - mn) / (mx - mn));
  for (const p of points) {
    p.fx = norm(p.f, fMin, fMax);
    p.rx = norm(p.r, rMin, rMax);
  }

  // initializare centroizi determinist (spread uniform) pentru rezultat stabil
  let centroids = [];
  for (let k = 0; k < K; k++) {
    const idx = Math.floor((k + 0.5) * (points.length / K));
    centroids.push({ fx: points[idx].fx, rx: points[idx].rx });
  }

  const dist2 = (p, c) => (p.fx - c.fx) ** 2 + (p.rx - c.rx) ** 2;

  let assign = new Array(points.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // pas de asignare
    for (let i = 0; i < points.length; i++) {
      let best = 0, bestD = Infinity;
      for (let k = 0; k < K; k++) {
        const d = dist2(points[i], centroids[k]);
        if (d < bestD) { bestD = d; best = k; }
      }
      if (assign[i] !== best) { assign[i] = best; changed = true; }
    }
    // pas de actualizare
    const sums = Array.from({ length: K }, () => ({ fx: 0, rx: 0, c: 0 }));
    for (let i = 0; i < points.length; i++) {
      const k = assign[i];
      sums[k].fx += points[i].fx;
      sums[k].rx += points[i].rx;
      sums[k].c++;
    }
    for (let k = 0; k < K; k++) {
      if (sums[k].c > 0) {
        centroids[k] = { fx: sums[k].fx / sums[k].c, rx: sums[k].rx / sums[k].c };
      }
    }
    if (!changed) break;
  }

  // grupeaza rezultatele + eticheteaza clusterele
  const clusters = Array.from({ length: K }, () => []);
  for (let i = 0; i < points.length; i++) {
    clusters[assign[i]].push(points[i]);
  }

  const result = clusters.map((members, k) => {
    const avgF = members.reduce((a, p) => a + p.f, 0) / (members.length || 1);
    const avgR = members.reduce((a, p) => a + p.r, 0) / (members.length || 1);
    // eticheta descriptiva
    let label;
    if (avgF >= (fMax + fMin) / 2) label = "Frecvente (calde)";
    else if (avgR <= (rMax + rMin) / 2) label = "Recente";
    else label = "Rare (reci)";
    return {
      label,
      avgFreq: avgF,
      avgRecency: avgR,
      numbers: members.map((m) => m.n).sort((a, b) => a - b),
    };
  });

  // ordoneaza clusterele dupa frecventa medie descrescator
  result.sort((a, b) => b.avgFreq - a.avgFreq);
  return { K, clusters: result };
}

/* ============================================================
   4) FILTRU DE SUMA (Distributia Normala)
   ------------------------------------------------------------
   Suma celor 6 numere urmeaza aproximativ o distributie normala.
   Calculam media/abaterea observata + intervalul "tipic" si
   verificam daca o combinatie propusa cade in acest interval.
   ============================================================ */
function sumAnalysis(draws) {
  if (draws.length === 0) return null;
  const sums = draws.map((d) => d.reduce((a, b) => a + b, 0));
  const { mean, std } = meanStd(sums);

  // interval central ~68% (mean +/- 1 std) si ~95% (mean +/- 2 std)
  const range68 = [Math.round(mean - std), Math.round(mean + std)];
  const range95 = [Math.round(mean - 2 * std), Math.round(mean + 2 * std)];

  // histograma pe intervale (bins de 20) pentru afisare
  const min = Math.min(...sums);
  const max = Math.max(...sums);
  const binSize = 20;
  const binStart = Math.floor(min / binSize) * binSize;
  const bins = [];
  for (let b = binStart; b <= max; b += binSize) {
    const count = sums.filter((s) => s >= b && s < b + binSize).length;
    bins.push({ from: b, to: b + binSize - 1, count });
  }

  return {
    mean,
    std,
    range68,
    range95,
    min,
    max,
    bins,
    // functie de evaluare a unei combinatii
    evaluate(combo) {
      const s = combo.reduce((a, b) => a + b, 0);
      const z = std === 0 ? 0 : (s - mean) / std;
      let verdict;
      if (Math.abs(z) <= 1) verdict = "tipica";
      else if (Math.abs(z) <= 2) verdict = "acceptabila";
      else verdict = "atipica";
      return { sum: s, z: z.toFixed(2), verdict, inRange68: s >= range68[0] && s <= range68[1] };
    },
  };
}

/* ============================================================
   5) RAPORTUL PAR/IMPAR SI NUMERE PRIME
   ------------------------------------------------------------
   Analizeaza distributia par/impar si numarul de prime in
   extragerile trecute; arata combinatiile cele mai frecvente.
   ============================================================ */
function parityPrimeAnalysis(draws) {
  if (draws.length === 0) return null;

  const oddEvenCounts = {}; // ex "3-3" (impare-pare)
  const primeCounts = {};   // cate prime per extragere
  let totalOdd = 0, totalEven = 0, totalPrime = 0, totalComposite = 0;

  for (const d of draws) {
    let odd = 0, even = 0, primes = 0;
    for (const n of d) {
      if (n % 2 === 0) even++; else odd++;
      if (PRIMES_49.has(n)) primes++;
    }
    totalOdd += odd; totalEven += even;
    totalPrime += primes; totalComposite += 6 - primes;

    const oeKey = `${odd}-${even}`;
    oddEvenCounts[oeKey] = (oddEvenCounts[oeKey] || 0) + 1;
    primeCounts[primes] = (primeCounts[primes] || 0) + 1;
  }

  const total = draws.length;
  const oeDist = Object.entries(oddEvenCounts)
    .map(([k, v]) => ({ key: k, count: v, pct: (v / total) * 100 }))
    .sort((a, b) => b.count - a.count);
  const primeDist = Object.entries(primeCounts)
    .map(([k, v]) => ({ primes: +k, count: v, pct: (v / total) * 100 }))
    .sort((a, b) => a.primes - b.primes);

  return {
    total,
    oddRatio: (totalOdd / (totalOdd + totalEven)) * 100,
    evenRatio: (totalEven / (totalOdd + totalEven)) * 100,
    avgPrimes: totalPrime / total,
    oeDist,          // cele mai frecvente tipare par/impar
    primeDist,       // distributia numarului de prime
    mostCommonOE: oeDist[0],
    // evaluare combinatie
    evaluate(combo) {
      let odd = 0, even = 0, primes = 0;
      for (const n of combo) {
        if (n % 2 === 0) even++; else odd++;
        if (PRIMES_49.has(n)) primes++;
      }
      return { odd, even, primes, oeKey: `${odd}-${even}` };
    },
  };
}

/* ============================================================
   GENERATOR "GHIDAT" - combina filtrele de mai sus
   ------------------------------------------------------------
   Genereaza variante aleatorii care RESPECTA tiparele istorice
   dominante (suma tipica + raport par/impar frecvent).
   ATENTIE: nu creste sansa reala de castig - doar produce
   combinatii "statistic tipice".
   ============================================================ */
function guidedGenerate(draws, opts = {}) {
  const useSum = opts.useSum !== false;
  const useParity = opts.useParity !== false;
  const useMarkov = opts.useMarkov === true;

  const sum = useSum ? sumAnalysis(draws) : null;
  const pp = useParity ? parityPrimeAnalysis(draws) : null;
  const markov = useMarkov ? markovAnalysis(draws) : null;

  // pool ponderat pentru Markov (numere cu scor mai mare apar mai des)
  let weightedPool = null;
  if (markov) {
    weightedPool = [];
    for (const item of markov.ranked) {
      const weight = 1 + Math.round(item.score * 100); // 1..~
      for (let w = 0; w < weight; w++) weightedPool.push(item.n);
    }
  }

  function pickCombo() {
    if (weightedPool && weightedPool.length >= 6) {
      const set = new Set();
      let guard = 0;
      while (set.size < 6 && guard < 1000) {
        guard++;
        set.add(weightedPool[Math.floor(Math.random() * weightedPool.length)]);
      }
      // completeaza daca a ramas incomplet
      while (set.size < 6) set.add(1 + Math.floor(Math.random() * 49));
      return [...set].sort((a, b) => a - b);
    }
    // altfel aleator uniform
    const pool = Array.from({ length: 49 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 6).sort((a, b) => a - b);
  }

  // incearca sa gaseasca o combinatie care respecta filtrele
  const targetOE = pp && pp.mostCommonOE ? pp.mostCommonOE.key : null;
  for (let attempt = 0; attempt < 2000; attempt++) {
    const combo = pickCombo();
    if (sum) {
      const s = combo.reduce((a, b) => a + b, 0);
      if (s < sum.range68[0] || s > sum.range68[1]) continue;
    }
    if (pp && targetOE) {
      let odd = 0, even = 0;
      for (const n of combo) (n % 2 === 0 ? even++ : odd++);
      if (`${odd}-${even}` !== targetOE) continue;
    }
    return combo;
  }
  // daca nu gaseste, returneaza ultima incercare relaxata
  return pickCombo();
}

/* ============================================================
   "MA SIMT NOROCOS" - combinatie de algoritmi
   ------------------------------------------------------------
   Combina intr-o singura variant:
     - ChaCha20 (sursa aleatoare criptografica, daca e disponibila)
     - Filtru de suma (interval tipic ~68%)
     - Raport par/impar frecvent
     - Ponderare Markov (daca exista istoric)
   Returneaza o combinatie + o lista de "motive" (ce filtre au fost aplicate).
   ATENTIE: pur divertisment, NU creste sansa reala de castig.
   ============================================================ */
function luckyGenerate(draws, rng) {
  // sursa de aleatorism: ChaCha20 daca e dat, altfel Math.random
  const randFloat = () => (rng && rng.nextInt ? rng.nextInt(1e9) / 1e9 : Math.random());
  const randInt = (max) => (rng && rng.nextInt ? rng.nextInt(max) : Math.floor(Math.random() * max));

  const hasHistory = Array.isArray(draws) && draws.length >= 5;
  const reasons = [];
  reasons.push(rng ? "Surs\u0103 ChaCha20 (criptografic\u0103)" : "Surs\u0103 aleatoare de sistem");

  let sum = null, pp = null, markov = null;
  if (hasHistory) {
    sum = sumAnalysis(draws);
    pp = parityPrimeAnalysis(draws);
    markov = markovAnalysis(draws);
  }

  // pool ponderat Markov (numere cu scor bun apar mai des)
  let weightedPool = null;
  if (markov) {
    weightedPool = [];
    for (const item of markov.ranked) {
      const weight = 1 + Math.round(item.score * 120);
      for (let w = 0; w < weight; w++) weightedPool.push(item.n);
    }
    reasons.push("Ponderare Markov din istoric");
  }

  function pickCombo() {
    if (weightedPool && weightedPool.length >= 6) {
      const set = new Set();
      let guard = 0;
      while (set.size < 6 && guard < 2000) {
        guard++;
        set.add(weightedPool[randInt(weightedPool.length)]);
      }
      while (set.size < 6) set.add(1 + randInt(49));
      return [...set].sort((a, b) => a - b);
    }
    // Fisher-Yates cu sursa aleasa
    const pool = Array.from({ length: 49 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 6).sort((a, b) => a - b);
  }

  const targetOE = pp && pp.mostCommonOE ? pp.mostCommonOE.key : null;
  if (sum) reasons.push(`Sum\u0103 \u00een intervalul tipic ${sum.range68[0]}\u2013${sum.range68[1]}`);
  if (targetOE) reasons.push(`Raport par/impar frecvent (${targetOE})`);

  let combo = null;
  for (let attempt = 0; attempt < 3000; attempt++) {
    const c = pickCombo();
    if (sum) {
      const s = c.reduce((a, b) => a + b, 0);
      if (s < sum.range68[0] || s > sum.range68[1]) continue;
    }
    if (targetOE) {
      let odd = 0, even = 0;
      for (const n of c) (n % 2 === 0 ? even++ : odd++);
      if (`${odd}-${even}` !== targetOE) continue;
    }
    combo = c;
    break;
  }
  if (!combo) combo = pickCombo(); // relaxat daca nu s-a gasit

  const s = combo.reduce((a, b) => a + b, 0);
  let odd = 0, primes = 0;
  for (const n of combo) {
    if (n % 2) odd++;
    if (PRIMES_49.has(n)) primes++;
  }

  return {
    combo,
    reasons,
    stats: { sum: s, odd, even: 6 - odd, primes },
    usedHistory: hasHistory,
  };
}

/* ============================================================
   BACKTRACKING - generare combinatii cu constrangeri
   ------------------------------------------------------------
   Construieste o combinatie 6/49 numar cu numar, verificand la
   fiecare pas daca poate INCA respecta toate constrangerile
   (poda / pruning). Daca ajunge in fundatura, se intoarce si
   incearca alt numar. Garanteaza gasirea unei solutii valide
   daca exista, sau confirma ca nu exista.

   constraints = {
     sumMin, sumMax,          // interval suma
     evenCount,               // nr exact de numere pare (0..6) sau null
     primeCount,              // nr exact de numere prime (0..6) sau null
     include: [numere],       // numere obligatorii
     exclude: [numere],       // numere interzise
   }
   Optiuni: { limit } = cate solutii sa returneze (default 1),
            shuffle = ordinea de incercare aleatorie (rng optional)
   ============================================================ */
function backtrackGenerate(constraints = {}, options = {}) {
  const {
    sumMin = 6,
    sumMax = 279,          // 44+45+46+47+48+49
    evenCount = null,      // null = fara constrangere
    primeCount = null,
    include = [],
    exclude = [],
  } = constraints;

  const limit = options.limit || 1;
  const rng = options.rng || null;
  const randInt = (max) => (rng && rng.nextInt ? rng.nextInt(max) : Math.floor(Math.random() * max));

  // validare rapida a datelor de intrare
  const includeSet = new Set(include.filter((n) => n >= 1 && n <= 49));
  const excludeSet = new Set(exclude.filter((n) => n >= 1 && n <= 49));
  // conflict: acelasi numar inclus si exclus
  for (const n of includeSet) if (excludeSet.has(n)) {
    return { solutions: [], reason: `Num&#259;rul ${n} este &#537;i inclus &#537;i exclus.`, valid: false };
  }
  if (includeSet.size > 6) {
    return { solutions: [], reason: "Prea multe numere obligatorii (maxim 6).", valid: false };
  }

  // candidatii disponibili (1..49 minus exclusi), eventual amestecati
  let candidates = [];
  for (let n = 1; n <= 49; n++) if (!excludeSet.has(n)) candidates.push(n);
  if (options.shuffle) {
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
  }

  const solutions = [];
  const chosen = [];
  let steps = 0;
  const MAX_STEPS = 2000000; // plafon de siguranta

  // helper: e prim?
  const prime = (n) => PRIMES_49.has(n);

  // backtracking recursiv
  // startIdx = de unde continuam in `candidates` (pastram ordinea crescatoare a indicilor
  //            pentru a evita duplicate/permutari)
  function solve(startIdx, sum, evens, primes) {
    if (solutions.length >= limit) return;
    if (steps++ > MAX_STEPS) return;

    if (chosen.length === 6) {
      // verificare finala a constrangerilor exacte
      if (sum < sumMin || sum > sumMax) return;
      if (evenCount !== null && evens !== evenCount) return;
      if (primeCount !== null && primes !== primeCount) return;
      // toate numerele obligatorii prezente?
      for (const n of includeSet) if (!chosen.includes(n)) return;
      solutions.push(chosen.slice());
      return;
    }

    const remainingSlots = 6 - chosen.length;

    for (let i = startIdx; i < candidates.length; i++) {
      const n = candidates[i];

      // --- PODARE (pruning): renunta devreme daca nu mai e posibil ---

      // 1. daca mai raman prea putine numere ca sa completam 6
      if (candidates.length - i < remainingSlots) break;

      const newSum = sum + n;
      const newEvens = evens + (n % 2 === 0 ? 1 : 0);
      const newPrimes = primes + (prime(n) ? 1 : 0);
      const newLen = chosen.length + 1;
      const slotsAfter = 6 - newLen;

      // 2. suma: chiar daca adaugam cele mai mici/mari numere ramase, se poate atinge intervalul?
      //    suma minima posibila daca alegem cele mai mici slotsAfter numere dupa i
      let minAdd = 0, maxAdd = 0;
      for (let k = 0; k < slotsAfter; k++) minAdd += (i + 1 + k) <= 48 ? candidates[Math.min(i + 1 + k, candidates.length - 1)] : 0;
      // aproximare simpla: min = urmatoarele slotsAfter numere; max = ultimele slotsAfter
      minAdd = 0; maxAdd = 0;
      for (let k = 0; k < slotsAfter; k++) {
        if (i + 1 + k < candidates.length) minAdd += candidates[i + 1 + k];
        if (candidates.length - 1 - k > i) maxAdd += candidates[candidates.length - 1 - k];
      }
      if (newSum + maxAdd < sumMin) continue; // prea mic chiar cu maxim
      if (newSum + minAdd > sumMax) break;     // prea mare chiar cu minim (si urmatoarele-s mai mari)

      // 3. numar de pare: nu depasi tinta si asigura-te ca mai e realizabil
      if (evenCount !== null) {
        if (newEvens > evenCount) { /* prea multe pare */ }
        // pare inca necesare vs. sloturi ramase
        const evensNeeded = evenCount - newEvens;
        if (evensNeeded < 0) continue;
        if (evensNeeded > slotsAfter) continue;
      }

      // 4. numar de prime: analog
      if (primeCount !== null) {
        const primesNeeded = primeCount - newPrimes;
        if (primesNeeded < 0) continue;
        if (primesNeeded > slotsAfter) continue;
      }

      // alege n si continua
      chosen.push(n);
      solve(i + 1, newSum, newEvens, newPrimes);
      chosen.pop();

      if (solutions.length >= limit) return;
    }
  }

  // Pentru a garanta ca numerele obligatorii apar, le fortam intai:
  // le adaugam in `chosen` si pornim backtracking doar pe restul.
  // Simplu: sortam candidatii asa incat includerea sa fie testata natural.
  // Implementare: pre-plasam numerele obligatorii.
  const forced = [...includeSet].sort((a, b) => a - b);
  if (forced.length > 0) {
    let fSum = 0, fEven = 0, fPrime = 0;
    for (const n of forced) {
      chosen.push(n);
      fSum += n;
      if (n % 2 === 0) fEven++;
      if (prime(n)) fPrime++;
    }
    // candidatii ramasi = cei care nu-s obligatorii (pastram ordinea)
    const remaining = candidates.filter((n) => !includeSet.has(n));
    // rescriem solve sa lucreze pe `remaining`
    const solveRest = (startIdx, sum, evens, primes) => {
      if (solutions.length >= limit) return;
      if (steps++ > MAX_STEPS) return;
      if (chosen.length === 6) {
        if (sum < sumMin || sum > sumMax) return;
        if (evenCount !== null && evens !== evenCount) return;
        if (primeCount !== null && primes !== primeCount) return;
        solutions.push(chosen.slice().sort((a, b) => a - b));
        return;
      }
      const slotsAfter0 = 6 - chosen.length;
      for (let i = startIdx; i < remaining.length; i++) {
        if (remaining.length - i < slotsAfter0) break;
        const n = remaining[i];
        const newSum = sum + n;
        const newEvens = evens + (n % 2 === 0 ? 1 : 0);
        const newPrimes = primes + (prime(n) ? 1 : 0);
        const slotsAfter = 6 - (chosen.length + 1);
        // podare suma
        let minAdd = 0, maxAdd = 0;
        for (let k = 0; k < slotsAfter; k++) {
          if (i + 1 + k < remaining.length) minAdd += remaining[i + 1 + k];
          if (remaining.length - 1 - k > i) maxAdd += remaining[remaining.length - 1 - k];
        }
        if (newSum + maxAdd < sumMin) continue;
        if (newSum + minAdd > sumMax) break;
        if (evenCount !== null) {
          const need = evenCount - newEvens;
          if (need < 0 || need > slotsAfter) continue;
        }
        if (primeCount !== null) {
          const need = primeCount - newPrimes;
          if (need < 0 || need > slotsAfter) continue;
        }
        chosen.push(n);
        solveRest(i + 1, newSum, newEvens, newPrimes);
        chosen.pop();
        if (solutions.length >= limit) return;
      }
    };
    solveRest(0, fSum, fEven, fPrime);
  } else {
    solve(0, 0, 0, 0);
  }

  return {
    solutions: solutions.map((s) => s.slice().sort((a, b) => a - b)),
    valid: solutions.length > 0,
    steps,
    reason: solutions.length > 0
      ? null
      : "Nu exist&#259; nicio combina&#539;ie care s&#259; respecte toate constr&#226;ngerile.",
  };
}

/* ---------- Export pentru Node (teste) ---------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isPrime, frequencyAnalysis, markovAnalysis, kmeansAnalysis,
    sumAnalysis, parityPrimeAnalysis, guidedGenerate, luckyGenerate,
    backtrackGenerate,
  };
}
