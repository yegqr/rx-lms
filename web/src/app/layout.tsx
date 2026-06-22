import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Disruption — KSE × RethinkX",
  description:
    "An AI-mentored course on the pattern of disruption, by RethinkX and the Kyiv School of Economics.",
  icons: { icon: "/brand/kse-mark.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
