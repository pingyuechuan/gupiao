import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import LoginPage from '@/pages/LoginPage';

/**
 * 登录门禁：未登录不得进入应用主体。
 * 未配置 Supabase 时直接放行，保证本地开发不被阻断。
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!isSupabaseConfigured) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-radial-glow">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="text-[13px] text-txt-faint">正在恢复登录状态…</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  return <>{children}</>;
}
