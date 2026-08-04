/**
 * Serverless 共享定义 —— 零依赖（不引入 @vercel/node，避免多一个包）。
 * 与 vite.config.ts 的 dev proxy 保持 1:1 对应，改动必须同步两处。
 */

/** Vercel Node Runtime 请求对象（最小可用子集） */
export interface GwRequest {
  url?: string;
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

/** Vercel Node Runtime 响应对象（最小可用子集） */
export interface GwResponse {
  status(code: number): GwResponse;
  setHeader(name: string, value: string): void;
  send(body: string | Buffer): void;
  json(body: unknown): void;
  end(): void;
}

export const EM_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface UpstreamTarget {
  /** 上游根地址 */
  base: string;
  /** 需要伪装的 Referer（部分源做防盗链校验） */
  referer?: string;
  /** 人类可读名称，用于健康检查报告 */
  label: string;
  /** 健康检查用的探针路径（含 query） */
  probe: string;
}

/**
 * 8 条上游映射，与 vite.config.ts proxy 完全一致。
 * 注意 ths 是 http 明文：浏览器直连会被 Mixed Content 拦截，
 * 必须由服务端做 https→http 桥接，这也是本网关不可省略的原因。
 */
export const TARGETS: Record<string, UpstreamTarget> = {
  em: {
    base: 'https://push2.eastmoney.com',
    referer: 'https://quote.eastmoney.com/',
    label: '东方财富-实时',
    probe: '/api/qt/stock/get?secid=1.000001&fields=f43,f58',
  },
  emh: {
    base: 'https://push2his.eastmoney.com',
    referer: 'https://quote.eastmoney.com/',
    label: '东方财富-历史',
    probe: '/api/qt/stock/kline/get?secid=1.000001&klt=101&fqt=1&lmt=2&fields1=f1&fields2=f51,f53',
  },
  ems: {
    base: 'https://searchapi.eastmoney.com',
    referer: 'https://quote.eastmoney.com/',
    label: '东方财富-搜索',
    probe: '/api/suggest/get?input=600000&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=1',
  },
  sina: {
    base: 'https://hq.sinajs.cn',
    referer: 'https://finance.sina.com.cn',
    label: '新浪-快照',
    probe: '/list=sh000001',
  },
  tc: {
    base: 'https://qt.gtimg.cn',
    label: '腾讯-快照',
    probe: '/q=sh000001',
  },
  tk: {
    base: 'https://web.ifzq.gtimg.cn',
    referer: 'https://quote.eastmoney.com/',
    label: '腾讯-K线',
    probe: '/appstock/app/fqkline/get?param=sh000001,day,,,2,qfq',
  },
  sk: {
    base: 'https://quotes.sina.cn',
    referer: 'https://finance.sina.com.cn',
    label: '新浪-分钟线',
    probe: '/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=sh000001&scale=60&datalen=2',
  },
  ths: {
    base: 'http://d.10jqka.com.cn',
    referer: 'http://stockpage.10jqka.com.cn/',
    label: '同花顺（主数据源）',
    probe: '/v4/line/hs_000001/01/today.js',
  },
};

/** 带超时的上游请求 */
export async function fetchUpstream(
  url: string,
  target: UpstreamTarget,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': EM_UA,
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...(target.referer ? { Referer: target.referer } : {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
