"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth";
import { BackLink, DetailGrid, EmptyState, ErrorPanel, LoadingState, Modal, PageHeader, StatusTag } from "@/components/ui";
import type { Currency, Customer, Inquiry, Quote } from "@/lib/contracts";
import { businessNo, formatDateTime, inquiryStatusLabels } from "@/lib/format";
import { useCommand, useResource } from "@/lib/use-resource";

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const resource = useResource<Inquiry>(`/inquiries/${id}`);
  const inquiry = resource.data;
  const customer = useResource<Customer>(inquiry ? `/customers/${inquiry.customerId}` : null);
  const currencies = useResource<{ items: Currency[] }>(inquiry?.status === "FOLLOWING" ? "/reference/currencies" : null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [currency, setCurrency] = useState("");
  const [error, setError] = useState<unknown>(null);
  const { execute, pending } = useCommand();

  if (resource.loading && !inquiry) return <LoadingState />;
  if (resource.error && !inquiry) return <><BackLink href="/inquiries" /><ErrorPanel error={resource.error} onRetry={resource.refresh} /></>;
  if (!inquiry) return null;

  const createQuote = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const quote = await execute<Quote>(`/inquiries/${inquiry.id}/quotes`, "POST", { expectedVersion: inquiry.version, currency });
      router.push(`/quotes/${quote.id}`);
    } catch (reason) { setError(reason); }
  };

  return <><BackLink href="/inquiries" /><PageHeader title={`询盘 ${businessNo(inquiry)}`} description={`${inquiry.source} · 创建于 ${formatDateTime(inquiry.createdAt)}`}><StatusTag tone={inquiry.status === "QUOTED" ? "green" : "orange"}>{inquiryStatusLabels[inquiry.status]}</StatusTag>{inquiry.quoteId ? <Link className="btn btn-primary" href={`/quotes/${inquiry.quoteId}`}>查看关联报价</Link> : user?.role === "sales" ? <button className="btn btn-primary" type="button" onClick={() => setDraftOpen(true)}>起草报价</button> : null}</PageHeader>
    <section className="card"><h2 className="card-title">询盘概况</h2><DetailGrid items={[{ label: "客户", value: customer.data ? <Link href={`/customers/${inquiry.customerId}`}>{customer.data.nameCn}</Link> : customer.error ? "客户资料不可用" : "读取中…" }, { label: "询盘日期", value: inquiry.inquiryDate }, { label: "来源", value: inquiry.source }, { label: "来源版本", value: `询盘 V${inquiry.version} · 客户创建版本 V${inquiry.customerVersion}` }]} /><div className="inquiry-message"><h3>客户需求</h3><p>{inquiry.message}</p></div></section>
    <section className="card inquiry-items"><h2 className="card-title">商品快照 <span className="sub">{inquiry.items.length} 项</span></h2><div className="table-wrap"><table className="table"><thead><tr><th>行号</th><th>SKU / 商品</th><th>英文名称</th><th>规格</th><th className="num">询价数量</th><th>快照版本</th></tr></thead><tbody>{inquiry.items.map((item) => <tr key={item.lineNo}><td>{item.lineNo}</td><td><strong>{item.product.sku}</strong><span className="cell-secondary">{item.product.nameCn}</span></td><td>{item.product.nameEn}</td><td>{item.product.spec || "—"}</td><td className="num">{item.quantity} {item.product.unit}</td><td>商品 V{item.product.productVersion}</td></tr>)}</tbody></table></div></section>
    <section className="card"><h2 className="card-title">后续动作</h2>{inquiry.quoteId ? <p>本询盘已有关联报价，每份询盘首切片仅允许一份首报。</p> : user?.role === "boss" ? <p>主管可查看来源明细，但起草报价须由归属业务员办理。</p> : <p>起草报价会复制全部商品与数量快照，成交单价在报价草稿中填写。</p>}</section>
    {draftOpen ? <Modal title="从询盘起草报价" onClose={() => { if (!pending) setDraftOpen(false); }}><form onSubmit={createQuote}><p>将复制 {inquiry.items.length} 行商品快照，报价日期与默认有效期由服务端生成。</p><div className="form-item"><label className="required" htmlFor="quote-currency">报价币种</label><select id="quote-currency" className="select" required value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="">请选择启用币种</option>{currencies.data?.items.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.displayName}</option>)}</select></div>{currencies.data?.items.length === 0 ? <EmptyState title="暂无可用币种" description="需先由服务端配置启用的两位金额币种。" /> : null}<ErrorPanel error={error ?? currencies.error} /><div className="form-actions"><button className="btn" type="button" disabled={pending} onClick={() => setDraftOpen(false)}>取消</button><button className="btn btn-primary" type="submit" disabled={pending || !currency}>{pending ? "起草中…" : "创建报价草稿"}</button></div></form></Modal> : null}
  </>;
}
