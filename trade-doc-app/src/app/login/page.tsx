"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth";
import { ErrorPanel, LoadingState } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!loading && user) {
      const requested = new URLSearchParams(window.location.search).get("next");
      const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
      router.replace(next);
    }
  }, [loading, router, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await login(username, password);
      const requested = new URLSearchParams(window.location.search).get("next");
      router.replace(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/");
    } catch (reason) { setError(reason); setPending(false); }
  };

  if (loading) return <main className="boot-screen"><LoadingState label="正在检查登录状态" /></main>;

  return <main className="login-page">
    <section className="login-story" aria-label="业务流程">
      <div className="login-brand"><span className="login-brand-mark">外</span><span>外贸协同</span></div>
      <div className="login-story-content"><h1 className="login-story-title">从客户需求，<br />到可追溯的订单。</h1><p className="login-story-description">客户、询盘、报价与订单共用一条业务链。关键版本逐次核对，成交内容一次冻结，让每一次确认都有据可查。</p>
        <div className="login-flow"><div className="login-flow-main"><span>客户需求</span><i>→</i><span>询盘</span><i>→</i><span>报价确认</span><i>→</i><strong>生成订单</strong></div><div className="login-flow-branches"><span>单证进度独立</span><span>收款进度独立</span></div></div>
      </div>
      <div className="login-story-foot"><span className="login-local-dot" />真实账号与数据库会话</div>
    </section>
    <section className="login-panel"><div className="login-box"><h2>登录工作区</h2><p className="sub-title">使用已开通的公司账号登录，岗位由服务端身份确定。</p><form onSubmit={submit}>
      <div className="form-item"><label className="required" htmlFor="login-username">账号</label><input id="login-username" className="input" name="username" autoComplete="username" autoFocus required maxLength={100} value={username} onChange={(e) => setUsername(e.target.value)} /></div>
      <div className="form-item"><label className="required" htmlFor="login-password">密码</label><input id="login-password" className="input" name="password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <ErrorPanel error={error} />
      <button className="btn btn-primary login-btn" type="submit" disabled={pending || !username || !password}>{pending ? "正在验证…" : "登录"}</button>
    </form><p className="login-tip">登录、退出及业务写入均受 CSRF 保护。连续失败可能触发限流，请按提示稍后重试。</p></div></section>
  </main>;
}
