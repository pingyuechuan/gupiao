import axios, { type AxiosInstance } from 'axios';

/** 通用 HTTP 实例（默认相对路径，经 Vite 代理访问公开行情接口） */
export const http: AxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const req = error.config;
    if (req) {
      console.error(`[http] ${req.method?.toUpperCase() || 'GET'} ${req.url} failed:`, error.message);
    }
    return Promise.reject(error);
  },
);

/** 把可能为字符串/数字的值转成 number，失败返回 NaN */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return NaN;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/** 安全字符串 */
export function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}
