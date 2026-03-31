async function getHealth() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return { status: 'unavailable' };
    }
    return response.json();
  } catch {
    return { status: 'disconnected' };
  }
}

export default async function HomePage() {
  const health = await getHealth();

  return (
    <main
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
        }}
      >
        <p style={{ color: '#0f766e', fontWeight: 700, margin: 0 }}>찾아줘 Next.js Backend</p>
        <h1 style={{ marginTop: 12, marginBottom: 10 }}>BLE 분실물 API 서버</h1>
        <p style={{ color: '#475569', lineHeight: 1.6 }}>
          Flutter 앱의 기기 상태, 분실물, 채팅, 알림, 신고, 안전지대 데이터를 PostgreSQL에 저장하고
          읽어오는 API 서버입니다.
        </p>
        <pre
          style={{
            marginTop: 20,
            padding: 16,
            background: '#f8fafc',
            borderRadius: 16,
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>
    </main>
  );
}
