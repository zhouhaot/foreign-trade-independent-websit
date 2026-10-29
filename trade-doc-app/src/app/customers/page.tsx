"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth";
import { EmptyState, ErrorPanel, LoadingState, PageHeader, Pagination, SearchBar } from "@/components/ui";
import type { Customer } from "@/lib/contracts";
import { usePagedResource } from "@/lib/use-resource";

export default function CustomersPage() {
  const { user } = useAuth();
  const resource = usePagedResource<Customer>("/customers");
  const page = resource.data;

  return <>
    <PageHeader title="客户" description={user?.role === "boss" ? "查看全部客户资料。主管账号为只读。" : "维护本人客户资料，历史交易快照不受资料修改影响。"}>
      {user?.role === "sales" ? <Link className="btn btn-primary" href="/customers/new">新建客户</Link> : null}
    </PageHeader>
    <SearchBar value={resource.query} onChange={resource.setQuery} onSearch={resource.search} onReset={resource.reset} placeholder="搜索客户名称、国家或联系人" />
    {resource.error ? <ErrorPanel error={resource.error} onRetry={resource.refresh} /> : null}
    {resource.loading && !page ? <LoadingState /> : <div className="table-card">
      <div className="table-wrap"><table className="table"><thead><tr><th>客户</th><th>国家或地区</th><th>联系人</th><th>联系方式</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>{page?.items.map((customer) => <tr key={customer.id}><td><Link className="table-primary" href={`/customers/${customer.id}`}>{customer.nameCn}</Link><span className="cell-secondary">{customer.nameEn}</span></td><td>{customer.country}</td><td>{customer.contact}</td><td>{customer.email || customer.phone || "—"}</td><td className="cell-date">{customer.updatedAt.slice(0, 10)}</td><td><Link className="btn btn-sm" href={`/customers/${customer.id}`}>{user?.role === "sales" ? "查看 / 编辑" : "查看"}</Link></td></tr>)}</tbody>
      </table></div>
      {page?.items.length === 0 ? <EmptyState title={resource.appliedQuery ? "没有符合条件的客户" : "暂无客户"} description={resource.appliedQuery ? "调整关键字后重新查询。" : "新建客户后即可记录询盘。"} action={!resource.appliedQuery && user?.role === "sales" ? <Link className="btn btn-primary" href="/customers/new">新建客户</Link> : null} /> : null}
      {page ? <Pagination page={page.page} totalPages={page.totalPages} total={page.total} onChange={resource.setPage} /> : null}
    </div>}
  </>;
}
