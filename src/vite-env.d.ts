/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PROVIDER?: 'eastmoney' | 'sina' | 'tencent' | 'akshare' | 'tonghuashun';
  readonly VITE_AKSHARE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
