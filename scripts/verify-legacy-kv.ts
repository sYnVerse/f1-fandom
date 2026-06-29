/**
 * Verifies legacy gp_updated key no longer blocks per-section infobox retries.
 * Run: npx tsx scripts/verify-legacy-kv.ts
 */
import {
  getGpPageSectionSyncState,
  gpPageSectionKey,
  legacyGpUpdatedKey,
} from '../src/sync-kv';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const kv = {
  async get(key: string): Promise<string | null> {
    if (key === legacyGpUpdatedKey(8)) return 'true';
    if (key === gpPageSectionKey(8, 'infobox')) return null;
    if (key === gpPageSectionKey(8, 'race_results')) return 'true';
    return null;
  },
};

async function main() {
  const state = await getGpPageSectionSyncState(kv, 8);
  assert(state.infobox === false, 'Legacy gp_updated must not mark infobox as synced');
  assert(state.race_results === true, 'Per-section race_results flag should still work');
  console.log('verify-legacy-kv: all assertions passed');
}

main();
