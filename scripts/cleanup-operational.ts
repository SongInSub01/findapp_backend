import { join } from 'node:path';

import { runSqlFile } from './run-sql-file';

async function main() {
  const cleanupPath = join(process.cwd(), 'db', 'cleanup_operational.sql');
  await runSqlFile(cleanupPath);
  console.log(JSON.stringify({ ok: true, action: 'operational-cleanup-applied' }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
