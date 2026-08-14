/* ============================================================
   ALGORITMI SUPLIMENTARI - Loto 6/49
   ------------------------------------------------------------
   1) ChaCha20  - generator pseudo-aleator criptografic (CSPRNG)
   2) Greedy    - construire sistem redus (covering design)
   3) Simulated Annealing - optimizare / reducere bilete

   IMPORTANT: acesti algoritmi NU prezic numerele castigatoare.
   ChaCha20 = sursa de aleatorism de calitate (reproductibila cu seed).
   Greedy / Annealing = construiesc si optimizeaza scheme reduse.
   ============================================================ */

/* ============================================================
   1) ChaCha20 (RFC 8439) - stream cipher folosit ca CSPRNG
   ============================================================ */

function rotl32(x, n) {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

// Un "quarter round" ChaCha pe vectorul de stare (Uint32Array)
function chachaQuarterRound(s, a, b, c, d) {
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl32(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl32(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl32(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl32(s[b] ^ s[c], 7);
}

// Genereaza un bloc de 64 bytes din key (8x u32), counter (u32), nonce (3x u32)
function chacha20Block(key, counter, nonce) {
  const CONST = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
  const state = new Uint32Array(16);
  state[0] = CONST[0]; state[1] = CONST[1]; state[2] = CONST[2]; state[3] = CONST[3];
  for (let i = 0; i < 8; i++) state[4 + i] = key[i] >>> 0;
  state[12] = counter >>> 0;
  state[13] = nonce[0] >>> 0; state[14] = nonce[1] >>> 0; state[15] = nonce[2] >>> 0;

  const working = state.slice();
  for (let i = 0; i < 10; i++) {
    // column rounds
    chachaQuarterRound(working, 0, 4, 8, 12);
    chachaQuarterRound(working, 1, 5, 9, 13);
    chachaQuarterRound(working, 2, 6, 10, 14);
    chachaQuarterRound(working, 3, 7, 11, 15);
    // diagonal rounds
    chachaQuarterRound(working, 0, 5, 10, 15);
    chachaQuarterRound(working, 1, 6, 11, 12);
    chachaQuarterRound(working, 2, 7, 8, 13);
    chachaQuarterRound(working, 3, 4, 9, 14);
  }
  const out = new Uint32Array(16);
  for (let i = 0; i < 16; i++) out[i] = (working[i] + state[i]) >>> 0;
  return out; // 16 x u32 = 64 bytes
}

/* Un generator de numere bazat pe ChaCha20 dintr-un seed (string sau număr) */
function ChaCha20RNG(seed) {
  // deriva key (8 u32) + nonce (3 u32) dintr-un seed printr-un hash simplu (FNV-1a)
  const key = new Uint32Array(8);
  const nonce = new Uint32Array(3);
  let h = 0x811c9dc5 >>> 0;
  const str = String(seed);
  const fill = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      for (let c = 0; c < str.length; c++) {
        h ^= str.charCodeAt(c);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      h ^= (i + 1) * 0x9e3779b1;
      h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
      arr[i] = h >>> 0;
    }
  };
  fill(key);
  fill(nonce);

  let counter = 0;
  let block = null;
  let idx = 16; // forteaza generarea primului bloc

  function nextU32() {
    if (idx >= 16) {
      block = chacha20Block(key, counter, nonce);
      counter = (counter + 1) >>> 0;
      idx = 0;
    }
    return block[idx++];
  }

  // întreg uniform in [0, max) fara bias (rejection sampling)
  function nextInt(max) {
    const range = 0x100000000; // 2^32
    const limit = range - (range % max);
    let x;
    do { x = nextU32(); } while (x >= limit);
    return x % max;
  }

  return {
    nextU32,
    nextInt,
    // extrage o combinatie 6/49 folosind Fisher-Yates cu ChaCha20
    drawSix() {
      const pool = Array.from({ length: 49 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = nextInt(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, 6).sort((a, b) => a - b);
    },
  };
}

/* ============================================================
   2) GREEDY - construire sistem redus (covering design)
   ------------------------------------------------------------
   Dat un set de N numere alese, construieste bilete de câte 6
   a.i. orice M-subset al numerelor sa aiba >= K numere intr-un
   bilet (garantie "K din M"). Alege lacom biletul care acopera
   cele mai multe subseturi neacoperite.
   ============================================================ */

function combIndices(n, r) {
  const res = [];
  if (r > n) return res;
  const idx = Array.from({ length: r }, (_, i) => i);
  while (true) {
    res.push(idx.slice());
    let i = r - 1;
    while (i >= 0 && idx[i] === n - r + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
  }
  return res;
}

function greedyCover(numbers, M, K) {
  const chosen = numbers.slice().sort((a, b) => a - b);
  const N = chosen.length;
  if (N < 6) return { tickets: [], targetsTotal: 0, note: "Prea putine numere (minim 6)." };

  // candidatii = toate biletele de 6 din N (ca indici 0..N-1)
  const candidateIdx = combIndices(N, 6);
  // targeturile de acoperit = toate M-subseturile (ca indici)
  const targetIdx = combIndices(N, M);

  const targetKeys = targetIdx.map((t) => t.join(","));
  const uncovered = new Set(targetKeys);
  const targetSets = targetIdx.map((t) => new Set(t));

  function coveredBy(blockIdx) {
    const bs = new Set(blockIdx);
    const out = [];
    for (let i = 0; i < targetIdx.length; i++) {
      if (!uncovered.has(targetKeys[i])) continue;
      let c = 0;
      for (const x of targetIdx[i]) if (bs.has(x)) c++;
      if (c >= K) out.push(targetKeys[i]);
    }
    return out;
  }

  const tickets = [];
  let guard = 0;
  const maxGuard = 5000;
  while (uncovered.size > 0 && guard < maxGuard) {
    guard++;
    let best = null, bestCov = [];
    for (const block of candidateIdx) {
      const cov = coveredBy(block);
      if (cov.length > bestCov.length) {
        bestCov = cov; best = block;
        if (cov.length === uncovered.size) break;
      }
    }
    if (!best || bestCov.length === 0) break;
    tickets.push(best.map((i) => chosen[i]).sort((a, b) => a - b));
    for (const k of bestCov) uncovered.delete(k);
  }

  return {
    tickets,
    targetsTotal: targetIdx.length,
    targetsRemaining: uncovered.size,
    guaranteed: uncovered.size === 0,
  };
}

/* Verifică o schema (garantie K din M) pentru un set de numere.
   `precomputedTargets` (optional) = lista de M-subseturi ca indici, pentru viteza. */
function verifyCover(tickets, numbers, M, K, precomputedTargets) {
  const chosen = numbers.slice().sort((a, b) => a - b);
  const N = chosen.length;
  const pos = new Map(chosen.map((v, i) => [v, i]));
  const ticketSets = tickets.map((t) => new Set(t.map((v) => pos.get(v))));
  const targets = precomputedTargets || combIndices(N, M);
  for (const t of targets) {
    let ok = false;
    for (const tk of ticketSets) {
      let c = 0;
      for (const x of t) if (tk.has(x)) c++;
      if (c >= K) { ok = true; break; }
    }
    if (!ok) return false;
  }
  return true;
}

/* ============================================================
   3) SIMULATED ANNEALING - optimizare bilete
   ------------------------------------------------------------
   Pornind de la o schema (lista de bilete), incearca sa reduca
   numarul de bilete pastrand garantia "K din M". La fiecare pas
   incearca sa scoata un bilet; dacă garantia se pierde, accepta
   totusi cu probabilitate scazuta (temperatura) pentru a scapa
   din optime locale, apoi repara dacă e nevoie.
   Aici il folosim ca optimizator de acoperire: cauta o sub-multime
   minima de bilete care pastreaza garantia.
   ============================================================ */

function simulatedAnnealing(initialTickets, numbers, M, K, opts = {}) {
  const rng = opts.rng || Math;
  const iterations = opts.iterations || 3000;
  let T = opts.T0 || 1.0;
  const cooling = opts.cooling || 0.997;

  const rand = () => (rng.nextInt ? rng.nextInt(1e9) / 1e9 : Math.random());

  // precalculeaza M-subseturile o singura data (viteza)
  const targets = combIndices(numbers.length, M);
  const isCovered = (tickets) => verifyCover(tickets, numbers, M, K, targets);

  // cost = număr bilete (vrem minim), penalizare mare dacă nu e acoperit
  function cost(tickets) {
    return tickets.length + (isCovered(tickets) ? 0 : 1000);
  }

  let current = initialTickets.slice();
  let currentCost = cost(current);
  let best = current.slice();
  let bestCost = currentCost;

  for (let it = 0; it < iterations && current.length > 1; it++) {
    // mutare: incearca sa scoti un bilet aleator
    const removeAt = Math.floor(rand() * current.length);
    const candidate = current.slice(0, removeAt).concat(current.slice(removeAt + 1));
    const candCost = cost(candidate);

    const delta = candCost - currentCost;
    if (delta < 0 || rand() < Math.exp(-delta / Math.max(T, 1e-6))) {
      // accepta doar dacă ramane valid (nu stricam garantia in "best")
      if (isCovered(candidate)) {
        current = candidate;
        currentCost = candCost;
        if (candidate.length < bestCost) {
          best = candidate.slice();
          bestCost = candidate.length;
        }
      }
    }
    T *= cooling;
  }

  return {
    tickets: best,
    reducedFrom: initialTickets.length,
    reducedTo: best.length,
    guaranteed: verifyCover(best, numbers, M, K),
  };
}

/* ---------- Export pentru Node (teste) ---------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    chacha20Block, ChaCha20RNG, greedyCover, verifyCover,
    simulatedAnnealing, combIndices,
  };
}
