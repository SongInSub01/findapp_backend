// DB 연결과 필수 테이블 수를 빠르게 확인하는 헬스체크 서비스다.
import { query } from '@/lib/db/query';

export async function getHealthStatus() {
  const nowResult = await query<{ now: string }>('select now()::text as now');

  const tableCountResult = await query<{ count: string }>(
    `
      select count(*)::text as count
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'users',
          'alert_settings',
          'ble_devices',
          'lost_items',
          'chat_threads',
          'chat_messages',
          'safe_zones',
          'notifications',
          'reports'
        )
    `,
  );

  return {
    ok: true,
    databaseTime: nowResult.rows[0]?.now ?? null,
    requiredTableCount: Number(tableCountResult.rows[0]?.count ?? 0),
  };
}
