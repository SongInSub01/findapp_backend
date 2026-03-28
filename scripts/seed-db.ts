// 앱 기본 화면이 비어 있지 않도록 초기 데이터 시드를 넣는다.
import { join } from 'node:path';

import { runSqlFile } from './run-sql-file';

async function main() {
  const seedPath = join(process.cwd(), 'db', 'seed.sql');
  await runSqlFile(seedPath);
  console.log('seed applied');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
