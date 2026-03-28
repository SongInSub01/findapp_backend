// 업로드 이미지를 저장하고 앱에서 즉시 쓸 수 있는 접근 경로를 반환하는 API다.
import { NextRequest, NextResponse } from 'next/server';

import { saveUploadedFile } from '@/lib/services/finder_upload_service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new Error('업로드할 파일이 없습니다.');
    }

    const uploaded = await saveUploadedFile(file);
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '파일 업로드에 실패했습니다.' },
      { status: 400 },
    );
  }
}
