import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";


export const metadata: Metadata = {
  title: "Drivers License Tests",
  description: "Brotest bu haydovchilik guvohnomasini olishni reja qilgan odamlar uchun tekin test va yo'l belgilarini taqdim etuvchi website.",
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
        {children}
      </body>
    </html>
  );
}
