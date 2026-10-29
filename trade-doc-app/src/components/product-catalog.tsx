"use client";

import { useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Currency, Product, ProductInput } from "@/lib/contracts";
import { formatMoney } from "@/lib/format";
import { useCommand, useResource } from "@/lib/use-resource";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { useAuth } from "./auth";
import { EmptyState, ErrorPanel, LoadingState, Modal, StatusTag } from "./ui";

const emptyProduct: ProductInput = { sku: "", nameCn: "", nameEn: "", spec: "", unit: "", refPrice: "", currency: "", hsCode: "", remark: "" };

function ProductEditor({ product, currencies, onClose, onSaved }: { product: Product | "new"; currencies: Currency[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const original = product === "new" ? null : product;
  const initial = useMemo(() => original ? { sku: original.sku, nameCn: original.nameCn, nameEn: original.nameEn, spec: original.spec, unit: original.unit, refPrice: original.refPrice, currency: original.currency, hsCode: original.hsCode, remark: original.remark } : { ...emptyProduct, currency: currencies[0]?.code ?? "" }, [currencies, original]);
  const [value, setValue] = useState<ProductInput>(initial);
  const [enabled, setEnabled] = useState(original?.enabled ?? true);
  const [error, setError] = useState<unknown>(null);
  const { execute, pending } = useCommand();
  const dirty = JSON.stringify(value) !== JSON.stringify(initial) || enabled !== (original?.enabled ?? true);
  useUnsavedGuard(dirty && !pending);

  if (original && user?.role !== "sales") {
    const details = [
      ["SKU", original.sku], ["中文名称", original.nameCn], ["英文名称", original.nameEn],
      ["规格", original.spec || "—"], ["单位", original.unit], ["参考价", formatMoney(original.refPrice, original.currency)],
      ["HS Code", original.hsCode || "—"], ["目录状态", original.enabled ? "启用" : "停用"],
      ["当前版本", `V${original.version}`], ["备注", original.remark || "—"],
    ];
    return <Modal title={`商品 ${original.sku}`} onClose={onClose} wide><p className="readonly-hint">主管只读视图。商品详情通过独立详情接口读取。</p><dl className="desc-grid">{details.map(([label, detail]) => <div className="di" key={label}><dt>{label}</dt><dd>{detail}</dd></div>)}</dl><div className="form-actions"><button className="btn" type="button" onClick={onClose}>关闭</button></div></Modal>;
  }

  const close = () => {
    if (!dirty || window.confirm("商品信息尚未保存，确定关闭吗？")) onClose();
  };
  const update = (field: keyof ProductInput, next: string) => setValue((current) => ({ ...current, [field]: next }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (original) await execute(`/products/${original.id}`, "PUT", { expectedVersion: original.version, ...value, enabled });
      else await execute("/products", "POST", value);
      onSaved();
    } catch (reason) { setError(reason); }
  };

  return <Modal title={original ? `编辑商品 ${original.sku}` : "新建共用商品"} onClose={close} wide>
    <form onSubmit={submit}>
      <p className="readonly-hint">商品为公司共用目录。创建或修改不会改变既有询盘、报价和订单中的商品快照。</p>
      <div className="form-grid cols-2">
        <div className="form-item"><label className="required" htmlFor="product-sku">SKU</label><input id="product-sku" className="input" required maxLength={64} value={value.sku} onChange={(e) => update("sku", e.target.value)} /></div>
        <div className="form-item"><label className="required" htmlFor="product-unit">单位</label><input id="product-unit" className="input" required maxLength={30} value={value.unit} onChange={(e) => update("unit", e.target.value)} placeholder="如 PCS、SET" /></div>
        <div className="form-item"><label className="required" htmlFor="product-name-cn">中文名称</label><input id="product-name-cn" className="input" required maxLength={200} value={value.nameCn} onChange={(e) => update("nameCn", e.target.value)} /></div>
        <div className="form-item"><label className="required" htmlFor="product-name-en">英文名称</label><input id="product-name-en" className="input" required maxLength={200} value={value.nameEn} onChange={(e) => update("nameEn", e.target.value)} /></div>
        <div className="form-item"><label className="required" htmlFor="product-price">参考价</label><input id="product-price" className="input" required inputMode="decimal" pattern="(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,2})?" value={value.refPrice} onChange={(e) => update("refPrice", e.target.value)} /><small>最多两位小数，参考价不代替成交价。</small></div>
        <div className="form-item"><label className="required" htmlFor="product-currency">参考价币种</label><select id="product-currency" className="select" required value={value.currency} onChange={(e) => update("currency", e.target.value)}><option value="">请选择启用币种</option>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.displayName}</option>)}</select></div>
        <div className="form-item"><label htmlFor="product-hs">HS Code</label><input id="product-hs" className="input" maxLength={30} value={value.hsCode} onChange={(e) => update("hsCode", e.target.value)} /></div>
        {original ? <div className="form-item"><label htmlFor="product-enabled">目录状态</label><select id="product-enabled" className="select" value={enabled ? "enabled" : "disabled"} onChange={(e) => setEnabled(e.target.value === "enabled")}><option value="enabled">启用</option><option value="disabled">停用</option></select></div> : null}
        <div className="form-item span-2"><label htmlFor="product-spec">规格</label><textarea id="product-spec" className="textarea" maxLength={1000} value={value.spec} onChange={(e) => update("spec", e.target.value)} /></div>
        <div className="form-item span-2"><label htmlFor="product-remark">备注</label><textarea id="product-remark" className="textarea" maxLength={2000} value={value.remark} onChange={(e) => update("remark", e.target.value)} /></div>
      </div>
      <ErrorPanel error={error} />
      <div className="form-actions"><button className="btn" type="button" disabled={pending} onClick={close}>取消</button><button className="btn btn-primary" type="submit" disabled={pending || !dirty || currencies.length === 0}>{pending ? "保存中…" : original ? "保存商品" : "创建商品"}</button></div>
    </form>
  </Modal>;
}

