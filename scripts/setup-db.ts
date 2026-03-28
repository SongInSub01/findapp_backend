// DB 스키마 파일을 읽어 현재 PostgreSQL에 반영한다.
import { join } from 'node:path';

import { runSqlFile } from './run-sql-file';

async function main() {
  const schemaPath = join(process.cwd(), 'db', 'schema.sql');
  await runSqlFile(schemaPath);
  console.log('schema applied');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
