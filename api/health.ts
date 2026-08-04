import { TARGETS, fetchUpstream, type GwRequest, type GwResponse } from './_shared';

/**
 * 基础健康检查 —— V0.8 验收项。
 *
 * GET /api/health        仅返回服务存活（快，可用于 uptime 探活）
 * GET /api/health?deep=1 逐个探测 8 个行情上游，返回可达性与延迟
 *
 * deep 模式是判断「境外机房能否访问国内行情源」（风险 R1）的唯一手段，
 * 部署完成后必须先跑一次，全部失败则说明架构需要重评，而非产品有 Bug。
 */

interface ProbeResult {
  key: string;
  label: string;
  ok: boolean;
  status: number | null;
  ms: number;
  bytes: number;
  error?: string;
}

async function probe(key: string): Promise<ProbeResult> {
  const target = TARGETS[key];
  const started = Date.now();
  try {
    const resp = await fetchUpstream(`${target.base}${target.probe}`, target, 6000);
    const body = await resp.arrayBuffer();
    return {
      key,
      label: target.label,
      ok: resp.ok && body.byteLength > 0,
      status: resp.status,
      ms: Date.now() - started,
      bytes: body.byteLength,
    };
  } catch (err) {
    return {
      key,
      label: target.label,
      ok: false,
      status: null,
      ms: Date.now() - started,
      bytes: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function handler(req: GwRequest, res: GwResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  const base = {
    service: 'project-phoenix',
    version: process.env.VITE_APP_VERSION ?? '0.8',
    stage: 'beta',
    time: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? 'unknown',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  };

  const deep = req.query.deep === '1' || req.query.deep === 'true';
  if (!deep) {
    res.status(200).json({ ...base, status: 'ok' });
    return;
  }

  const results = await Promise.all(Object.keys(TARGETS).map(probe));
  const reachable = results.filter((r) => r.ok).length;

  // 同花顺是主数据源，它挂了即使别的活着也只能算降级
  const primaryOk = results.find((r) => r.key === 'ths')?.ok ?? false;
  const status = reachable === 0 ? 'down' : primaryOk && reachable >= 6 ? 'ok' : 'degraded';

  res.status(status === 'down' ? 503 : 200).json({
    ...base,
    status,
    summary: `${reachable}/${results.length} 个上游可达，主数据源（同花顺）${primaryOk ? '正常' : '不可达'}`,
    upstreams: results.sort((a, b) => Number(b.ok) - Number(a.ok) || a.ms - b.ms),
  });
}