export function ProductCatalog({ currencies, onSelect, onClose }: { currencies: Currency[]; onSelect?: (product: Product) => void; onClose: () => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const resource = useResource<{ items: Product[] }>(`/products?page=1&pageSize=100&q=${encodeURIComponent(applied)}`);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const edit = async (id: string) => {
    setActionError(null);
    try { setEditor(await api<Product>(`/products/${id}`)); } catch (reason) { setActionError(reason); }
  };

  if (editor) return <ProductEditor product={editor} currencies={currencies} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); resource.refresh(); }} />;

  return <Modal title="公司商品目录" onClose={onClose} wide>
    <div className="catalog-toolbar"><form className="inline-search" onSubmit={(e) => { e.preventDefault(); setApplied(query.trim()); }}><input className="input" aria-label="搜索商品" maxLength={100} placeholder="搜索 SKU 或商品名称" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="btn" type="submit">查询</button></form>{user?.role === "sales" ? <button className="btn btn-primary" type="button" onClick={() => setEditor("new")}>新建商品</button> : null}</div>
    {currencies.length === 0 && user?.role === "sales" ? <p className="inline-notice">尚未配置启用币种，暂时不能新建商品。</p> : null}
    <ErrorPanel error={resource.error ?? actionError} onRetry={resource.refresh} />
    {resource.loading && !resource.data ? <LoadingState /> : <div className="table-wrap"><table className="table"><thead><tr><th>SKU / 商品</th><th>规格</th><th className="num">参考价</th><th>状态</th><th>操作</th></tr></thead><tbody>{resource.data?.items.map((product) => <tr key={product.id}><td><strong>{product.sku}</strong><span className="cell-secondary">{product.nameCn} · {product.nameEn}</span></td><td>{product.spec || "—"}</td><td className="num">{formatMoney(product.refPrice, product.currency)}</td><td><StatusTag tone={product.enabled ? "green" : "gray"}>{product.enabled ? "启用" : "停用"}</StatusTag></td><td><div className="table-actions">{onSelect && product.enabled ? <button className="btn btn-sm btn-primary" type="button" onClick={() => onSelect(product)}>选择</button> : null}<button className="btn btn-sm" type="button" onClick={() => void edit(product.id)}>{user?.role === "sales" ? "详情 / 编辑" : "详情"}</button></div></td></tr>)}</tbody></table>{resource.data?.items.length === 0 ? <EmptyState title="没有符合条件的商品" description="可调整搜索词，或由业务员新建共用商品。" /> : null}</div>}
  </Modal>;
}
