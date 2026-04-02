import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import NextTopLoader from "nextjs-toploader";


export const metadata: Metadata = {
  title: "Drivers License Tests",
  description: "Brotest bu haydovchilik guvohnomasini olishni reja qilgan odamlar uchun tekin test va yo'l belgilarini taqdim etuvchi website.",
  icons: {
    icon: "/license.png",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-mono")}>
      <body
      >
        <NextTopLoader color="#4f46e5" height={3} showSpinner={false} />
        {children}
      </body>
    </html>
  );
}
