import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '찾아줘 API',
  description: 'BLE 기반 분실물 찾기 앱 백엔드',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
