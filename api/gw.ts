/**
 * 生产行情网关 —— 零依赖版（不导入 _shared.ts）
 *
 * 路由：vercel.json 把 /em/* /emh/* /ems/* /sina/* /tc/* /tk/* /sk/* /ths/*
 *      重写到 /api/gw/<prefix>/*
 *
 * 响应按二进制原样透传并保留 Content-Type（含 GBK）。
 */

const TARGETS: Record<string, { base: string; referer?: string }> = {
  em:  { base: 'https://push2.eastmoney.com' },
  emh: { base: 'https://push2his.eastmoney.com' },
  ems: { base: 'https://searchapi.eastmoney.com' },
  sina: { base: 'https://hq.sinajs.cn' },
  tc:   { base: 'https://qt.gtimg.cn' },
  tk:   { base: 'https://web.ifzq.gtimg.cn' },
  sk:   { base: 'https://quotes.sina.cn' },
  ths:  { base: 'http://d.10jqka.com.cn' },
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
      json(res, 405, { error: 'method_not_allowed' });
      return;
    }

    // slug 格式: "em/rest/of/path" （来自 vercel.json rewrite: /api/gw?slug=em/:path*）
    const rawSlug = req.query?.slug;
    const slugStr = Array.isArray(rawSlug) ? rawSlug.join('/') : (rawSlug ?? '');
    const parts = slugStr.split('/');
    const prefix = parts[0];
    const restPath = parts.slice(1).join('/');

    if (!prefix || !Object.prototype.hasOwnProperty.call(TARGETS, prefix)) {
      json(res, 404, { error: 'unknown_upstream', prefix: prefix ?? null });
      return;
    }
    const target = TARGETS[prefix];

    const raw = req.url ?? '';
    const qIndex = raw.indexOf('?');
    const params = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : '');
    params.delete('slug');
    const qs = params.toString();

    const upstreamUrl = `${target.base}${restPath ? '/' + restPath : ''}${qs ? '?' + qs : ''}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const upstream = await fetch(upstreamUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': UA, Accept: '*/*', ...(target.referer ? { Referer: target.referer } : {}) },
      });
      clearTimeout(timer);

      const buf = Buffer.from(await upstream.arrayBuffer());
      const ct = upstream.headers.get('content-type');
      if (ct) res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=25');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Phoenix-Upstream', prefix);

      res.statusCode = upstream.status;
      res.end(buf);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const aborted = message.includes('abort') || message.includes('timeout');
      res.setHeader('Cache-Control', 'no-store');
      json(res, aborted ? 504 : 502, {
        error: aborted ? 'upstream_timeout' : 'upstream_error',
        upstream: prefix,
        detail: message,
      });
    }
  } catch (err) {
    json(res, 500, {
      error: 'internal_error',
      stage: 'gw',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
