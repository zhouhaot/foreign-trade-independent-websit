"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CustomerInput } from "@/lib/contracts";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { ErrorPanel } from "./ui";

export const emptyCustomer: CustomerInput = {
  nameCn: "",
  nameEn: "",
  country: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  remark: "",
};

export function CustomerForm({ initial, submitLabel, pending, error, onSubmit, onCancel }: {
  initial: CustomerInput;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (value: CustomerInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const dirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(initial), [initial, value]);
  useUnsavedGuard(dirty && !pending);

  const update = (field: keyof CustomerInput, next: string) => setValue((current) => ({ ...current, [field]: next }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ ...value, nameCn: value.nameCn.trim(), nameEn: value.nameEn.trim(), country: value.country.trim(), contact: value.contact.trim(), address: value.address.trim(), email: value.email.trim(), phone: value.phone.trim() });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid cols-2">
        <div className="form-item"><label className="required" htmlFor="customer-name-cn">客户中文名</label><input id="customer-name-cn" className="input" required maxLength={200} value={value.nameCn} onChange={(e) => update("nameCn", e.target.value)} /></div>
        <div className="form-item"><label className="required" htmlFor="customer-name-en">客户英文名</label><input id="customer-name-en" className="input" required maxLength={200} value={value.nameEn} onChange={(e) => update("nameEn", e.target.value)} /></div>
        <div className="form-item"><label className="required" htmlFor="customer-country">国家或地区</label><input id="customer-country" className="input" required maxLength={100} value={value.country} onChange={(e) => update("country", e.target.value)} /></div>
        <div className="form-item"><label className="required" htmlFor="customer-contact">联系人</label><input id="customer-contact" className="input" required maxLength={100} value={value.contact} onChange={(e) => update("contact", e.target.value)} /></div>
        <div className="form-item"><label htmlFor="customer-email">电子邮箱</label><input id="customer-email" className="input" type="email" maxLength={254} value={value.email} onChange={(e) => update("email", e.target.value)} /></div>
        <div className="form-item"><label htmlFor="customer-phone">联系电话</label><input id="customer-phone" className="input" type="tel" maxLength={50} value={value.phone} onChange={(e) => update("phone", e.target.value)} /></div>
        <div className="form-item span-2"><label className="required" htmlFor="customer-address">地址</label><textarea id="customer-address" className="textarea" required maxLength={1000} value={value.address} onChange={(e) => update("address", e.target.value)} /></div>
        <div className="form-item span-2"><label htmlFor="customer-remark">备注</label><textarea id="customer-remark" className="textarea" maxLength={2000} value={value.remark} onChange={(e) => update("remark", e.target.value)} /></div>
      </div>
      <ErrorPanel error={error} />
      <div className="form-actions"><span className={`draft-status ${dirty ? "has-changes" : ""}`}>{dirty ? "有未保存的修改" : "所有修改已保存"}</span><button className="btn" type="button" disabled={pending} onClick={() => { if (!dirty || window.confirm("客户资料尚未保存，确定离开吗？")) onCancel(); }}>取消</button><button className="btn btn-primary" type="submit" disabled={pending || !dirty}>{pending ? "保存中…" : submitLabel}</button></div>
    </form>
  );
}
