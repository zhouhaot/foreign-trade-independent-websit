"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth";
import { CustomerForm } from "@/components/customer-form";
import { BackLink, DetailGrid, ErrorPanel, LoadingState, PageHeader } from "@/components/ui";
import type { Customer, CustomerInput } from "@/lib/contracts";
import { formatDateTime } from "@/lib/format";
import { useCommand, useResource } from "@/lib/use-resource";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const resource = useResource<Customer>(`/customers/${id}`);
  const { execute, pending } = useCommand();
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const customer = resource.data;
  const initial = useMemo<CustomerInput | null>(() => customer ? { nameCn: customer.nameCn, nameEn: customer.nameEn, country: customer.country, contact: customer.contact, email: customer.email, phone: customer.phone, address: customer.address, remark: customer.remark } : null, [customer]);

  const submit = async (value: CustomerInput) => {
    if (!customer) return;
    setError(null);
    setNotice("");
    try {
      const updated = await execute<Customer>(`/customers/${customer.id}`, "PUT", { expectedVersion: customer.version, ...value });
      resource.setData(updated);
      setNotice("客户资料已保存，版本已更新。");
    } catch (reason) { setError(reason); }
  };

  if (resource.loading && !customer) return <LoadingState />;
  if (resource.error && !customer) return <><BackLink href="/customers" /><ErrorPanel error={resource.error} onRetry={resource.refresh} /></>;
  if (!customer || !initial) return null;
  const readOnly = user?.role !== "sales";

  return <><BackLink href="/customers" /><PageHeader title={customer.nameCn} description={`${customer.nameEn} · 资料版本 V${customer.version}`}>{!readOnly ? <Link className="btn btn-primary" href={`/inquiries/new?customerId=${customer.id}`}>为此客户新建询盘</Link> : null}</PageHeader>
    {notice ? <div className="success-box" role="status">{notice}</div> : null}
    <section className="card"><h2 className="card-title">客户资料 {readOnly ? <span className="sub">主管只读视图</span> : null}</h2>
      {readOnly ? <><DetailGrid items={[{ label: "中文名称", value: customer.nameCn }, { label: "英文名称", value: customer.nameEn }, { label: "国家或地区", value: customer.country }, { label: "联系人", value: customer.contact }, { label: "邮箱", value: customer.email || "—" }, { label: "电话", value: customer.phone || "—" }, { label: "地址", value: customer.address }, { label: "备注", value: customer.remark || "—" }]} /><div className="form-actions"><Link className="btn" href="/customers">返回客户列表</Link></div></> : <CustomerForm initial={initial} submitLabel="保存修改" pending={pending} error={error} onSubmit={submit} onCancel={() => router.push("/customers")} />}
    </section>
    <section className="card"><h2 className="card-title">记录信息</h2><DetailGrid items={[{ label: "客户 ID", value: <code>{customer.id}</code> }, { label: "当前版本", value: `V${customer.version}` }, { label: "创建时间", value: formatDateTime(customer.createdAt) }, { label: "更新时间", value: formatDateTime(customer.updatedAt) }]} /></section>
  </>;
}
