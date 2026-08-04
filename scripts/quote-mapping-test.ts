import { EastMoneyProvider } from '@/services/providers/EastMoneyProvider';
import { http } from '@/services/http';

const sampleResponse = {
  data: {
    rc: 0,
    data: {
      f43: 6.24,
      f44: 6.38,
      f45: 6.23,
      f46: 6.38,
      f47: 1301199,
      f48: 818812785.0,
      f57: '601728',
      f58: '中国电信',
      f60: 6.3,
      f116: 571004545481.76,
      f162: 19.42,
      f163: 17.21,
    },
  },
};

let callCount = 0;
(http as unknown as { get: typeof http.get }).get = async () => {
  callCount += 1;
  return sampleResponse as never;
};

async function main() {
  const provider = new EastMoneyProvider();
  const quote = await provider.getQuote('1.601728');

  const checks = [
    ['name', quote.name, '中国电信'],
    ['code', quote.code, '601728'],
    ['price', quote.price, 6.24],
    ['preClose', quote.preClose, 6.3],
    ['open', quote.open, 6.38],
    ['high', quote.high, 6.38],
    ['low', quote.low, 6.23],
    ['high > low', quote.high > quote.low, true],
    ['volume', quote.volume, 1301199],
    ['amount', quote.amount, 818812785.0],
    ['turnoverRate', quote.turnoverRate, 19.42],
    ['pe', quote.pe, 17.21],
    ['amplitude', Math.round(quote.amplitude * 100) / 100, 2.38],
  ] as const;

  let failed = 0;
  for (const [name, actual, expected] of checks) {
    const pass = actual === expected;
    if (!pass) failed += 1;
    console.log(`${pass ? '✓' : '✗'} ${name}: ${actual} (expected ${expected})`);
  }
  console.log(`http calls: ${callCount}`);
  process.exit(failed ? 1 : 0);
}

main();
