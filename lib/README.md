# 찾아줘 Next.js 백엔드 구조

- `config/`: 환경변수와 런타임 설정을 읽습니다.
- `contracts/`: Flutter와 주고받는 API DTO 계약입니다.
- `db/`: PostgreSQL 풀과 공통 쿼리 실행기를 둡니다.
- `repositories/`: 테이블 단위 데이터 접근 로직입니다.
- `services/`: 여러 저장소를 조합해 실제 비즈니스 흐름을 만듭니다.
- `security/`: 비밀번호 해시/검증 로직입니다.
- `utils/`: 시간 라벨 같은 공통 변환 유틸입니다.

현재 구조 원칙:

- Route는 검증과 HTTP 응답만 담당합니다.
- Service는 권한 확인, 매칭 계산, 부트스트랩 조립 같은 도메인 흐름을 담당합니다.
- Repository는 SQL과 컬럼 매핑만 담당합니다.
- Flutter와 계약이 바뀌면 `contracts/app-types.ts`와 대응 서비스/매퍼를 함께 수정합니다.
