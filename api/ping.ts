/**
 * 最小探针 —— 仅用于隔离诊断：验证 Vercel 本项目能否运行任意 serverless 函数。
 * 不 import 任何模块、不使用 res.json() 辅助方法，纯原生 http.ServerResponse。
 * 诊断完成后可删除。
 */
export default function handler(_req: unknown, res: unknown): void {
  const r = res as {
    statusCode: number;
    setHeader: (n: string, v: string) => void;
    end: (b: string) => void;
  };
  r.statusCode = 200;
  r.setHeader('Content-Type', 'application/json; charset=utf-8');
  r.end(JSON.stringify({ ok: true, ping: 'pong', time: new Date().toISOString() }));
}
