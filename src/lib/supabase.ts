import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 客户端（V0.8 仅用于 Auth，不含任何业务表）。
 *
 * 未配置环境变量时返回 null，AuthGate 会自动放行 ——
 * 保证本地开发无需 Supabase 也能跑起来，不破坏既有开发体验。
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'phoenix-auth',
      },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[supabase] 未配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，已跳过登录门禁（仅本地开发）。',
  );
}

/** 把 Supabase 英文报错转成用户能看懂的中文 */
export function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '邮箱或密码不正确';
  if (m.includes('user already registered')) return '该邮箱已注册，请直接登录';
  if (m.includes('password should be at least')) return '密码至少需要 6 位';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return '邮箱格式不正确';
  if (m.includes('email not confirmed')) return '邮箱尚未验证，请查收验证邮件后再登录';
  if (m.includes('rate limit') || m.includes('too many')) return '操作过于频繁，请稍后再试';
  if (m.includes('failed to fetch') || m.includes('network')) return '网络连接失败，请检查网络后重试';
  return message;
}
