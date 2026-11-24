import { Sora, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const bodyFont = Sora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata = {
  title: "Meridian — Your daily news desk",
  description: "Simple personal news briefing across your cities and topics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} h-full`}>
      <body className="relative min-h-full antialiased">
        <div className="relative z-[1]">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
