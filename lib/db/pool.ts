// PostgreSQL 커넥션 풀은 프로세스 단위로 재사용해 요청마다 새 연결을 만들지 않는다.
import { Pool } from 'pg';

import { getEnv } from '@/lib/config/env';

declare global {
  // eslint-disable-next-line no-var
  var __findappPool: Pool | undefined;
}

export function getDb() {
  if (global.__findappPool) {
    return global.__findappPool;
  }

  const env = getEnv();
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    ssl: env.DATABASE_URL.includes('localhost')
      ? false
      : {
          rejectUnauthorized: false,
        },
  });

  global.__findappPool = pool;

  return pool;
}
