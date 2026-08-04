import { TARGETS, fetchUpstream, type GwRequest, type GwResponse } from '../_shared';

/**
 * 生产行情网关 —— 替代 vite.config.ts 中仅在 dev 生效的 8 条 proxy。
 *
 * 路由：vercel.json 把 /em/* /emh/* /ems/* /sina/* /tc/* /tk/* /sk/* /ths/*
 *      重写到 /api/gw/<prefix>/*，因此前端 src/services/http.ts 的相对路径
 *      在开发与生产下保持完全一致，业务代码零改动。
 *
 * 响应按二进制原样透传并保留 Content-Type，
 * 以确保新浪 GBK 编码的响应能被浏览器正确解码。
 */
export default async function handler(req: GwRequest, res: GwResponse): Promise<void> {
  // 仅允许读取行情，杜绝被当作开放代理滥用
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawSlug = req.query.slug;
  const segments = Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug] : [];
  const prefix = segments[0];

  if (!prefix || !Object.prototype.hasOwnProperty.call(TARGETS, prefix)) {
    res.status(404).json({ error: 'unknown_upstream', prefix: prefix ?? null });
    return;
  }
  const target = TARGETS[prefix];

  // 还原上游路径：/api/gw/em/api/qt/stock/get -> /api/qt/stock/get
  const path = segments.slice(1).join('/');

  // 还原 query：从原始 url 取，并剔除 Vercel 注入的 slug 键
  const raw = req.url ?? '';
  const qIndex = raw.indexOf('?');
  const params = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : '');
  params.delete('slug');
  const qs = params.toString();

  const upstreamUrl = `${target.base}/${path}${qs ? `?${qs}` : ''}`;

  try {
    const upstream = await fetchUpstream(upstreamUrl, target);
    const buf = Buffer.from(await upstream.arrayBuffer());

    // 原样保留 content-type（含 charset=GBK），否则新浪数据会乱码
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    // 边缘缓存 5s：行情延迟可接受，但能大幅降低上游封禁与额度消耗风险
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=25');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Phoenix-Upstream', prefix);

    res.status(upstream.status).send(buf);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = message.includes('abort') || message.includes('timeout');
    res.setHeader('Cache-Control', 'no-store');
    res.status(aborted ? 504 : 502).json({
      error: aborted ? 'upstream_timeout' : 'upstream_error',
      upstream: prefix,
      detail: message,
    });
  }
}
