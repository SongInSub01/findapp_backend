// schema.sql, seed.sql 같은 SQL 파일을 문장 단위로 나눠 순서대로 실행하는 스크립트 유틸이다.
import { readFile } from 'node:fs/promises';

import { getDb } from '../lib/db/pool';

// SQL 파일을 문장 단위로 나눠 순서대로 실행한다.
export async function runSqlFile(filePath: string) {
  const sql = await readFile(filePath, 'utf8');
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await getDb().query(statement);
  }
}

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let buffer = '';
  let inSingleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index];
    const next = sql[index + 1] ?? '';

    if (inLineComment) {
      buffer += current;
      if (current === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      buffer += current;
      if (current === '*' && next === '/') {
        buffer += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingleQuote && current === '-' && next === '-') {
      buffer += current;
      buffer += next;
      index += 1;
      inLineComment = true;
      continue;
    }

    if (!inSingleQuote && current === '/' && next === '*') {
      buffer += current;
      buffer += next;
      index += 1;
      inBlockComment = true;
      continue;
    }

    if (current === '\'') {
      buffer += current;
      if (inSingleQuote && next === '\'') {
        buffer += next;
        index += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (current === ';' && !inSingleQuote) {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      buffer = '';
      continue;
    }

    buffer += current;
  }

  const trailing = buffer.trim();
  if (trailing.length > 0) {
    statements.push(trailing);
  }

  return statements;
}
