"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth";
import { ProductCatalog } from "@/components/product-catalog";
import { BackLink, EmptyState, ErrorPanel, LoadingState, PageHeader } from "@/components/ui";
import type { Currency, Customer, Inquiry, Product } from "@/lib/contracts";
import { todayInputValue } from "@/lib/format";
import { useCommand, useResource } from "@/lib/use-resource";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";

type DraftLine = { key: string; product: Product; quantity: string };

export default function NewInquiryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const customers = useResource<{ items: Customer[] }>("/customers?page=1&pageSize=100&q=");
  const currencies = useResource<{ items: Currency[] }>("/reference/currencies");
  const [customerId, setCustomerId] = useState("");
  const [inquiryDate, setInquiryDate] = useState(todayInputValue());
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { execute, pending } = useCommand();

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("customerId");
    if (requested && customers.data?.items.some((customer) => customer.id === requested)) setCustomerId(requested);
  }, [customers.data]);

  const dirty = Boolean(customerId || source || message || lines.length);
  useUnsavedGuard(dirty && !pending);
  const customer = useMemo(() => customers.data?.items.find((item) => item.id === customerId), [customerId, customers.data]);

  if (user?.role !== "sales") return <section className="forbidden"><h1>当前账号不能新建询盘</h1><p>主管可读取询盘，但不能代业务员写入。</p></section>;

  const addProduct = (product: Product) => {
    setLines((current) => [...current, { key: crypto.randomUUID(), product, quantity: "" }]);
    setCatalogOpen(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!customer) { setError(new Error("请选择客户并等待客户版本读取完成。")); return; }
    if (lines.length === 0 || lines.some((line) => !line.quantity)) { setError(new Error("请至少添加一项商品，并填写每行询价数量。")); return; }
    try {
      const inquiry = await execute<Inquiry>("/inquiries", "POST", {
        customerId: customer.id,
        customerVersion: customer.version,
        inquiryDate,
        source: source.trim(),
        message: message.trim(),
        items: lines.map((line) => ({ productId: line.product.id, productVersion: line.product.version, quantity: line.quantity })),
      });
      router.push(`/inquiries/${inquiry.id}`);
    } catch (reason) { setError(reason); }
  };

  return <><BackLink href="/inquiries" /><PageHeader title="新建询盘" description="客户与商品版本将随请求提交；若目录已变化，服务端会拒绝并要求重新审阅。" />
    {(customers.error || currencies.error) ? <ErrorPanel error={customers.error ?? currencies.error} onRetry={() => { customers.refresh(); currencies.refresh(); }} /> : null}
    {customers.loading && !customers.data ? <LoadingState label="正在读取客户与商品目录" /> : <form onSubmit={submit}>
      <section className="card"><h2 className="card-title">需求信息</h2><div className="form-grid cols-2">
        <div className="form-item"><label className="required" htmlFor="inquiry-customer">客户</label><select id="inquiry-customer" className="select" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">请选择本人客户</option>{customers.data?.items.map((item) => <option key={item.id} value={item.id}>{item.nameCn} · {item.country}</option>)}</select>{customers.data?.items.length === 0 ? <small>尚无客户，请先<Link href="/customers/new">新建客户</Link>。</small> : null}</div>
        <div className="form-item"><label className="required" htmlFor="inquiry-date">询盘日期</label><input id="inquiry-date" className="input" type="date" required value={inquiryDate} onChange={(e) => setInquiryDate(e.target.value)} /></div>
        <div className="form-item span-2"><label className="required" htmlFor="inquiry-source">需求来源</label><input id="inquiry-source" className="input" required maxLength={100} placeholder="如 客户邮件、展会、独立站表单" value={source} onChange={(e) => setSource(e.target.value)} /></div>
        <div className="form-item span-2"><label className="required" htmlFor="inquiry-message">客户需求</label><textarea id="inquiry-message" className="textarea tall" required maxLength={5000} placeholder="记录客户用途、包装、交期或其他要求" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
      </div></section>
      <section className="card inquiry-items"><div className="card-title"><h2>询价商品</h2><button className="btn" type="button" onClick={() => setCatalogOpen(true)}>从商品目录添加</button></div><p className="readonly-hint">允许同一商品多行；创建后每行分配稳定行号，商品描述与单位保留为询盘快照。</p>
        {lines.length ? <div className="table-wrap"><table className="table"><thead><tr><th>SKU / 商品</th><th>规格</th><th>目录版本</th><th className="num">询价数量</th><th>单位</th><th>操作</th></tr></thead><tbody>{lines.map((line, index) => <tr key={line.key}><td><strong>{line.product.sku}</strong><span className="cell-secondary">{line.product.nameCn}</span></td><td>{line.product.spec || "—"}</td><td>V{line.product.version}</td><td className="num"><input className="input quantity-input" aria-label={`第 ${index + 1} 行询价数量`} required inputMode="decimal" pattern="(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,2})?" value={line.quantity} onChange={(e) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: e.target.value } : item))} /></td><td>{line.product.unit}</td><td><button className="btn btn-sm" type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>移除</button></td></tr>)}</tbody></table></div> : <EmptyState title="尚未添加商品" description="从公司共用商品目录选择一项或多项。" action={<button className="btn btn-primary" type="button" onClick={() => setCatalogOpen(true)}>选择商品</button>} />}
      </section>
      <ErrorPanel error={error} />
      <div className="form-actions"><Link className="btn" href="/inquiries">取消</Link><button className="btn btn-primary" type="submit" disabled={pending || !customer || lines.length === 0}>{pending ? "创建中…" : "创建询盘"}</button></div>
    </form>}
    {catalogOpen ? <ProductCatalog currencies={currencies.data?.items ?? []} onSelect={addProduct} onClose={() => setCatalogOpen(false)} /> : null}
  </>;
}
