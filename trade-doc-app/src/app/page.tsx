"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth";
import { EmptyState, ErrorPanel, LoadingState, PageHeader, StatusTag } from "@/components/ui";
import type { Customer, Inquiry, Order, Page, Quote } from "@/lib/contracts";
import { businessNo, formatMoney, roleLabels } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

export default function HomePage() {
  const { user } = useAuth();
  const customers = useResource<Page<Customer>>("/customers?page=1&pageSize=1&q=");
  const inquiries = useResource<Page<Inquiry>>("/inquiries?page=1&pageSize=5&q=");
  const quotes = useResource<Page<Quote>>("/quotes?page=1&pageSize=5&q=");
  const orders = useResource<Page<Order>>("/orders?page=1&pageSize=5&q=");
  const error = customers.error ?? inquiries.error ?? quotes.error ?? orders.error;
  const loading = !customers.data && !inquiries.data && !quotes.data && !orders.data && (customers.loading || inquiries.loading || quotes.loading || orders.loading);
  const awaiting = quotes.data?.items.filter((quote) => quote.status === "AWAITING_CUSTOMER").length ?? 0;
  const following = inquiries.data?.items.filter((inquiry) => inquiry.status === "FOLLOWING").length ?? 0;

  return <>
    <PageHeader title="工作台" description={`${user ? `${user.displayName} · ${roleLabels[user.role]}` : ""}。从当前待办进入业务，所有数据来自服务端实时读取。`} />
    <ErrorPanel error={error} onRetry={() => { customers.refresh(); inquiries.refresh(); quotes.refresh(); orders.refresh(); }} />
    {loading ? <LoadingState /> : <>
      <section className="dashboard-metrics" aria-label="业务概览">
        <Link className="stat-card" href="/customers"><span className="sc-label">客户总数</span><strong className="sc-value">{customers.data?.total ?? "—"}</strong><span className="sc-foot">{user?.role === "boss" ? "全部授权客户" : "本人客户"}</span></Link>
        <Link className="stat-card accent-orange" href="/inquiries"><span className="sc-label">最近询盘待报价</span><strong className="sc-value">{following}</strong><span className="sc-foot">最近 {inquiries.data?.items.length ?? 0} 条中的跟进记录</span></Link>
        <Link className="stat-card accent-blue" href="/quotes"><span className="sc-label">最近待客户确认</span><strong className="sc-value">{awaiting}</strong><span className="sc-foot">报价总数 {quotes.data?.total ?? "—"}</span></Link>
        <Link className="stat-card accent-green" href="/orders"><span className="sc-label">订单总数</span><strong className="sc-value">{orders.data?.total ?? "—"}</strong><span className="sc-foot">由已确认报价唯一生成</span></Link>
      </section>
      <div className="dash-grid">
        <div className="dash-main">
          <section className="card recent-orders">
            <div className="home-card-head"><div><h2>最近订单</h2><p>订单、单证与收款进度分别跟踪</p></div><Link className="home-text-link" href="/orders">全部订单 →</Link></div>
            {orders.data?.items.length ? (
              <div className="table-wrap"><table className="table"><thead><tr><th>订单</th><th>客户</th><th>交期</th><th className="num">金额</th><th>进度</th></tr></thead><tbody>
                {orders.data.items.map((order) => (
                  <tr key={order.id}>
                    <td><Link href={"/orders/" + order.id}>{businessNo(order)}</Link></td>
                    <td>{order.trade.customer.nameCn}</td><td>{order.deliveryDate}</td>
                    <td className="num">{formatMoney(order.trade.totalAmount, order.trade.currency)}</td>
                    <td><div className="table-actions"><StatusTag tone="orange">待执行</StatusTag><StatusTag tone="blue">单证未开始</StatusTag></div></td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <EmptyState title="暂无订单" description="完成报价确认后，即可生成首张订单。" />}
          </section>
        </div>
        <aside className="dash-side"><section className="card"><h2 className="card-title">业务入口</h2><div className="shortcut-list">{user?.role === "sales" ? <><Link className="shortcut-link" href="/customers/new">新建客户 <span>→</span></Link><Link className="shortcut-link" href="/inquiries/new">记录新询盘 <span>→</span></Link></> : null}<Link className="shortcut-link" href="/inquiries">查看询盘与来源快照 <span>→</span></Link><Link className="shortcut-link" href="/quotes">处理报价与客户确认 <span>→</span></Link></div></section><section className="card workflow-note"><h2 className="card-title">首切片边界</h2><p>报价提交后不可修订；订单只读，不提供直接新建、进度推进、单证制作或收款写入。</p><p>页面按钮仅用于操作体验，实际权限、归属、金额、状态和事务均由服务端执行。</p></section></aside>
      </div>
    </>}
  </>;
}
