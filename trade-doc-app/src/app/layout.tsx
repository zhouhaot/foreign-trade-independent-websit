import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "外贸协同｜订单与单证管理",
  description: "客户、询盘、报价与订单一体化业务工作区",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><AuthProvider><AppShell>{children}</AppShell></AuthProvider></body>
    </html>
  );
}
