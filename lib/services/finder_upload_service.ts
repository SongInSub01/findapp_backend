// 업로드 파일을 디스크에 저장하고 정적 접근 경로를 만들어 주는 서비스다.
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function saveUploadedFile(file: File) {
  if (file.size === 0) {
    throw new Error('빈 파일은 업로드할 수 없습니다.');
  }

  const uploadDirectory = join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDirectory, { recursive: true });

  const originalName = file.name || 'upload.bin';
  const extension = extname(originalName) || '.bin';
  const safeBaseName = originalName
    .replace(extension, '')
    .replace(/[^0-9a-zA-Z가-힣-_]/g, '-')
    .slice(0, 40);
  const fileName = `${safeBaseName || 'upload'}-${randomUUID()}${extension}`;
  const fullPath = join(uploadDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(fullPath, buffer);

  return {
    imageUrl: `/uploads/${fileName}`,
    fileName: originalName,
    mimeType: file.type || 'application/octet-stream',
  };
}
