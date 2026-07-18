import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FlowDesk — AI-Powered Support", template: "%s | FlowDesk" },
  description: "Intelligent customer support operations platform for SaaS teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
