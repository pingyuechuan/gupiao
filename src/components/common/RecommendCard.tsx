import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { RecommendItem } from '@/ai/recommend';
import { deriveMetrics } from '@/ai/metrics';
import { scoreColor, SignalBadge, UpDown } from '@/components/ui';
import { toSecid } from '@/utils/format';
import { IconChevron } from '@/components/layout/icons';

function MiniMetric({
  label,
  value,
  color,
  meter,
}: {
  label: string;
  value: ReactNode;
  color: string;
  meter: number;
}) {
  return (
    <div className="rounded-xl bg-white/4 p-2">
      <div className="text-[10.5px] text-txt-dim">{label}</div>
      <div className="text-[16px] font-bold leading-tight" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${meter}%`, background: color }} />
      </div>
    </div>
  );
}

export default function RecommendCard({ item, rank }: { item: RecommendItem; rank?: number }) {
  const m = deriveMetrics(item.score);
  return (
    <Link
      to={`/stock/${toSecid(item.code)}`}
      className="glass group flex flex-col gap-3 rounded-2xl p-4 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {rank != null && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-glass text-[12px] font-bold text-txt-dim">
              {rank}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold text-txt">{item.name}</div>
            <div className="font-mono text-[11px] text-txt-dim">{item.code}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[15px] font-bold text-txt">{item.price.toFixed(2)}</div>
          <div className="text-[12px]">
            <UpDown value={item.changePercent} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="AI评分" value={item.score} color={scoreColor(item.score)} meter={item.score} />
        <MiniMetric label="上涨概率" value={`${m.upProb}%`} color="#37e6c9" meter={m.upProb} />
        <MiniMetric label="风险指数" value={m.riskIndex} color={scoreColor(100 - m.riskIndex)} meter={m.riskIndex} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {item.reasons.slice(0, 2).map((r, i) => (
          <span key={i} className="chip">
            {r}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <SignalBadge signal={item.signal} />
        <span className="flex items-center gap-0.5 text-[12px] text-txt-dim group-hover:text-accent">
          AI建议
          <IconChevron className="h-3.5 w-3.5 rotate-90" />
        </span>
      </div>
    </Link>
  );
}
