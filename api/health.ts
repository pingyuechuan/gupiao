/**
 * 健康检查 v3 —— 极简版（与 ping.ts 结构完全一致）
 */
export default function handler(req: unknown, res: unknown) {
  const r = res as any;
  r.statusCode = 200;
  r.setHeader('Content-Type', 'application/json; charset=utf-8');
  r.end(JSON.stringify({
    ok: true,
    service: 'project-phoenix',
    version: '0.8',
    status: 'ok',
    time: new Date().toISOString(),
  }));
}
