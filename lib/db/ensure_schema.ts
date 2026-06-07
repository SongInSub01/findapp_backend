import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getDb } from '@/lib/db/pool';

declare global {
  // eslint-disable-next-line no-var
  var __findappSchemaReady: Promise<void> | undefined;
}

function shouldAutoApplySchema() {
  return process.env.FINDAPP_AUTO_APPLY_SCHEMA !== 'false';
}

// The first DB access in a process applies the idempotent schema.sql once.
export async function ensureSchemaReady() {
  if (!shouldAutoApplySchema()) {
    return;
  }

  if (!global.__findappSchemaReady) {
    global.__findappSchemaReady = (async () => {
      const schemaPath = join(process.cwd(), 'db', 'schema.sql');
      const sql = await readFile(schemaPath, 'utf8');
      await getDb().query(sql);
    })().catch((error) => {
      global.__findappSchemaReady = undefined;
      throw error;
    });
  }

  await global.__findappSchemaReady;
}
