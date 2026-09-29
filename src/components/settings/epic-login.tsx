"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EpicLogin({ loginUrl }: { loginUrl: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/epic/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `登录失败（HTTP ${res.status}）`);
        return;
      }
      setCode("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          点击下方按钮，在 Epic 官网登录你的账户（密码只输入在 epicgames.com，不会经过本应用）。
        </li>
        <li>
          登录成功后页面会显示一段 JSON，复制其中 <code className="text-foreground">authorizationCode</code>{" "}
          的值（也可以直接复制整段 JSON）。
        </li>
        <li>粘贴到下面的输入框并提交。授权码只能使用一次，几分钟内有效。</li>
      </ol>

      <Button asChild variant="outline">
        <a href={loginUrl} target="_blank" rel="noreferrer noopener">
          <ExternalLink />
          打开 Epic 登录页
        </a>
      </Button>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="粘贴 authorizationCode"
          autoComplete="off"
          spellCheck={false}
          className="max-w-md font-mono"
        />
        <Button type="submit" disabled={pending || code.trim().length === 0}>
          {pending ? "登录中…" : "提交"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function EpicLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (!confirm("确定退出 Epic 登录？本机保存的 token 会被删除，已同步的游戏数据会保留。")) return;
    setPending(true);
    try {
      await fetch("/api/epic/login", { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={logout} disabled={pending}>
      <LogOut />
      退出 Epic 登录
    </Button>
  );
}
