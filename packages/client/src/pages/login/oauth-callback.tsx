import { exchangeOAuthCode } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuthStore((state) => state.authActions);
  const [error, setError] = useState<string | null>(null);

  const code = useMemo(() => searchParams.get("code"), [searchParams]);
  const redirect = useMemo(() => searchParams.get("redirect") || "/", [searchParams]);

  useEffect(() => {
    if (!code) {
      setError("missing_code");
      return;
    }

    let cancelled = false;
    exchangeOAuthCode(code)
      .then((data) => {
        if (cancelled) return;
        setToken(data.token);
        window.history.replaceState(null, "", window.location.pathname);
        navigate(redirect, { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        setError("invalid_or_expired_code");
      });

    return () => {
      cancelled = true;
    };
  }, [code, redirect, setToken, navigate]);

  if (error) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-6 p-6">
        <p className="text-muted-foreground text-sm">
          {error === "missing_code" ? "缺少授权码" : "授权已失效或已使用，请重新登录"}
        </p>
        <a href="/login" className="text-primary hover:underline">
          返回登录
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col items-center justify-center gap-6 p-6">
      <Loader2 className="text-primary size-10 animate-spin" />
      <p className="text-muted-foreground text-sm">正在登录...</p>
    </div>
  );
};

export { OAuthCallbackPage };
