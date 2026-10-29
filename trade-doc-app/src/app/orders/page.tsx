"use client";

import Link from "next/link";
import { EmptyState, ErrorPanel, LoadingState, PageHeader, Pagination, SearchBar, StatusTag } from "@/components/ui";
import type { Order } from "@/lib/contracts";
import { businessNo, formatMoney } from "@/lib/format";
import { usePagedResource } from "@/lib/use-resource";

export default function OrdersPage() {
  const resource = usePagedResource<Order>("/orders");
  const page = resource.data;
  return <>
    <PageHeader title="订单" description="订单只能由已确认报价生成。订单、单证、收款三项进度独立展示，首切片不提供推进或取消。" />
    <SearchBar value={resource.query} onChange={resource.setQuery} onSearch={resource.search} onReset={resource.reset} placeholder="搜索订单编号、客户或来源报价" />
    <ErrorPanel error={resource.error} onRetry={resource.refresh} />
    {resource.loading && !page ? <LoadingState /> : <div className="table-card"><div className="table-wrap"><table className="table order-table"><thead><tr><th>订单编号</th><th>客户</th><th>交货日期</th><th className="num">订单金额</th><th>订单进度</th><th>单证进度</th><th>收款进度</th><th>操作</th></tr></thead><tbody>{page?.items.map((order) => <tr key={order.id}><td><Link className="table-primary" href={`/orders/${order.id}`}>{businessNo(order)}</Link><span className="cell-secondary">来源快照 V{order.sourceQuoteSnapshotVersion}</span></td><td>{order.trade.customer.nameCn}<span className="cell-secondary">{order.trade.customer.country}</span></td><td>{order.deliveryDate}</td><td className="num">{formatMoney(order.trade.totalAmount, order.trade.currency)}</td><td><StatusTag tone="orange">待执行</StatusTag></td><td><StatusTag tone="blue">未开始</StatusTag></td><td><StatusTag tone="orange">未收款</StatusTag></td><td><Link className="btn btn-sm" href={`/orders/${order.id}`}>查看订单</Link></td></tr>)}</tbody></table></div>{page?.items.length === 0 ? <EmptyState title={resource.appliedQuery ? "没有符合条件的订单" : "暂无订单"} description="先完成报价提交与客户确认，再从报价生成唯一订单。" action={!resource.appliedQuery ? <Link className="btn btn-primary" href="/quotes">前往报价</Link> : null} /> : null}{page ? <Pagination page={page.page} totalPages={page.totalPages} total={page.total} onChange={resource.setPage} /> : null}</div>}
  </>;
}
