import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRecommendations } from '@/queries';
import { useUserStore } from '@/store/userStore';
import { getProfilePool, type RiskLevel, type InvestPeriod, type RecommendItem } from '@/ai/recommend';
import { GlassCard, ScoreRing, Meter, ActionBadge, UpDown, SkeletonCard } from '@/components/ui';
import { IconSpark, IconCompass, IconCheck, IconChevron } from '@/components/layout/icons';

const PERIODS: InvestPeriod[] = ['短线', '中线', '长线'];
const PERIOD_HINT: Record<InvestPeriod, string> = {
  短线: '看热点情绪',
  中线: '看趋势',
  长线: '看价值',
};

function profileRisk(type: string): RiskLevel {
  if (type === '保守型') return '保守';
  if (type === '激进型') return '激进';
  return '稳健';
}

function buyColor(v: number) {
  if (v >= 75) return '#19c37d';
  if (v >= 60) return '#37e6c9';
  if (v >= 45) return '#5b8cff';
  if (v >= 30) return '#f5a623';
  return '#ff5470';
}

function DiscoverCard({ item, poolSet, index }: { item: RecommendItem; poolSet: Set<string>; index: number }) {
  const fit = poolSet.has(item.code);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/stock/${item.code.length === 6 ? (item.code.startsWith('6') ? '1' : '0') : ''}.${item.code}`}>
        <GlassCard className="overflow-hidden bg-glass-grad">
          <div className="grid grid-cols-[1fr_auto] gap-4 p-5">
            {/* 左：核心信息 */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-bold text-txt">{item.name}</span>
                <span className="font-mono text-[12px] text-txt-faint">{item.code}</span>
                <UpDown value={item.changePercent} />
              </div>

              {/* 可以买指数（重点） */}
              <div>
                <div className="mb-1 flex items-end justify-between">
                  <span className="text-[12px] text-txt-dim">可以买指数</span>
                  <span className="text-[26px] font-black leading-none" style={{ color: buyColor(item.score) }}>
                    {item.score}
                  </span>
                </div>
                <Meter value={item.score} color={buyColor(item.score)} height={8} />
              </div>

              {/* 一行三指标 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/4 px-3 py-2">
                  <div className="text-[11px] text-txt-dim">上涨概率</div>
                  <div className="text-[16px] font-bold text-up">{Math.min(92, 60 + (item.score - 50))}%</div>
                </div>
                <div className="rounded-xl bg-white/4 px-3 py-2">
                  <div className="text-[11px] text-txt-dim">风险指数</div>
                  <div className="text-[16px] font-bold text-down">{Math.max(5, 100 - item.score)}</div>
                </div>
                <div className="rounded-xl bg-white/4 px-3 py-2">
                  <div className="text-[11px] text-txt-dim">信号</div>
                  <div className="mt-0.5"><ActionBadge action={item.signal} /></div>
                </div>
              </div>

              {/* 一句话理由 */}
              <p className="text-[13px] leading-relaxed text-txt-dim">
                {item.reasons[0] ?? '技术面信号偏积极，可关注。'}
              </p>

              {/* 是否适合你 */}
              <div className="flex items-center gap-2">
                {fit ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-up/12 px-2.5 py-1 text-[12px] font-semibold text-up">
                    <IconCheck className="h-3.5 w-3.5" /> 非常适合你的画像
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/6 px-2.5 py-1 text-[12px] text-txt-faint">
                    通用推荐 · 自行判断
                  </span>
                )}
              </div>
            </div>

            {/* 右：AI评分环 */}
            <div className="flex flex-col items-center justify-center">
              <ScoreRing value={item.score} size={92} label="AI评分" sub={item.signal} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[12px] text-txt-faint">
            <span className="flex items-center gap-1"><IconSpark className="h-3.5 w-3.5 text-accent" /> 点击查看 AI 为什么推荐</span>
            <span className="flex items-center gap-0.5 text-txt-dim">详情 <IconChevron className="h-3.5 w-3.5 rotate-90" /></span>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}

export default function DiscoverPage() {
  const profile = useUserStore((s) => s.profile);
  const [period, setPeriod] = useState<InvestPeriod>(profile.period);
  const pool = useMemo(() => getProfilePool(profile.profileType), [profile.profileType]);
  const poolSet = useMemo(() => new Set(pool), [pool]);

  const { data: recs = [], isLoading } = useRecommendations({
    limit: 12,
    pool,
    period,
    risk: profileRisk(profile.profileType),
  });

  return (
    <div className="space-y-4">
      {/* 顶部：标题 + 周期筛选 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-glass text-accent-cyan">
            <IconCompass className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[16px] font-bold leading-tight text-txt">AI 发现</h2>
            <p className="text-[12px] text-txt-dim">不是股票列表，是给你刷的推荐流</p>
          </div>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-glass p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                period === p ? 'bg-accent-grad text-ink-900' : 'text-txt-dim hover:text-txt'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-txt-faint">
        当前周期：<span className="text-txt-dim">{PERIOD_HINT[period]}</span> · 推荐已按「{profile.profileType}」画像过滤
      </p>

      {/* 推荐流 */}
      <div className="flex flex-col gap-4">
        {isLoading && recs.length === 0
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={5} className="h-56" />)
          : recs.map((item, i) => (
              <DiscoverCard key={item.code} item={item} poolSet={poolSet} index={i} />
            ))}
        {!isLoading && recs.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-[13px] text-txt-dim">
            这个周期暂时没刷到合适标的，换个周期或回首页看看。
          </div>
        )}
      </div>
    </div>
  );
}
