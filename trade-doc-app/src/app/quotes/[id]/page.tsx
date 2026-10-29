"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth";
import { QuoteItemsTable, QuoteOrderLink } from "@/components/trade";
import { BackLink, DetailGrid, ErrorPanel, LoadingState, Modal, PageHeader, StatusTag } from "@/components/ui";
import type { Currency, Order, Quote } from "@/lib/contracts";
import { businessNo, formatDateTime, formatMoney, quoteStatusLabels, todayInputValue } from "@/lib/format";
import { useCommand, useResource } from "@/lib/use-resource";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";

type QuoteDraft = {
  validUntil: string;
  currency: string;
  tradeTerm: string;
  paymentTerm: string;
  remark: string;
  items: Array<{ lineNo: number; quantity: string; unitPrice: string }>;
};

function toDraft(quote: Quote): QuoteDraft {
  return {
    validUntil: quote.validUntil ?? "",
    currency: quote.currency,
    tradeTerm: quote.tradeTerm,
    paymentTerm: quote.paymentTerm,
    remark: quote.remark,
    items: quote.items.map((item) => ({ lineNo: item.lineNo, quantity: item.quantity, unitPrice: item.unitPrice ?? "" })),
  };
}

const tones = { DRAFT: "gray", AWAITING_CUSTOMER: "orange", CONFIRMED: "green" } as const;

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const resource = useResource<Quote>(`/quotes/${id}`);
  const quote = resource.data;
  const currencies = useResource<{ items: Currency[] }>(quote?.status === "DRAFT" ? "/reference/currencies" : null);
  const [draft, setDraft] = useState<QuoteDraft | null>(quote ? toDraft(quote) : null);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [confirmation, setConfirmation] = useState({ method: "", confirmedOn: todayInputValue(), note: "" });
  const [deliveryDate, setDeliveryDate] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const saveCommand = useCommand();
  const submitCommand = useCommand();
  const confirmCommand = useCommand();
  const orderCommand = useCommand();
  const canWrite = user?.role === "sales";

  useEffect(() => { if (quote) setDraft(toDraft(quote)); }, [quote]);
  const original = useMemo(() => quote ? JSON.stringify(toDraft(quote)) : "", [quote]);
  const dirty = Boolean(draft && JSON.stringify(draft) !== original);
  useUnsavedGuard(dirty && !saveCommand.pending);

  if (resource.loading && !quote) return <LoadingState />;
  if (resource.error && !quote) return <><BackLink href="/quotes" /><ErrorPanel error={resource.error} onRetry={resource.refresh} /></>;
  if (!quote || !draft) return null;

  const updateItem = (lineNo: number, field: "quantity" | "unitPrice", value: string) => setDraft((current) => current ? { ...current, items: current.items.map((item) => item.lineNo === lineNo ? { ...item, [field]: value } : item) } : current);
  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    setError(null);
    setNotice("");
    try {
      const updated = await saveCommand.execute<Quote>(`/quotes/${quote.id}`, "PUT", {
        expectedVersion: quote.version,
        validUntil: draft.validUntil || null,
        currency: draft.currency,
        tradeTerm: draft.tradeTerm,
        paymentTerm: draft.paymentTerm,
        remark: draft.remark,
        items: draft.items.map((item) => ({ lineNo: item.lineNo, quantity: item.quantity, unitPrice: item.unitPrice || null })),
      });
      resource.setData(updated);
      setNotice("草稿已保存，行金额与总额由服务端重新计算。");
    } catch (reason) { setError(reason); }
  };
  const openSubmit = () => {
    setError(null);
    if (dirty) { setError(new Error("请先保存当前修改，再按最新版本提交报价。")); return; }
    if (!quote.companySnapshot || quote.sourceVersions.companyProfileVersion === null) { setError(new Error("真实公司资料尚未配置，不能提交报价。请完成服务端公司资料初始化后重新读取。")); return; }
    if (!draft.validUntil || !draft.tradeTerm.trim() || !draft.paymentTerm.trim() || draft.items.some((item) => !item.quantity || !item.unitPrice)) { setError(new Error("提交前请补齐有效期、贸易条款、付款条款以及每行数量和成交单价。")); return; }
    setSubmitOpen(true);
  };
  const submitQuote = async () => {
    const companyVersion = quote.sourceVersions.companyProfileVersion;
    if (companyVersion === null) return;
    setError(null);
    try {
      const updated = await submitCommand.execute<Quote>(`/quotes/${quote.id}/submit`, "POST", { expectedVersion: quote.version, expectedCustomerVersion: quote.sourceVersions.customerVersion, expectedCompanyProfileVersion: companyVersion });
      resource.setData(updated);
      setSubmitOpen(false);
      setNotice("报价已提交，交易、客户与公司资料快照已冻结。");
    } catch (reason) { setError(reason); setSubmitOpen(false); }
  };
  const recordConfirmation = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const updated = await confirmCommand.execute<Quote>(`/quotes/${quote.id}/customer-confirmations`, "POST", { expectedVersion: quote.version, method: confirmation.method.trim(), confirmedOn: confirmation.confirmedOn, note: confirmation.note.trim() });
      resource.setData(updated);
      setConfirmOpen(false);
      setNotice("客户确认已登记，确认内容绑定提交时的冻结快照。");
    } catch (reason) { setError(reason); }
  };
  const createOrder = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const order = await orderCommand.execute<Order>(`/quotes/${quote.id}/orders`, "POST", { expectedVersion: quote.version, deliveryDate });
      router.push(`/orders/${order.id}`);
    } catch (reason) { setError(reason); }
  };

  return <><BackLink href="/quotes" /><PageHeader title={`报价 ${businessNo(quote)}`} description={`报价日 ${quote.quoteDate} · 当前版本 V${quote.version}`}><StatusTag tone={tones[quote.status]}>{quoteStatusLabels[quote.status]}</StatusTag>{quote.orderId ? <QuoteOrderLink orderId={quote.orderId} /> : null}</PageHeader>
    {notice ? <div className="success-box" role="status">{notice}</div> : null}
    <section className="card"><h2 className="card-title">交易参与方 {quote.status === "DRAFT" ? <span className="sub">草稿为当前授权资料预览，提交时核对版本</span> : <span className="sub">提交冻结快照 V{quote.submittedSnapshot?.snapshotVersion}</span>}</h2><div className="party-grid"><div><span className="party-label">客户</span><h3>{quote.customerSnapshot.nameCn}</h3><p>{quote.customerSnapshot.nameEn}</p><p>{quote.customerSnapshot.country} · {quote.customerSnapshot.contact}</p><small>客户资料版本 V{quote.sourceVersions.customerVersion}</small></div><div><span className="party-label">本公司</span>{quote.companySnapshot ? <><h3>{quote.companySnapshot.legalName}</h3><p>{quote.companySnapshot.address}</p><small>公司资料版本 V{quote.sourceVersions.companyProfileVersion}</small></> : <p className="warning-text">公司资料未配置，当前草稿只能保存，不能提交。</p>}</div></div></section>
    {quote.status === "DRAFT" && canWrite ? <form ref={formRef} onSubmit={save}>
      <section className="card"><h2 className="card-title">报价条款 <span className="sub">空白条款与未定价可暂存草稿</span></h2><div className="form-grid">
        <div className="form-item"><label htmlFor="quote-valid">有效期至</label><input id="quote-valid" className="input" type="date" min={quote.quoteDate} value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} /></div>
        <div className="form-item"><label className="required" htmlFor="quote-currency-edit">币种</label><select id="quote-currency-edit" className="select" required value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>{currencies.data?.items.some((item) => item.code === draft.currency) ? null : <option value={draft.currency}>{draft.currency}（当前）</option>}{currencies.data?.items.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.displayName}</option>)}</select></div>
        <div className="form-item"><label htmlFor="quote-trade-term">贸易条款</label><input id="quote-trade-term" className="input" maxLength={200} placeholder="如 FOB Shanghai" value={draft.tradeTerm} onChange={(e) => setDraft({ ...draft, tradeTerm: e.target.value })} /></div>
        <div className="form-item span-3"><label htmlFor="quote-payment">付款条款</label><input id="quote-payment" className="input" maxLength={500} placeholder="如 30% 预付，70% 发货前付清" value={draft.paymentTerm} onChange={(e) => setDraft({ ...draft, paymentTerm: e.target.value })} /></div>
        <div className="form-item span-3"><label htmlFor="quote-remark">报价备注</label><textarea id="quote-remark" className="textarea" maxLength={2000} value={draft.remark} onChange={(e) => setDraft({ ...draft, remark: e.target.value })} /></div>
      </div></section>
      <section className="card"><h2 className="card-title">成交明细 <span className="sub">完整保留来源行号，不可替换商品或删除明细</span></h2><div className="table-wrap"><table className="table quote-edit-table"><thead><tr><th>行号</th><th>商品 / 规格</th><th className="num">数量</th><th>单位</th><th className="num">成交单价（{draft.currency}）</th><th className="num">已保存行金额</th></tr></thead><tbody>{draft.items.map((item, index) => { const source = quote.items.find((candidate) => candidate.lineNo === item.lineNo); return <tr key={item.lineNo}><td>{item.lineNo}</td><td><strong>{source?.product.sku}</strong><span className="cell-secondary">{source?.product.nameCn} · {source?.product.spec}</span></td><td className="num"><input className="input quantity-input" aria-label={`第 ${index + 1} 行数量`} required inputMode="decimal" pattern="(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,2})?" value={item.quantity} onChange={(e) => updateItem(item.lineNo, "quantity", e.target.value)} /></td><td>{source?.product.unit}</td><td className="num"><input className="input price-input" aria-label={`第 ${index + 1} 行成交单价`} inputMode="decimal" pattern="(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,2})?" placeholder="待定价" value={item.unitPrice} onChange={(e) => updateItem(item.lineNo, "unitPrice", e.target.value)} /></td><td className="num">{formatMoney(source?.lineAmount ?? null, quote.currency)}</td></tr>; })}</tbody><tfoot><tr><td colSpan={5}>已保存报价总额{dirty ? "（当前修改将在保存后重算）" : ""}</td><td className="num"><strong>{formatMoney(quote.totalAmount, quote.currency)}</strong></td></tr></tfoot></table></div><p className="readonly-hint">数量与单价最多两位小数；乘积必须精确到分。非整分行会由服务端返回 422，不会静默四舍五入。</p></section>
      <ErrorPanel error={error ?? currencies.error} onRetry={() => { if (!dirty || window.confirm("重新读取会放弃未保存的修改，确定继续吗？")) resource.refresh(); }} />
      <div className="form-actions sticky-actions"><span className={`draft-status ${dirty ? "has-changes" : ""}`}>{dirty ? "有未保存的修改" : "草稿与服务端一致"}</span><button className="btn" type="submit" disabled={saveCommand.pending || submitCommand.pending || !dirty}>{saveCommand.pending ? "保存中…" : "保存草稿"}</button><button className="btn btn-primary" type="button" disabled={saveCommand.pending || submitCommand.pending} onClick={openSubmit}>提交待客户确认</button></div>
    </form> : <>
      <section className="card"><h2 className="card-title">交易条款</h2><DetailGrid items={[{ label: "有效期至", value: quote.validUntil }, { label: "币种", value: quote.currency }, { label: "贸易条款", value: quote.tradeTerm }, { label: "付款条款", value: quote.paymentTerm }, { label: "备注", value: quote.remark || "—" }, { label: "冻结时间", value: quote.submittedSnapshot ? formatDateTime(quote.submittedSnapshot.frozenAt) : "—" }]} /></section>
      <section className="card"><h2 className="card-title">报价明细 <span className="sub total-amount">{formatMoney(quote.totalAmount, quote.currency)}</span></h2><QuoteItemsTable items={quote.items} currency={quote.currency} /></section>
      <ErrorPanel error={error} onRetry={resource.refresh} />
      {quote.status === "AWAITING_CUSTOMER" && canWrite ? <div className="form-actions"><button className="btn btn-primary" type="button" onClick={() => { setError(null); setConfirmOpen(true); }}>登记客户确认</button></div> : null}
      {quote.status === "CONFIRMED" && !quote.orderId && canWrite ? <div className="form-actions"><button className="btn btn-primary" type="button" onClick={() => { setError(null); setOrderOpen(true); }}>生成订单</button></div> : null}
    </>}
    {quote.customerConfirmation ? <section className="card confirmation-card"><h2 className="card-title">客户确认记录 <StatusTag tone="green">已确认</StatusTag></h2><DetailGrid items={[{ label: "确认方式", value: quote.customerConfirmation.method }, { label: "业务确认日期", value: quote.customerConfirmation.confirmedOn }, { label: "确认说明", value: quote.customerConfirmation.note }, { label: "绑定快照", value: `V${quote.customerConfirmation.quoteSnapshotVersion}` }, { label: "服务端登记时间", value: formatDateTime(quote.customerConfirmation.recordedAt) }, { label: "附件", value: "首切片未开放附件上传" }]} /></section> : null}
    <section className="card source-links"><h2 className="card-title">来源与关联</h2><Link className="btn" href={`/inquiries/${quote.inquiryId}`}>查看来源询盘</Link><Link className="btn" href={`/customers/${quote.customerId}`}>查看客户资料</Link>{quote.orderId ? <QuoteOrderLink orderId={quote.orderId} /> : null}</section>
    {submitOpen ? <Modal title="提交报价并冻结交易" onClose={() => { if (!submitCommand.pending) setSubmitOpen(false); }}><div className="warn-box">提交后不能再编辑此报价。客户、公司、商品、数量、价格、币种与条款将按当前审阅版本一次冻结。</div><DetailGrid items={[{ label: "报价版本", value: `V${quote.version}` }, { label: "客户资料版本", value: `V${quote.sourceVersions.customerVersion}` }, { label: "公司资料版本", value: `V${quote.sourceVersions.companyProfileVersion}` }, { label: "报价总额", value: formatMoney(quote.totalAmount, quote.currency) }]} /><div className="form-actions"><button className="btn" type="button" disabled={submitCommand.pending} onClick={() => setSubmitOpen(false)}>继续检查</button><button className="btn btn-primary" type="button" disabled={submitCommand.pending} onClick={() => void submitQuote()}>{submitCommand.pending ? "提交中…" : "确认提交并冻结"}</button></div></Modal> : null}
    {confirmOpen ? <Modal title="登记客户确认" onClose={() => { if (!confirmCommand.pending) setConfirmOpen(false); }}><form onSubmit={recordConfirmation}><p className="readonly-hint">登记客户对提交冻结版本的实际确认，不代表主管审批。附件上传不在首切片范围内。</p><div className="form-item"><label className="required" htmlFor="confirm-method">确认方式</label><input id="confirm-method" className="input" required maxLength={100} placeholder="如 邮件确认、盖章报价单" value={confirmation.method} onChange={(e) => setConfirmation({ ...confirmation, method: e.target.value })} /></div><div className="form-item"><label className="required" htmlFor="confirm-date">业务确认日期</label><input id="confirm-date" className="input" type="date" required min={quote.quoteDate} max={quote.validUntil ?? undefined} value={confirmation.confirmedOn} onChange={(e) => setConfirmation({ ...confirmation, confirmedOn: e.target.value })} /></div><div className="form-item"><label className="required" htmlFor="confirm-note">确认说明</label><textarea id="confirm-note" className="textarea" required maxLength={2000} placeholder="记录客户确认内容与核对信息" value={confirmation.note} onChange={(e) => setConfirmation({ ...confirmation, note: e.target.value })} /></div><ErrorPanel error={error} /><div className="form-actions"><button className="btn" type="button" disabled={confirmCommand.pending} onClick={() => setConfirmOpen(false)}>取消</button><button className="btn btn-primary" type="submit" disabled={confirmCommand.pending}>{confirmCommand.pending ? "登记中…" : "登记确认"}</button></div></form></Modal> : null}
    {orderOpen ? <Modal title="由已确认报价生成订单" onClose={() => { if (!orderCommand.pending) setOrderOpen(false); }}><form onSubmit={createOrder}><div className="warn-box">订单将逐值复制已确认交易快照。每个报价至多生成一张订单；交期不同不能重复成单。</div><div className="form-item"><label className="required" htmlFor="delivery-date">交货日期</label><input id="delivery-date" className="input" type="date" required min={quote.customerConfirmation?.confirmedOn} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div><ErrorPanel error={error} /><div className="form-actions"><button className="btn" type="button" disabled={orderCommand.pending} onClick={() => setOrderOpen(false)}>取消</button><button className="btn btn-primary" type="submit" disabled={orderCommand.pending}>{orderCommand.pending ? "生成中…" : "生成唯一订单"}</button></div></form></Modal> : null}
  </>;
}
