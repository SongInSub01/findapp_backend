import { readFile } from 'node:fs/promises';

import { getDb } from '../lib/db/pool';

// SQL 파일 전체를 한 번에 실행해 PostgreSQL의 do $$ 블록이 깨지지 않게 한다.
export async function runSqlFile(filePath: string) {
  const sql = await readFile(filePath, 'utf8');
  await getDb().query(sql);
}
