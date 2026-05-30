import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jotaduo · Agentes de IA",
  description: "Plataforma de agentes de IA para atendimento via WhatsApp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
