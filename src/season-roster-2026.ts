/**
 * 2026 race-driver → constructorId roster.
 * Shared by wikitext generation and OpenF1 constructor fallbacks so the map
 * is defined in one place (avoids circular imports between f1-api and wikitext-generator).
 */
export const DRIVER_TO_CONSTRUCTOR_2026: Record<string, string> = {
  max_verstappen: 'red_bull',
  hadjar: 'red_bull',
  leclerc: 'ferrari',
  hamilton: 'ferrari',
  russell: 'mercedes',
  antonelli: 'mercedes',
  gasly: 'alpine',
  colapinto: 'alpine',
  norris: 'mclaren',
  piastri: 'mclaren',
  sainz: 'williams',
  albon: 'williams',
  lawson: 'rb',
  arvid_lindblad: 'rb',
  stroll: 'aston_martin',
  alonso: 'aston_martin',
  hulkenberg: 'sauber',
  bortoleto: 'sauber',
  ocon: 'haas',
  bearman: 'haas',
  bottas: 'cadillac',
  perez: 'cadillac',
};
