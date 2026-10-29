import Link from "next/link";
import type { Order, QuoteItem, TradeSnapshotItem } from "@/lib/contracts";
import { formatMoney } from "@/lib/format";
import { StatusTag } from "./ui";

export function QuoteItemsTable({ items, currency }: { items: Array<QuoteItem | TradeSnapshotItem>; currency: string }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>行号</th><th>商品</th><th>规格</th><th className="num">数量</th><th className="num">成交单价</th><th className="num">行金额</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.lineNo}>
          <td>{item.lineNo}</td>
          <td><strong>{item.product.nameCn}</strong><span className="cell-secondary">{item.product.sku} · {item.product.nameEn}</span></td>
          <td>{item.product.spec || "—"}</td>
          <td className="num">{item.quantity} {item.product.unit}</td>
          <td className="num">{item.unitPrice === null ? "待定价" : formatMoney(item.unitPrice, currency)}</td>
          <td className="num">{formatMoney(item.lineAmount, currency)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

export function OrderProgress({ order }: { order: Order }) {
  return (
    <section className="progress-triple" aria-label="订单三项独立进度">
      <div className="pt-block track-order"><div className="pt-label"><span>订单进度</span><StatusTag tone="orange">{order.orderProgress === "PENDING_EXECUTION" ? "待执行" : order.orderProgress}</StatusTag></div><p>订单已建立，等待后续执行。首切片不提供订单推进。</p></div>
      <div className="pt-block track-doc"><div className="pt-label"><span>单证进度</span><StatusTag tone="blue">{order.documentProgress === "NOT_STARTED" ? "未开始" : order.documentProgress}</StatusTag></div><p>单证流程独立，不受订单执行或收款状态阻塞。</p></div>
      <div className="pt-block track-pay"><div className="pt-label"><span>收款进度</span><StatusTag tone="orange">{order.paymentProgress === "UNPAID" ? "未收款" : order.paymentProgress}</StatusTag></div><p>收款流程独立。首切片不开放收款登记。</p></div>
    </section>
  );
}

export function QuoteOrderLink({ orderId }: { orderId: string }) {
  return <Link className="btn" href={`/orders/${orderId}`}>查看关联订单</Link>;
}
