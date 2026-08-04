/**
 * 网络诊断脚本：测试各行情接口在本地环境的可达性。
 * 用法（已在项目根目录）：
 *   npx esbuild scripts/network-diagnosis.ts --bundle --platform=node --format=cjs --outfile=scripts/_network-diagnosis.cjs && node scripts/_network-diagnosis.cjs
 * 或直接（如果 tsx 已安装）：
 *   npx tsx scripts/network-diagnosis.ts
 */

async function probe(label: string, url: string, init?: RequestInit): Promise<void> {
  const start = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    const size = Buffer.byteLength(text);
    const snippet = text.replace(/\s+/g, ' ').slice(0, 200);
    console.log(`[OK] ${label}`);
    console.log(`     URL: ${url}`);
    console.log(`     HTTP ${res.status}, ${size} bytes, ${Date.now() - start}ms`);
    console.log(`     snippet: ${snippet || '(empty body)'}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[FAIL] ${label}`);
    console.log(`     URL: ${url}`);
    console.log(`     error: ${msg}`);
  }
  console.log('');
}

async function main() {
  console.log('=== 行情接口网络诊断 ===\n');

  // 1. 直连测试
  await probe('EastMoney 个股行情（直连）', 'https://push2.eastmoney.com/api/qt/stock/get?secid=1.601728&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f162,f163&fltt=2');
  await probe('EastMoney 涨幅榜（直连）', 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:13,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f14,f2,f3,f4,f5,f6,f7,f8');
  await probe('Tencent 个股行情（直连）', 'https://qt.gtimg.cn/q=sh601728');
  await probe('Sina 个股行情（直连）', 'https://hq.sinajs.cn/hq_str_sh601728', { headers: { Referer: 'https://finance.sina.com.cn' } });

  // 2. 经 Vite dev proxy 测试（需 npm run dev 已启动）
  const proxyBase = 'http://localhost:5173';
  console.log('=== 经 Vite dev proxy 测试（需 dev server 在 5173） ===\n');
  await probe('EastMoney 个股行情（via proxy）', `${proxyBase}/em/api/qt/stock/get?secid=1.601728&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f162,f163&fltt=2`);
  await probe('Tencent 个股行情（via proxy）', `${proxyBase}/tc/q=sh601728`);
  await probe('Sina 个股行情（via proxy）', `${proxyBase}/sina/hq_str_sh601728`);

  console.log('=== 诊断结束 ===');
  console.log('提示：');
  console.log('  - 若所有 [FAIL] 出现在"直连"，说明本机到行情源的网络不通（DNS/防火墙/VPN）。');
  console.log('  - 若"直连"OK 但"via proxy"FAIL，说明 Vite dev server 代理未生效。');
  console.log('  - 若"via proxy"OK 但页面仍无数据，请检查浏览器 DevTools Console/Network 是否有 JS 错误。');
}

main();
