/*
 * SCHEME REDUSE (SISTEME REDUSE) LOTO 6/49
 * ----------------------------------------
 * Un sistem redus permite jucarea a N numere alese (mai mari decat 6)
 * pe un numar redus de bilete de cate 6 numere, oferind o GARANTIE:
 *
 *   "garantie K din M"  =>  daca M dintre numerele tale alese sunt printre
 *   cele 6 extrase, atunci CEL PUTIN un bilet va contine K dintre ele.
 *
 * Fiecare schema este definita ca un set de "blocuri". Un bloc este un
 * bilet exprimat prin INDICII (1..N) numerelor alese de utilizator.
 * Ex: pentru 7 numere alese [n1..n7], blocul [1,2,3,4,5,6] inseamna
 * biletul cu numerele n1,n2,n3,n4,n5,n6.
 *
 * TOATE schemele reduse de mai jos au fost GENERATE ca "covering designs"
 * (Cover(N,6,M,K)) si VERIFICATE prin forta bruta: pentru orice M-subset al
 * numerelor alese exista cel putin un bilet cu >= K numere din acel subset.
 * (vezi _build_covers.js / _test_schemes.js).
 */

const LOTO_SCHEMES = [
  {
    id: "full-7",
    name: "7 numere - Integral (garantie 6 din 6)",
    picks: 7,
    guarantee:
      "Daca toate cele 6 numere extrase sunt printre cele 7 alese, ai 6 din 6 garantat. Acopera si orice categorie inferioara.",
    detail: "Sistem integral: toate combinarile de 6 din 7. Numar bilete: C(7,6) = 7.",
    blocks: [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 7],
      [1, 2, 3, 4, 6, 7],
      [1, 2, 3, 5, 6, 7],
      [1, 2, 4, 5, 6, 7],
      [1, 3, 4, 5, 6, 7],
      [2, 3, 4, 5, 6, 7],
    ],
  },
  {
    id: "full-8",
    name: "8 numere - Integral (garantie 6 din 6)",
    picks: 8,
    guarantee:
      "Daca toate cele 6 numere extrase sunt printre cele 8 alese, ai 6 din 6 garantat.",
    detail: "Sistem integral: toate combinarile de 6 din 8. Numar bilete: C(8,6) = 28.",
    blocks: null,
    generate: function () {
      return combinations([1, 2, 3, 4, 5, 6, 7, 8], 6);
    },
  },
  {
    id: "red-8-4in4",
    name: "8 numere - Redus (garantie 4 din 4)",
    picks: 8,
    guarantee:
      "Daca 4 dintre cele 8 numere alese sunt extrase, ai garantat cel putin un bilet cu 4 nimerite (categoria III).",
    detail: "Sistem redus economic pe 8 bilete.",
    blocks: [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 7, 8],
      [1, 2, 5, 6, 7, 8],
      [3, 4, 5, 6, 7, 8],
      [1, 2, 3, 4, 5, 7],
      [1, 2, 3, 4, 5, 8],
      [1, 2, 3, 4, 6, 7],
      [1, 2, 3, 4, 6, 8],
    ],
  },
  {
    id: "red-9-4in4",
    name: "9 numere - Redus (garantie 4 din 4)",
    picks: 9,
    guarantee:
      "Daca 4 dintre cele 9 numere alese sunt extrase, ai garantat cel putin un bilet cu 4 nimerite (categoria III).",
    detail: "Sistem redus pe 12 bilete.",
    blocks: [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 7, 8, 9],
      [4, 5, 6, 7, 8, 9],
      [1, 2, 4, 5, 7, 8],
      [1, 3, 4, 6, 7, 9],
      [2, 3, 5, 6, 8, 9],
      [1, 2, 4, 6, 8, 9],
      [1, 3, 5, 6, 7, 8],
      [2, 3, 4, 5, 7, 9],
      [1, 2, 5, 6, 7, 9],
      [1, 3, 4, 5, 8, 9],
      [2, 3, 4, 6, 7, 8],
    ],
  },
  {
    id: "red-10-3in3",
    name: "10 numere - Redus (garantie 3 din 3)",
    picks: 10,
    guarantee:
      "Daca 3 dintre cele 10 numere alese sunt extrase, ai garantat cel putin un bilet cu 3 nimerite (categoria IV).",
    detail: "Sistem redus foarte economic pe 10 bilete.",
    blocks: [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 7, 8, 9, 10],
      [3, 4, 5, 7, 8, 9],
      [1, 3, 4, 6, 7, 10],
      [2, 5, 6, 8, 9, 10],
      [1, 3, 4, 6, 8, 9],
      [2, 3, 4, 8, 9, 10],
      [1, 2, 3, 5, 7, 10],
      [1, 5, 6, 7, 8, 9],
      [2, 4, 5, 6, 7, 10],
    ],
  },
  {
    id: "red-10-4in4",
    name: "10 numere - Redus (garantie 4 din 4)",
    picks: 10,
    guarantee:
      "Daca 4 dintre cele 10 numere alese sunt extrase, ai garantat cel putin un bilet cu 4 nimerite (categoria III).",
    detail: "Sistem redus pe 23 bilete, acoperire mai buna.",
    blocks: [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 7, 8, 9],
      [1, 4, 5, 7, 8, 10],
      [2, 4, 6, 7, 9, 10],
      [3, 5, 6, 8, 9, 10],
      [1, 2, 3, 4, 8, 10],
      [1, 2, 5, 6, 7, 8],
      [1, 2, 5, 6, 9, 10],
      [1, 3, 4, 5, 7, 9],
      [1, 3, 6, 7, 9, 10],
      [1, 4, 6, 8, 9, 10],
      [2, 3, 4, 5, 7, 10],
      [2, 3, 4, 5, 8, 9],
      [2, 3, 4, 6, 7, 8],
      [2, 5, 7, 8, 9, 10],
      [2, 3, 4, 6, 9, 10],
      [4, 5, 6, 7, 8, 9],
      [3, 5, 6, 7, 8, 10],
      [1, 2, 4, 6, 7, 9],
      [1, 3, 5, 6, 8, 9],
      [1, 2, 3, 5, 7, 10],
      [1, 2, 6, 8, 9, 10],
      [1, 4, 5, 6, 9, 10],
    ],
  },
  {
    id: "red-12-3in3",
    name: "12 numere - Redus (garantie 3 din 3)",
    picks: 12,
    guarantee:
      "Daca 3 dintre cele 12 numere alese sunt extrase, ai garantat cel putin un bilet cu 3 nimerite (categoria IV).",
    detail: "Sistem redus economic pe 15 bilete pentru 12 numere.",
    blocks: [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 7, 8, 9, 10],
      [3, 4, 7, 8, 11, 12],
      [5, 6, 9, 10, 11, 12],
      [1, 2, 3, 9, 11, 12],
      [1, 4, 5, 7, 10, 11],
      [2, 4, 6, 8, 10, 12],
      [3, 5, 6, 7, 8, 9],
      [1, 3, 6, 7, 10, 12],
      [1, 4, 5, 8, 9, 12],
      [2, 3, 5, 8, 10, 11],
      [2, 4, 6, 7, 9, 11],
      [1, 3, 6, 8, 9, 11],
      [2, 3, 5, 7, 9, 12],
      [1, 2, 3, 4, 9, 10],
    ],
  },
  {
    id: "red-12-4in4",
    name: "12 numere - Redus (garantie 4 din 4)",
    picks: 12,
    guarantee:
      "Daca 4 dintre cele 12 numere alese sunt extrase, ai garantat cel putin un bilet cu 4 nimerite (categoria III).",
    detail: "Sistem redus pe 53 bilete, acoperire larga pentru 12 numere.",
    blocks: [
      [1, 2, 3, 4, 5, 6], [1, 2, 3, 7, 8, 9], [1, 2, 3, 10, 11, 12],
      [1, 4, 5, 7, 8, 10], [1, 4, 5, 9, 11, 12], [1, 6, 7, 8, 11, 12],
      [2, 4, 6, 7, 9, 10], [2, 5, 6, 8, 9, 11], [3, 4, 6, 8, 9, 12],
      [3, 5, 6, 7, 10, 11], [1, 5, 6, 9, 10, 12], [2, 3, 4, 5, 7, 12],
      [2, 3, 4, 8, 10, 11], [7, 8, 9, 10, 11, 12], [1, 3, 4, 7, 9, 11],
      [2, 5, 6, 8, 10, 12], [1, 2, 4, 8, 9, 12], [1, 2, 5, 7, 10, 11],
      [1, 3, 5, 7, 9, 12], [1, 3, 6, 8, 9, 10], [1, 4, 6, 9, 10, 11],
      [2, 3, 4, 5, 9, 10], [2, 3, 6, 9, 11, 12], [3, 5, 7, 8, 11, 12],
      [2, 4, 6, 7, 8, 11], [3, 4, 6, 7, 10, 12], [4, 5, 6, 7, 8, 9],
      [4, 5, 6, 10, 11, 12], [1, 2, 4, 6, 7, 12], [1, 3, 4, 5, 8, 11],
      [1, 2, 6, 8, 10, 11], [2, 3, 6, 7, 8, 10], [3, 5, 8, 9, 10, 11],
      [1, 2, 5, 8, 9, 12], [1, 3, 4, 8, 10, 12], [1, 3, 6, 7, 9, 10],
      [2, 4, 5, 8, 11, 12], [1, 2, 4, 9, 10, 11], [2, 4, 7, 9, 10, 12],
      [1, 3, 5, 6, 8, 11], [2, 3, 5, 7, 9, 11], [1, 3, 5, 6, 7, 12],
      [1, 3, 5, 7, 10, 12], [2, 3, 4, 7, 8, 12], [1, 4, 6, 8, 9, 10],
      [2, 3, 4, 7, 11, 12], [2, 3, 5, 6, 7, 8], [4, 5, 7, 9, 10, 11],
      [1, 2, 3, 5, 6, 9], [1, 2, 4, 8, 9, 11], [1, 6, 7, 9, 11, 12],
      [2, 3, 8, 9, 10, 12], [1, 2, 3, 4, 6, 11],
    ],
  },
];

/* Genereaza toate combinarile de r elemente dintr-un array */
function combinations(arr, r) {
  const result = [];
  const n = arr.length;
  if (r > n) return result;
  const idx = Array.from({ length: r }, (_, i) => i);
  while (true) {
    result.push(idx.map((i) => arr[i]));
    let i = r - 1;
    while (i >= 0 && idx[i] === n - r + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
  }
  return result;
}

/* Intoarce blocurile unei scheme (generand daca e cazul) */
function getSchemeBlocks(scheme) {
  if (scheme.blocks) return scheme.blocks;
  if (typeof scheme.generate === "function") return scheme.generate();
  return [];
}
