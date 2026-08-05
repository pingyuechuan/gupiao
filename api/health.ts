/**
 * 健康检查 —— V0.8 验收项（零依赖版，不导入 _shared.ts）
 *
 * GET /api/health        仅返回服务存活
 * GET /api/health?deep=1 逐个探测 8 个行情上游可达性（R1 风险验收）
 */

const TARGETS: Record<string, { base: string; label: string }> = {
  em:   { base: 'https://push2.eastmoney.com',         label: '东方财富-实时' },
  emh:  { base: 'https://push2his.eastmoney.com',       label: '东方财富-历史' },
  ems:  { base: 'https://searchapi.eastmoney.com',       label: '东方财富-搜索' },
  sina: { base: 'https://hq.sinajs.cn',                  label: '新浪-快照' },
  tc:   { base: 'https://qt.gtimg.cn',                   label: '腾讯-快照' },
  tk:   { base: 'https://web.ifzq.gtimg.cn',              label: '腾讯-K线' },
  sk:   { base: 'https://quotes.sina.cn',                 label: '新浪-分钟线' },
  ths:  { base: 'http://d.10jqka.com.cn',                label: '同花顺（主数据源）' },
};

const PROBES: Record<string, string> = {
  em:   '/api/qt/stock/get?secid=1.000001&fields=f43,f58',
  emh:  '/api/qt/stock/kline/get?secid=1.000001&klt=101&fqt=1&lmt=2&fields1=f1&fields2=f51,f53',
  ems:  '/api/suggest/get?input=600000&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=1',
  sina: '/list=sh000001',
  tc:   '/q=sh000001',
  tk:   '/appstock/app/fqkline/get?param=sh000001,day,,,2,qfq',
  sk:   '/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=sh000001&scale=60&datalen=2',
  ths:  '/v4/line/hs_000001/01/today.js',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function json(res: any, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function probeOne(key: string): Promise<any> {
  const t = TARGETS[key];
  if (!t) return { key, label: '?', ok: false, ms: 0, bytes: 0 };
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(t.base + (PROBES[key] ?? ''), {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: '*/*' },
    });
    clearTimeout(timer);
    const buf = await r.arrayBuffer();
    return { key, label: t.label, ok: r.ok && buf.byteLength > 0, status: r.status, ms: Date.now() - start, bytes: buf.byteLength };
  } catch (err) {
    return { key, label: t.label, ok: false, status: null, ms: Date.now() - start, bytes: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-store');

    let deep = false;
    try {
      const q = req?.query;
      if (q && (q.deep === '1' || q.deep === 'true')) deep = true;
    } catch { /* no query */ }

    const base = {
      service: 'project-phoenix',
      version: process.env.VITE_APP_VERSION ?? '0.8',
      stage: 'beta',
      time: new Date().toISOString(),
      region: process.env.VERCEL_REGION ?? 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    };

    if (!deep) {
      json(res, 200, { ...base, status: 'ok' });
      return;
    }

    const keys = Object.keys(TARGETS);
    const results = await Promise.all(keys.map(probeOne));
    const reachable = results.filter((r: any) => r.ok).length;
    const primaryOk = results.find((r: any) => r.key === 'ths')?.ok ?? false;
    const status = reachable === 0 ? 'down' : primaryOk && reachable >= 6 ? 'ok' : 'degraded';

    json(res, status === 'down' ? 503 : 200, {
      ...base,
      status,
      summary: `${reachable}/${results.length} upstreams reachable, primary(ths)=${primaryOk ? 'OK' : 'FAIL'}`,
      upstreams: results,
    });
  } catch (err) {
    json(res, 500, {
      error: 'internal_error',
      stage: 'health',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
