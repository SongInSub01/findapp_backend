import { join } from 'node:path';

import { runSqlFile } from './run-sql-file';

async function main() {
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.DB_SEED_SCOPE !== 'operational'
  ) {
    throw new Error(
      'db:seed는 운영 DB 전용입니다. NODE_ENV=production 및 DB_SEED_SCOPE=operational 환경에서만 허용됩니다.',
    );
  }

  const schemaPath = join(process.cwd(), 'db', 'schema.sql');
  const seedPath = join(process.cwd(), 'db', 'seed.sql');
  await runSqlFile(schemaPath);
  await runSqlFile(seedPath);
  console.log(JSON.stringify({ ok: true, action: 'seed-applied' }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
