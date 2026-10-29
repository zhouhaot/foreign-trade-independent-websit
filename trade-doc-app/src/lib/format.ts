import type { Role } from "./contracts";

export const roleLabels: Record<Role, string> = {
  admin: "系统管理员",
  sales: "外贸业务员",
  doc: "单证员",
  fin: "财务人员",
  boss: "业务主管",
};

export const inquiryStatusLabels = {
  FOLLOWING: "跟进中",
  QUOTED: "已报价",
} as const;

export const quoteStatusLabels = {
  DRAFT: "草稿",
  AWAITING_CUSTOMER: "待客户确认",
  CONFIRMED: "已确认",
} as const;

export function formatMoney(amount: string | null, currency: string) {
  if (amount === null) return "待定价";
  const [integer, decimal] = amount.split(".");
  const grouped = (integer ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${grouped}${decimal ? `.${decimal.padEnd(2, "0")}` : ".00"}`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function businessNo(value: { id: string; businessNo?: string }) {
  return value.businessNo ?? value.id.slice(0, 8).toUpperCase();
}

export function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
