"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { ErrorPanel, LoadingState } from "./ui";
import { roleLabels } from "@/lib/format";

const navItems = [
  { href: "/", label: "工作台", icon: "grid" },
  { href: "/customers", label: "客户", icon: "users" },
  { href: "/inquiries", label: "询盘", icon: "mail" },
  { href: "/quotes", label: "报价", icon: "file" },
  { href: "/orders", label: "订单", icon: "box" },
] as const;

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    mail: "M4 4h16v16H4zM4 6l8 7 8-7",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6",
    box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7L12 12l8.7-5M12 22V12",
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  if (pathname === "/login") return children;
  if (loading) return <main className="boot-screen"><LoadingState label="正在验证登录状态" /></main>;
  if (!user) return <main className="boot-screen"><LoadingState label="正在前往登录页" /></main>;

  const accessible = user.role === "sales" || user.role === "boss";
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try { await logout(); } catch (error) { setLogoutError(error); setLoggingOut(false); }
  };

  return (
    <div className={`layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <Link className="logo" href="/" aria-label="外贸协同工作台">
          <span className="badge-logo">外</span>
          <span className="logo-text">外贸协同<small>订单与单证管理</small></span>
        </Link>
        <nav className="nav" aria-label="主导航">
          <p className="nav-group-label">业务工作区</p>
          {accessible ? navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} className={`nav-item ${active ? "active" : ""}`} href={item.href} aria-current={active ? "page" : undefined}><span className="ico"><NavIcon name={item.icon} /></span><span className="nav-label">{item.label}</span></Link>;
          }) : <p className="nav-unavailable">当前岗位未开放销售业务切片</p>}
        </nav>
        <div className="sidebar-note"><span className="workspace-dot" /><span className="nav-label">业务数据实时读取<small>权限与归属由服务端校验</small></span></div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="icon-btn" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "展开导航" : "收起导航"}>☰</button>
          <div className="breadcrumb"><span>外贸协同</span><span className="sep">/</span><span className="current">{navItems.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.label ?? "工作台"}</span></div>
          <div className="topbar-right">
            <span className="current-role">{roleLabels[user.role]}</span>
            <div className="user-chip"><span className="avatar">{user.displayName.slice(0, 1)}</span><span><b className="user-account">{user.displayName}</b><small className="user-username">{user.username}</small></span></div>
            <button className="logout-btn" type="button" disabled={loggingOut} onClick={handleLogout}>{loggingOut ? "退出中…" : "退出"}</button>
          </div>
        </header>
        {logoutError ? <div className="top-error"><ErrorPanel error={logoutError} /></div> : null}
        <main className="workspace">{accessible ? children : <section className="forbidden"><h1>当前岗位未开放此业务切片</h1><p>首切片仅向外贸业务员和业务主管开放销售目录及业务读取。如需办理业务，请使用已授权账号。</p></section>}</main>
      </div>
    </div>
  );
}
