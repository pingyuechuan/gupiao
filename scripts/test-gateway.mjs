/**
 * 网关离线验证 —— 直接调用 Serverless handler，不依赖 vercel CLI。
 *
 * 验证三件事：
 *   1. 路径/query 还原是否与 vite dev proxy 等价
 *   2. 8 个上游在当前网络下是否真的可达
 *   3. Content-Type（尤其新浪 GBK）是否原样透传
 *
 * 用法：node scripts/test-gateway.mjs
 */
import { build } from 'esbuild';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const outDir = mkdtempSync(join(tmpdir(), 'phoenix-gw-'));

async function compile(entry, name) {
  const outfile = join(outDir, `${name}.mjs`);
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    logLevel: 'silent',
  });
  return (await import(pathToFileURL(outfile).href)).default;
}

/** 构造与 Vercel Node Runtime 兼容的 mock req/res */
function mock(url, query) {
  const captured = { status: 0, headers: {}, body: null };
  const res = {
    status(c) { captured.status = c; return res; },
    setHeader(k, v) { captured.headers[k.toLowerCase()] = v; },
    send(b) { captured.body = b; },
    json(b) { captured.body = JSON.stringify(b); },
    end() {},
  };
  return [{ url, method: 'GET', query, headers: {} }, res, captured];
}

/** 从 vite.config.ts 抽出 proxy 前缀，确保网关未遗漏任何一条 */
function proxyPrefixesFromViteConfig() {
  const src = readFileSync('vite.config.ts', 'utf8');
  const block = src.slice(src.indexOf('proxy: {'));
  return [...block.matchAll(/^\s{6}'\/(\w+)':/gm)].map((m) => m[1]);
}

const CASES = [
  { name: '东财-实时(指数)',   prefix: 'em',   path: 'api/qt/stock/get',  qs: 'secid=1.000001&fields=f43,f57,f58,f170' },
  { name: '东财-日K',          prefix: 'emh',  path: 'api/qt/stock/kline/get', qs: 'secid=1.000001&klt=101&fqt=1&lmt=3&fields1=f1&fields2=f51,f53' },
  { name: '东财-搜索',         prefix: 'ems',  path: 'api/suggest/get',   qs: 'input=600000&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=1' },
  { name: '新浪-快照(GBK)',    prefix: 'sina', path: 'list=sh000001',     qs: '' },
  { name: '腾讯-快照',         prefix: 'tc',   path: 'q=sh000001',        qs: '' },
  { name: '腾讯-K线',          prefix: 'tk',   path: 'appstock/app/fqkline/get', qs: 'param=sh000001,day,,,3,qfq' },
  { name: '新浪-分钟线',       prefix: 'sk',   path: 'cn/api/json_v2.php/CN_MarketDataService.getKLineData', qs: 'symbol=sh000001&scale=60&datalen=3' },
  { name: '同花顺-日K(主源)',  prefix: 'ths',  path: 'v4/line/hs_000001/01/today.js', qs: '' },
];

try {
  const gw = await compile('api/gw/[...slug].ts', 'gw');

  // --- 覆盖度检查：网关必须覆盖 vite proxy 的每一条前缀 ---
  const vitePrefixes = proxyPrefixesFromViteConfig();
  const covered = new Set(CASES.map((c) => c.prefix));
  const missing = vitePrefixes.filter((p) => !covered.has(p));
  console.log(`vite dev proxy 前缀: ${vitePrefixes.join(', ')}`);
  console.log(missing.length ? `❌ 网关未覆盖: ${missing.join(', ')}` : '✅ 网关已覆盖全部 dev proxy 前缀');
  console.log('');

  let pass = 0;
  for (const c of CASES) {
    const slug = [c.prefix, ...c.path.split('/')];
    const url = `/api/gw/${slug.join('/')}${c.qs ? `?${c.qs}` : ''}`;
    const [req, res, cap] = mock(url, { slug });

    const t0 = Date.now();
    await gw(req, res);
    const ms = Date.now() - t0;

    const len = cap.body?.length ?? 0;
    const ok = cap.status === 200 && len > 0;
    if (ok) pass++;
    const ct = cap.headers['content-type'] ?? '-';
    const preview = Buffer.isBuffer(cap.body)
      ? cap.body.subarray(0, 48).toString('latin1').replace(/\s+/g, ' ')
      : String(cap.body ?? '').slice(0, 48);
    console.log(
      `${ok ? '✅' : '❌'} ${c.name.padEnd(16)} ${String(cap.status).padStart(3)} ` +
      `${String(ms).padStart(5)}ms ${String(len).padStart(7)}B  ${ct}`,
    );
    if (!ok) console.log(`     ↳ ${preview}`);
  }

  console.log('');
  console.log(`结果：${pass}/${CASES.length} 个上游通过`);

  // --- 错误分支 ---
  const [r1, s1, c1] = mock('/api/gw/nope/x', { slug: ['nope', 'x'] });
  await gw(r1, s1);
  console.log(`${c1.status === 404 ? '✅' : '❌'} 未知上游 -> ${c1.status} (期望 404)`);

  const [r2, s2, c2] = mock('/api/gw/em/x', { slug: ['em', 'x'] });
  r2.method = 'POST';
  await gw(r2, s2);
  console.log(`${c2.status === 405 ? '✅' : '❌'} 非 GET 方法 -> ${c2.status} (期望 405)`);

  process.exitCode = pass === CASES.length && missing.length === 0 ? 0 : 1;
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
