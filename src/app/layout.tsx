import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AssistantProvider } from "@/components/assistant-provider";
import { BatcomputerShell } from "@/components/batcomputer-shell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Batcomputer — Wayne Systems",
    template: "%s · Batcomputer",
  },
  description: "A private voice command console for browser controls, system status, and Spotify playback.",
  applicationName: "Batcomputer",
  keywords: ["voice assistant", "Spotify controls", "command console"],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#08090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AssistantProvider>
          <BatcomputerShell>{children}</BatcomputerShell>
        </AssistantProvider>
      </body>
    </html>
  );
}
