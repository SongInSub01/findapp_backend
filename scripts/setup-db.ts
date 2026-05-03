import { join } from 'node:path';

import { runSqlFile } from './run-sql-file';

async function main() {
  const schemaPath = join(process.cwd(), 'db', 'schema.sql');
  await runSqlFile(schemaPath);
  console.log(JSON.stringify({ ok: true, action: 'schema-applied' }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
