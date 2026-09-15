import type { Metadata, Viewport } from "next";
import "./globals.css";
import AmbientLights from "@/components/AmbientLights";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "Check-ins",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Check-ins", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  description: "Rede social de rotina e produtividade",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('checkins-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){document.documentElement.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches)}})()` }} /></head>
      <body className="min-h-screen bg-bg text-accent antialiased">
        <AmbientLights />
        {children}
      </body>
    </html>
  );
}
