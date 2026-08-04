import type * as echarts from 'echarts';
import { useEchart } from './useEchart';
import type { TimeSharePoint } from '@/types';
import { COLORS } from '@/constants';

const UP = '#ff5470'; // 涨 = 红
const DOWN = '#19c37d'; // 跌 = 绿

function buildOption(points: TimeSharePoint[], preClose: number): echarts.EChartsCoreOption {
  const times = points.map((p) => p.time);
  const price = points.map((p) => p.price);
  const avg = points.map((p) => p.avgPrice);
  const last = points.length ? points[points.length - 1].price : preClose;
  const up = last >= preClose;
  const lineColor = up ? UP : DOWN;
  const step = Math.max(1, Math.floor(times.length / 6));

  return {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,14,24,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e8ebf2', fontSize: 12 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>价格 <b>${p.data}</b><br/>均价 ${params[1]?.data ?? '--'}`;
      },
    },
    xAxis: {
      type: 'category',
      data: times,
      boundaryGap: false,
      axisLine: { lineStyle: { color: COLORS.axis } },
      axisLabel: { color: COLORS.textDim, fontSize: 10, interval: step },
    },
    yAxis: {
      scale: true,
      position: 'right',
      axisLine: { show: false },
      axisLabel: { color: COLORS.textDim, fontSize: 10 },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    series: [
      {
        type: 'line',
        name: '价格',
        data: price,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: lineColor, width: 1.6 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: up ? 'rgba(255,84,112,0.25)' : 'rgba(25,195,125,0.25)' },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ],
          },
        },
        markLine: {
          symbol: 'none',
          silent: true,
          data: [
            {
              yAxis: preClose,
              lineStyle: { color: COLORS.textDim, type: 'dashed' },
              label: { formatter: '昨收', color: COLORS.textDim, position: 'start', fontSize: 10 },
            },
          ],
        },
      },
      {
        type: 'line',
        name: '均价',
        data: avg,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: '#5b8cff', width: 1.2, type: 'dashed' },
      },
    ],
  };
}

export default function TimeShareChart({
  points,
  preClose,
  height = 320,
}: {
  points: TimeSharePoint[];
  preClose: number;
  height?: number;
}) {
  const ref = useEchart(() => buildOption(points, preClose), [points, preClose]);
  return <div ref={ref} style={{ height, width: '100%' }} />;
}
