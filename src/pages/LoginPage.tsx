import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui';
import BetaBadge from '@/components/aims/BetaBadge';
import { supabase, humanizeAuthError } from '@/lib/supabase';
import { IconArrowRight } from '@/components/layout/icons';

type Mode = 'signin' | 'signup';

/**
 * Beta 登录门禁（V0.8）。
 * 采用邮箱 + 密码而非 Magic Link：Supabase 免费额度内置邮件有严格频控，
 * 邀请测试用户时链接会大面积发不出去，密码登录零邮件依赖、最稳。
 */
export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;

    setError('');
    setNotice('');

    if (!email.trim()) return setError('请输入邮箱');
    if (password.length < 6) return setError('密码至少 6 位');

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        // 若后台开启了邮箱验证，signUp 不会直接返回 session
        if (!data.session) {
          setNotice('注册成功，请到邮箱点击验证链接后再登录。');
          setMode('signin');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
      // 成功后由 onAuthStateChange 驱动跳转，无需手动导航
    } catch (err) {
      setError(humanizeAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-line bg-white/4 px-4 py-3 text-[14.5px] text-txt placeholder:text-txt-faint outline-none transition-colors focus:border-accent/60 focus:bg-accent/5';

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-radial-glow p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-grad text-[22px] font-black text-ink-900">
            AI
          </div>
          <h1 className="text-[22px] font-bold text-txt">Project Phoenix</h1>
          <p className="mt-1 text-[13px] text-txt-dim">你的 AI 投资教练 · 每天告诉你该怎么操作</p>
          <div className="mt-3 flex justify-center">
            <BetaBadge />
          </div>
        </div>

        <GlassCard className="bg-glass-grad">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-white/4 p-1">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-lg py-2 text-[13.5px] font-medium transition-all ${
                  mode === m ? 'bg-accent-grad text-ink-900' : 'text-txt-dim hover:text-txt'
                }`}
              >
                {m === 'signin' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] text-txt-faint">邮箱</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] text-txt-faint">密码</label>
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                className={inputCls}
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key={`e-${error}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg bg-down/10 px-3 py-2 text-[12.5px] text-down"
                >
                  {error}
                </motion.p>
              )}
              {notice && (
                <motion.p
                  key={`n-${notice}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg bg-accent/10 px-3 py-2 text-[12.5px] text-accent"
                >
                  {notice}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent-grad py-3 text-[15px] font-bold text-ink-900 transition-opacity disabled:opacity-50"
            >
              {busy ? '请稍候…' : mode === 'signin' ? '登录' : '注册并开始'}
              {!busy && (
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-txt-faint">
            这是 Beta 内测版本，AI 建议仅供参考，不构成投资建议。
            <br />
            市场有风险，入市需谨慎。
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
