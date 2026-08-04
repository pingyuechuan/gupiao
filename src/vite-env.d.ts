/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PROVIDER?: 'eastmoney' | 'sina' | 'tencent' | 'akshare' | 'tonghuashun';
  readonly VITE_AKSHARE_BASE_URL?: string;
  /** Supabase 项目地址（V0.8 起用于登录认证） */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon public key（可安全暴露给前端，权限由 RLS 控制） */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
