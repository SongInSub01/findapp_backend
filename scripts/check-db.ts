// 현재 DB 연결 상태와 생성된 테이블 목록을 출력한다.
import { query } from '../lib/db/query';

async function main() {
  const now = await query<{ now: string }>('select now()::text as now');
  const tables = await query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name asc
    `,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        now: now.rows[0]?.now ?? null,
        tables: tables.rows.map((table) => table.table_name),
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          message: error instanceof Error ? error.message : 'Unknown DB check error',
        },
        null,
        2,
      ),
    );
    process.exit(1);
  });
