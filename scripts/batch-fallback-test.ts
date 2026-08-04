/**
 * 排行榜/板块 fallback 端到端测试
 * 直接请求本机 dev server 的 /tc 批量接口，验证解析与排序。
 * 运行：npx esbuild scripts/batch-fallback-test.ts --bundle --platform=node --format=cjs --alias:@=./src --define:import.meta.env={} --outfile=scripts/_batch-fallback-test.cjs && node scripts/_batch-fallback-test.cjs
 */
import { http } from '@/services/http';
import { fetchBatchQuotes, buildRankFromQuotes, buildSectorsFromQuotes } from '@/services/batchQuote';
import { STATIC_SECTORS, getRankUniverse } from '@/constants/marketUniverse';

http.defaults.baseURL = 'http://localhost:5173';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

async function main() {
  console.log('=== fetch batch quotes (sample) ===');
  const sample = ['1.601728', '1.600519', '0.000858'];
  const quotes = await fetchBatchQuotes(sample);
  console.log('got', quotes.length, 'quotes');
  assert(quotes.length === 3, 'should get 3 quotes');
  assert(quotes.some((q) => q.code === '601728'), 'should include 601728');
  assert(Number.isFinite(quotes[0].price), 'price should be number');

  console.log('=== build change rank ===');
  const universe = getRankUniverse();
  const all = await fetchBatchQuotes(universe);
  console.log('universe quotes', all.length, '/', universe.length);
  assert(all.length > 10, 'should get >10 quotes from universe');

  const changeRank = buildRankFromQuotes(all, 'change', 20);
  assert(changeRank.length <= 20, 'limit respected');
  assert(changeRank.length > 0, 'change rank not empty');
  // 降序
  for (let i = 0; i < changeRank.length - 1; i++) {
    assert(changeRank[i].changePercent >= changeRank[i + 1].changePercent, 'change rank sorted desc');
  }
  console.log('top', changeRank[0].name, changeRank[0].changePercent);

  console.log('=== build amount rank ===');
  const amountRank = buildRankFromQuotes(all, 'amount', 20);
  assert(amountRank.length > 0, 'amount rank not empty');

  console.log('=== build sectors ===');
  const sectorCodes = Array.from(new Set(STATIC_SECTORS.flatMap((s) => s.leaders)));
  const sectorQuotes = await fetchBatchQuotes(sectorCodes);
  const sectors = buildSectorsFromQuotes(STATIC_SECTORS, sectorQuotes);
  assert(sectors.length === STATIC_SECTORS.length, 'all sectors returned');
  assert(sectors[0].changePercent >= sectors[sectors.length - 1].changePercent, 'sectors sorted desc');
  console.log('top sector', sectors[0].name, sectors[0].changePercent, sectors[0].leader);

  console.log('\n✅ batch fallback test passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
