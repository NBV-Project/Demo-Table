import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบบันทึกแทงเลข 2 ตัว",
  description:
    "บันทึกแทงเลข 00-99 แบบสะสมยอดอัตโนมัติ พร้อมหน้า Dashboard สรุปยอดแยกบน/ล่าง",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
