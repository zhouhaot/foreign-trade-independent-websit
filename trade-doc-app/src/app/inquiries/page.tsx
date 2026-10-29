"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth";
import { ProductCatalog } from "@/components/product-catalog";
import { EmptyState, ErrorPanel, LoadingState, PageHeader, Pagination, SearchBar, StatusTag } from "@/components/ui";
import type { Currency, Inquiry } from "@/lib/contracts";
import { businessNo, inquiryStatusLabels } from "@/lib/format";
import { usePagedResource, useResource } from "@/lib/use-resource";

export default function InquiriesPage() {
  const { user } = useAuth();
  const resource = usePagedResource<Inquiry>("/inquiries");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const currencies = useResource<{ items: Currency[] }>(catalogOpen ? "/reference/currencies" : null);
  const page = resource.data;
  return <>
    <PageHeader title="询盘" description="记录客户需求并捕获商品版本与明细快照，再由此起草唯一首份报价。"><button className="btn" type="button" onClick={() => setCatalogOpen(true)}>商品目录</button>{user?.role === "sales" ? <Link className="btn btn-primary" href="/inquiries/new">新建询盘</Link> : null}</PageHeader>
    <SearchBar value={resource.query} onChange={resource.setQuery} onSearch={resource.search} onReset={resource.reset} placeholder="搜索询盘编号、来源或需求内容" />
    <ErrorPanel error={resource.error} onRetry={resource.refresh} />
    {resource.loading && !page ? <LoadingState /> : <div className="table-card"><div className="table-wrap"><table className="table"><thead><tr><th>询盘编号</th><th>询盘日期</th><th>来源</th><th>需求摘要</th><th>明细</th><th>状态</th><th>操作</th></tr></thead><tbody>{page?.items.map((inquiry) => <tr key={inquiry.id}><td><Link className="table-primary" href={`/inquiries/${inquiry.id}`}>{businessNo(inquiry)}</Link></td><td>{inquiry.inquiryDate}</td><td>{inquiry.source}</td><td className="message-cell">{inquiry.message}</td><td>{inquiry.items.length} 项</td><td><StatusTag tone={inquiry.status === "QUOTED" ? "green" : "orange"}>{inquiryStatusLabels[inquiry.status]}</StatusTag></td><td><Link className="btn btn-sm" href={`/inquiries/${inquiry.id}`}>查看详情</Link></td></tr>)}</tbody></table></div>{page?.items.length === 0 ? <EmptyState title={resource.appliedQuery ? "没有符合条件的询盘" : "暂无询盘"} description="从客户需求开始，选择本人客户和共用商品。" action={!resource.appliedQuery && user?.role === "sales" ? <Link className="btn btn-primary" href="/inquiries/new">新建询盘</Link> : null} /> : null}{page ? <Pagination page={page.page} totalPages={page.totalPages} total={page.total} onChange={resource.setPage} /> : null}</div>}
    {catalogOpen ? <ProductCatalog currencies={currencies.data?.items ?? []} onClose={() => setCatalogOpen(false)} /> : null}
  </>;
}
