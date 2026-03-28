// 운영 DB에서 라이브 테스트 흔적과 임시 데이터를 정리하는 실행 스크립트다.
import { join } from 'node:path';

import { runSqlFile } from './run-sql-file';

async function main() {
  const cleanupPath = join(process.cwd(), 'db', 'cleanup_operational.sql');
  await runSqlFile(cleanupPath);
  console.log('operational cleanup applied');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
