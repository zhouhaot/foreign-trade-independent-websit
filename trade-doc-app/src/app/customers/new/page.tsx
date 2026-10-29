"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth";
import { CustomerForm, emptyCustomer } from "@/components/customer-form";
import { BackLink, PageHeader } from "@/components/ui";
import type { Customer, CustomerInput } from "@/lib/contracts";
import { useCommand } from "@/lib/use-resource";

export default function NewCustomerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { execute, pending } = useCommand();
  const [error, setError] = useState<unknown>(null);

  if (user?.role !== "sales") return <section className="forbidden"><h1>当前账号不能新建客户</h1><p>只有外贸业务员可以创建本人客户。</p></section>;

  const submit = async (value: CustomerInput) => {
    setError(null);
    try {
      const customer = await execute<Customer>("/customers", "POST", value);
      router.push(`/customers/${customer.id}`);
    } catch (reason) { setError(reason); }
  };

  return <><BackLink href="/customers" /><PageHeader title="新建客户" description="客户归属由服务端根据当前登录账号确定，不需要也不能指定归属人。" /><section className="card customer-register"><CustomerForm initial={emptyCustomer} submitLabel="创建客户" pending={pending} error={error} onSubmit={submit} onCancel={() => router.push("/customers")} /></section></>;
}
