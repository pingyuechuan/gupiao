import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

/**
 * 轻量 ECharts 封装：只初始化一次，依赖变化时才 setOption。
 * 用 ResizeObserver 自适应容器尺寸，卸载时 dispose。
 */
export function useEchart(getOption: () => echarts.EChartsCoreOption, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(getOption(), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
