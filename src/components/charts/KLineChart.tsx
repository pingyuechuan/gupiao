import type * as echarts from 'echarts';
import { useEchart } from './useEchart';
import type { Kline } from '@/types';
import type { KlineAiSignals } from '@/ai/klineSignals';
import { sma } from '@/utils/indicators';
import { COLORS } from '@/constants';

const UP = '#ff5470'; // 涨 = 红（A股惯例）
const DOWN = '#19c37d'; // 跌 = 绿

function buildOption(
  klines: Kline[],
  signals: KlineAiSignals | null,
  mode: 'beginner' | 'pro',
) {
  const dates = klines.map((k) => k.date);
  const candle = klines.map((k) => [k.open, k.close, k.low, k.high]);
  const closes = klines.map((k) => k.close);
  const isPro = mode === 'pro';

  const markPointData: Record<string, unknown>[] = [];
  if (signals?.buy) {
    markPointData.push({
      name: 'AI买点',
      coord: [signals.buy.date, signals.buy.price],
      value: 'B',
      itemStyle: { color: DOWN },
      label: { color: '#0b0e14', fontSize: 11, fontWeight: 'bold' },
    });
  }
  if (signals?.sell) {
    markPointData.push({
      name: 'AI卖点',
      coord: [signals.sell.date, signals.sell.price],
      value: 'S',
      itemStyle: { color: UP },
      label: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    });
  }

  const markLineData: Record<string, unknown>[] = [];
  if (signals) {
    markLineData.push({
      name: '止盈',
      yAxis: signals.takeProfit,
      lineStyle: { color: DOWN, type: 'dashed', width: 1.4 },
      label: { formatter: '止盈', color: DOWN, position: 'end' },
    });
    markLineData.push({
      name: '止损',
      yAxis: signals.stopLoss,
      lineStyle: { color: UP, type: 'dashed', width: 1.4 },
      label: { formatter: '止损', color: UP, position: 'end' },
    });
    markLineData.push({
      name: '支撑',
      yAxis: signals.support,
      lineStyle: { color: '#5b8cff', type: 'dotted', width: 1.2 },
      label: { formatter: '支撑', color: '#5b8cff', position: 'end' },
    });
    markLineData.push({
      name: '压力',
      yAxis: signals.resistance,
      lineStyle: { color: '#f5a623', type: 'dotted', width: 1.2 },
      label: { formatter: '压力', color: '#f5a623', position: 'end' },
    });
  }

  const candleSeries: Record<string, unknown> = {
    type: 'candlestick',
    name: 'K线',
    data: candle,
    itemStyle: {
      color: UP,
      color0: DOWN,
      borderColor: UP,
      borderColor0: DOWN,
    },
    markPoint: markPointData.length ? { symbol: 'pin', symbolSize: 42, data: markPointData } : undefined,
    markLine: markLineData.length
      ? {
          symbol: 'none',
          data: markLineData,
          label: { backgroundColor: 'rgba(8,11,18,0.7)', padding: [2, 5], borderRadius: 4, fontSize: 10 },
          precision: 2,
        }
      : undefined,
    markArea: signals?.riskZone
      ? {
          silent: true,
          itemStyle: { color: 'rgba(255,84,112,0.10)' },
          data: [
            [
              { yAxis: signals.riskZone.from, label: { show: true, position: 'insideTop', formatter: '风险区', color: UP, fontSize: 10 } },
              { yAxis: signals.riskZone.to },
            ],
          ],
        }
      : undefined,
  };

  const series: Record<string, unknown>[] = [candleSeries];

  let grids: Record<string, unknown>[];

  if (isPro) {
    const ma5 = sma(closes, 5);
    const ma10 = sma(closes, 10);
    const ma20 = sma(closes, 20);
    series.push(
      {
        type: 'line',
        name: 'MA5',
        data: ma5,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.2, color: COLORS.ma5 },
      },
      {
        type: 'line',
        name: 'MA10',
        data: ma10,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.2, color: COLORS.ma10 },
      },
      {
        type: 'line',
        name: 'MA20',
        data: ma20,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.4, color: COLORS.ma20 },
      },
    );
    const vol = klines.map((k) => ({
      value: k.volume,
      itemStyle: { color: k.close >= k.open ? 'rgba(255,84,112,0.55)' : 'rgba(25,195,125,0.55)' },
    }));
    series.push({
      type: 'bar',
      name: '成交量',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: vol,
    });
    grids = [
      { left: 8, right: 12, top: 14, height: '66%', containLabel: true },
      { left: 8, right: 12, top: '76%', height: '16%', containLabel: true },
    ];
  } else {
    grids = [{ left: 8, right: 12, top: 14, bottom: 10, containLabel: true }];
  }

  return {
    backgroundColor: 'transparent',
    animation: true,
    grid: grids,
    axisPointer: { link: isPro ? [{ xAxisIndex: 'all' }] : undefined, label: { backgroundColor: '#1d2233' } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,14,24,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e8ebf2', fontSize: 12 },
      axisPointer: { type: 'cross' },
    },
    legend: isPro
      ? { data: ['MA5', 'MA10', 'MA20'], top: 0, right: 12, textStyle: { color: '#8b93a7', fontSize: 11 }, itemWidth: 14, itemHeight: 8 }
      : undefined,
    xAxis: isPro
      ? [
          {
            type: 'category',
            data: dates,
            boundaryGap: true,
            axisLine: { lineStyle: { color: COLORS.axis } },
            axisLabel: { color: COLORS.textDim, fontSize: 10 },
            splitLine: { show: false },
          },
          {
            type: 'category',
            gridIndex: 1,
            data: dates,
            axisLine: { lineStyle: { color: COLORS.axis } },
            axisLabel: { show: false },
            axisTick: { show: false },
          },
        ]
      : [
          {
            type: 'category',
            data: dates,
            boundaryGap: true,
            axisLine: { lineStyle: { color: COLORS.axis } },
            axisLabel: { color: COLORS.textDim, fontSize: 10 },
            splitLine: { show: false },
          },
        ],
    yAxis: isPro
      ? [
          {
            scale: true,
            axisLine: { show: false },
            axisLabel: { color: COLORS.textDim, fontSize: 10 },
            splitLine: { lineStyle: { color: COLORS.grid } },
          },
          {
            gridIndex: 1,
            scale: true,
            axisLine: { show: false },
            axisLabel: { show: false },
            splitLine: { show: false },
          },
        ]
      : [
          {
            scale: true,
            axisLine: { show: false },
            axisLabel: { color: COLORS.textDim, fontSize: 10 },
            splitLine: { lineStyle: { color: COLORS.grid } },
          },
        ],
    dataZoom: [
      { type: 'inside', start: 55, end: 100, zoomLock: false },
    ],
    series,
  } as echarts.EChartsCoreOption;
}

export default function KLineChart({
  klines,
  signals,
  mode = 'pro',
  height = 420,
}: {
  klines: Kline[];
  signals: KlineAiSignals | null;
  mode?: 'beginner' | 'pro';
  height?: number;
}) {
  const ref = useEchart(() => buildOption(klines, signals, mode), [klines, signals, mode]);
  return <div ref={ref} style={{ height, width: '100%' }} />;
}
