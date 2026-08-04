import { GlassCard, ScoreRing, Stat, ActionBadge } from '@/components/ui';
import { IconSpark } from '@/components/layout/icons';
import type { AIMSResult } from '@/aims/types';
import WhyExpansion from './WhyExpansion';

/**
 * AIMS 统一决策卡片：所有页面（个股 / 推荐 / 持仓 / 教练）共用，
 * 展示可以买指数、上涨概率、建议仓位、风险指数 + 可展开的「为什么」。
 */
export default function AIMSCard({ aims, className = '' }: { aims: AIMSResult; className?: string }) {
  const a = aims;
  return (
    <GlassCard className={`overflow-hidden bg-glass-grad ${className}`} padded={false}>
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center justify-center gap-2 md:border-r md:border-line md:pr-5">
          <ScoreRing value={a.composite} size={104} label="最终评分" />
          <ActionBadge action={a.action} />
          <span className="text-[11px] text-txt-faint">综合建议：{a.action}</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[14px] font-bold text-txt">
            <IconSpark className="h-4 w-4 text-accent" /> AIMS 统一决策
          </div>
          <p className="text-[13.5px] leading-relaxed text-txt">{a.oneLiner}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="可以买指数" value={<span className="text-up">{a.buyIndex}</span>} />
            <Stat label="上涨概率" value={<span className="text-[#37e6c9]">{a.upProb}%</span>} />
            <Stat label="建议仓位" value={<span className="text-up">{a.suggestedPosition}%</span>} />
            <Stat label="风险指数" value={<span className="text-down">{a.riskIndex}</span>} />
          </div>
          <WhyExpansion aims={a} />
        </div>
      </div>
    </GlassCard>
  );
}
