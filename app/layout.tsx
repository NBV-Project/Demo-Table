import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบบันทึกแทงเลข 2 ตัว",
  description:
    "บันทึกแทงเลขรายลูกค้า แยกบน 00-49 และล่าง 50-99 พร้อมหน้าสรุปจำนวนคนแทงรายเลข",
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
