"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { OrderProgress, QuoteItemsTable } from "@/components/trade";
import { BackLink, DetailGrid, ErrorPanel, LoadingState, PageHeader } from "@/components/ui";
import type { Order } from "@/lib/contracts";
import { businessNo, formatDateTime, formatMoney } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const resource = useResource<Order>(`/orders/${id}`);
  const order = resource.data;
  if (resource.loading && !order) return <LoadingState />;
  if (resource.error && !order) return <><BackLink href="/orders" /><ErrorPanel error={resource.error} onRetry={resource.refresh} /></>;
  if (!order) return null;

  return <><BackLink href="/orders" /><PageHeader title={`订单 ${businessNo(order)}`} description={`创建于 ${formatDateTime(order.createdAt)} · 订单版本 V${order.version}`}><Link className="btn" href={`/quotes/${order.sourceQuoteId}`}>查看来源报价</Link></PageHeader>
    <section className="order-head-card"><div className="order-head-top"><div><div className="oh-title">{order.trade.customer.nameCn}</div><div className="oh-sub"><span>交货日期 {order.deliveryDate}</span><span>来源确认快照 V{order.sourceQuoteSnapshotVersion}</span><span>交期不可通过重复成单覆盖</span></div></div><strong className="order-total">{formatMoney(order.trade.totalAmount, order.trade.currency)}</strong></div><OrderProgress order={order} /></section>
    <section className="card"><h2 className="card-title">成交条款 <span className="sub">不可变交易快照</span></h2><DetailGrid items={[{ label: "卖方", value: order.trade.seller.legalName }, { label: "客户", value: order.trade.customer.nameCn }, { label: "报价日期", value: order.trade.quoteDate }, { label: "有效期至", value: order.trade.validUntil }, { label: "贸易条款", value: order.trade.tradeTerm }, { label: "付款条款", value: order.trade.paymentTerm }, { label: "订单备注", value: order.trade.remark || "—" }, { label: "快照冻结时间", value: formatDateTime(order.trade.frozenAt) }]} /></section>
    <section className="card"><h2 className="card-title">订单明细 <span className="sub total-amount">{formatMoney(order.trade.totalAmount, order.trade.currency)}</span></h2><QuoteItemsTable items={order.trade.items} currency={order.trade.currency} /></section>
    <section className="card"><h2 className="card-title">关联信息</h2><DetailGrid items={[{ label: "来源报价", value: <Link href={`/quotes/${order.sourceQuoteId}`}>{order.sourceQuoteId}</Link> }, { label: "客户确认记录", value: <code>{order.customerConfirmationId}</code> }, { label: "来源快照版本", value: `V${order.sourceQuoteSnapshotVersion}` }, { label: "最后更新", value: formatDateTime(order.updatedAt) }]} /><p className="readonly-hint">首切片只提供订单创建与读取。后续执行、单证制作和收款登记均不在当前接口范围内。</p></section>
  </>;
}
