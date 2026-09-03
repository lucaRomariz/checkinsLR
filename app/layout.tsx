import type { Metadata } from 'next';
import './globals.css';
import AmbientLights from '@/components/AmbientLights';

export const metadata: Metadata = {
  title: 'Check-ins',
  description: 'Rede social de rotina e produtividade',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-bg text-accent antialiased">
        <AmbientLights />
        {children}
      </body>
    </html>
  );
}
