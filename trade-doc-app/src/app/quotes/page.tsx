"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth";
import { EmptyState, ErrorPanel, LoadingState, PageHeader, Pagination, SearchBar, StatusTag } from "@/components/ui";
import type { Quote } from "@/lib/contracts";
import { businessNo, formatMoney, quoteStatusLabels } from "@/lib/format";
import { usePagedResource } from "@/lib/use-resource";

const tones = { DRAFT: "gray", AWAITING_CUSTOMER: "orange", CONFIRMED: "green" } as const;

export default function QuotesPage() {
  const { user } = useAuth();
  const resource = usePagedResource<Quote>("/quotes");
  const page = resource.data;
  return <>
    <PageHeader title="报价" description="报价从询盘起草。提交后交易快照冻结，确认与成单只沿用该版本。" />
    <SearchBar value={resource.query} onChange={resource.setQuery} onSearch={resource.search} onReset={resource.reset} placeholder="搜索报价编号、客户或条款" />
    <ErrorPanel error={resource.error} onRetry={resource.refresh} />
    {resource.loading && !page ? <LoadingState /> : <div className="table-card"><div className="table-wrap"><table className="table"><thead><tr><th>报价编号</th><th>客户</th><th>报价日期</th><th>有效期至</th><th className="num">报价总额</th><th>状态</th><th>操作</th></tr></thead><tbody>{page?.items.map((quote) => <tr key={quote.id}><td><Link className="table-primary" href={`/quotes/${quote.id}`}>{businessNo(quote)}</Link>{quote.orderId ? <span className="cell-secondary">已生成订单</span> : null}</td><td>{quote.customerSnapshot.nameCn}<span className="cell-secondary">{quote.customerSnapshot.country}</span></td><td>{quote.quoteDate}</td><td>{quote.validUntil ?? "未填写"}</td><td className="num">{formatMoney(quote.totalAmount, quote.currency)}</td><td><StatusTag tone={tones[quote.status]}>{quoteStatusLabels[quote.status]}</StatusTag></td><td><Link className="btn btn-sm" href={`/quotes/${quote.id}`}>{quote.status === "DRAFT" && user?.role === "sales" ? "编辑草稿" : "查看详情"}</Link></td></tr>)}</tbody></table></div>{page?.items.length === 0 ? <EmptyState title={resource.appliedQuery ? "没有符合条件的报价" : "暂无报价"} description="报价只能从跟进中的询盘起草，不能直接凭空新建。" action={!resource.appliedQuery && user?.role === "sales" ? <Link className="btn btn-primary" href="/inquiries">前往询盘</Link> : null} /> : null}{page ? <Pagination page={page.page} totalPages={page.totalPages} total={page.total} onChange={resource.setPage} /> : null}</div>}
  </>;
}
