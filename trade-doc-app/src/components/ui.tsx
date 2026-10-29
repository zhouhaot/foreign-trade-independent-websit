"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ApiError } from "@/lib/api";

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {children ? <div className="actions">{children}</div> : null}
    </header>
  );
}

export function StatusTag({ tone = "gray", children }: { tone?: "blue" | "green" | "orange" | "red" | "gray" | "purple"; children: ReactNode }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function LoadingState({ label = "正在读取数据" }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  const apiError = error instanceof ApiError ? error : null;
  const status = apiError?.status;
  const title = status === 401 ? (apiError?.code === "INVALID_CREDENTIALS" ? "账号或密码不正确" : "登录状态已失效")
    : status === 403 ? "当前账号无权执行此操作"
      : status === 404 ? "记录不存在或不在可访问范围内"
        : status === 409 ? "数据已变化，本次操作未提交"
          : status === 422 ? "请修正以下内容"
            : status === 429 ? "请求过于频繁" : "操作未完成";
  return (
    <section className={`error-panel ${status === 409 ? "warning" : ""}`} role="alert">
      <div className="error-heading"><strong>{title}</strong>{status ? <span>HTTP {status}</span> : null}</div>
      <p>{apiError?.message ?? (error instanceof Error ? error.message : "发生未知错误，请重试。")}</p>
      {apiError && apiError.fieldErrors.length > 0 ? (
        <ul className="field-error-list">
          {apiError.fieldErrors.map((field, index) => <li key={`${field.path}-${index}`}><code>{field.path}</code>{field.message}</li>)}
        </ul>
      ) : null}
      {apiError?.requestId && apiError.requestId !== "未提供" ? <small>请求编号：{apiError.requestId}</small> : null}
      {apiError?.currentVersion !== undefined ? <small>服务端当前版本：V{apiError.currentVersion}。请重新读取并审阅后再操作。</small> : null}
      {apiError?.retryAfter ? <small>请在 {apiError.retryAfter} 秒后重试。</small> : null}
      {onRetry ? <button className="btn btn-sm" type="button" onClick={onRetry}>重新读取</button> : null}
    </section>
  );
}

export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (page: number) => void }) {
  return (
    <nav className="pagination" aria-label="分页">
      <span className="total">共 {total} 条</span>
      <button className="page-btn" type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>上一页</button>
      <span className="page-current">{totalPages === 0 ? 0 : page} / {totalPages}</span>
      <button className="page-btn" type="button" disabled={totalPages === 0 || page >= totalPages} onClick={() => onChange(page + 1)}>下一页</button>
    </nav>
  );
}

export function SearchBar({ value, onChange, onSearch, onReset, placeholder }: { value: string; onChange: (value: string) => void; onSearch: () => void; onReset: () => void; placeholder: string }) {
  return (
    <form className="filter-bar" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
      <div className="form-item search-field">
        <label htmlFor="list-search">关键字</label>
        <input id="list-search" className="input" value={value} maxLength={100} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
      <div className="filter-actions">
        <button className="btn btn-primary" type="submit">查询</button>
        <button className="btn" type="button" onClick={onReset}>重置</button>
      </div>
    </form>
  );
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]"));
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? "modal-lg" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
        <div className="modal-head"><h2 id={titleId}>{title}</h2><button className="icon-btn" type="button" aria-label="关闭" onClick={onClose}>×</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function BackLink({ href, children = "返回列表" }: { href: string; children?: ReactNode }) {
  return <Link className="back-link" href={href}>← {children}</Link>;
}

export function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <dl className="desc-grid">{items.map((item) => <div className="di" key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
