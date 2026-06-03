// 공통 SQL 실행 래퍼다. 모든 저장소는 이 함수를 통해 일관되게 DB에 접근한다.
import type { QueryResultRow } from 'pg';

import { getDb } from '@/lib/db/pool';
import { toPublicDatabaseError } from '@/lib/db/public_error';

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  try {
    return await getDb().query<T>(text, values);
  } catch (error) {
    throw toPublicDatabaseError(error);
  }
}
