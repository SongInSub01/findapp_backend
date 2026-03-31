// 환경변수는 DB 연결과 기본 리소스 경로 같은 런타임 값을 한 곳에서 읽는다.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { config as loadDotenv } from 'dotenv';

import { z } from 'zod';

// 서버 실행은 systemd EnvironmentFile을 우선 사용하고, 로컬 스크립트는
// .env.local / .env.production / .env 순서로 보조 로딩한다.
for (const finalPath of [
  join(process.cwd(), '.env.local'),
  join(process.cwd(), '.env.production'),
  join(process.cwd(), '.env'),
]) {
  if (existsSync(finalPath)) {
    loadDotenv({ path: finalPath, override: false });
  }
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.string().optional(),
  APP_NAME: z.string().default('찾아줘 API'),
  DEFAULT_PROFILE_IMAGE_PATH: z.string().default('assets/images/icon.png'),
  DEFAULT_USER_EMAIL: z.string().email().optional(),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    APP_NAME: process.env.APP_NAME,
    DEFAULT_PROFILE_IMAGE_PATH: process.env.DEFAULT_PROFILE_IMAGE_PATH,
    DEFAULT_USER_EMAIL: process.env.DEFAULT_USER_EMAIL,
  });

  return cachedEnv;
}
