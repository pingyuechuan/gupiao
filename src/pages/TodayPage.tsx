import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useMarketDiagnosis, useRecommendations, useWatchlistQuotes } from '@/queries';
import { useUserStore } from '@/store/userStore';
import { getProfilePool, type RiskLevel } from '@/ai/recommend';
import { INDEX_CODES } from '@/constants';
import RecommendCard from '@/components/common/RecommendCard';
import { GlassCard, SectionTitle, Stars, Stat, UpDown, SkeletonCard } from '@/components/ui';
import { IconBolt, IconSpark, IconChevron, IconTarget, IconNews } from '@/components/layout/icons';
import BetaBadge from '@/components/aims/BetaBadge';
import type { Sector } from '@/types';

function tempColor(t: number): string {
  if (t >= 78) return '#ff5470';
  if (t >= 60) return '#19c37d';
  if (t >= 42) return '#37e6c9';
  if (t >= 25) return '#f5a623';
  return '#5a6478';
}

function TempGauge({ value }: { value: number }) {
  const color = tempColor(value);
  const size = 132;
  const thickness = 10;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[34px] font-black leading-none" style={{ color }}>
          {value}
          <span className="text-[16px]">℃</span>
        </span>
        <span className="mt-1 text-[13px] font-semibold" style={{ color }}>
          {value >= 78 ? '过热·警惕' : value >= 60 ? '活跃' : value >= 42 ? '温和' : value >= 25 ? '偏冷' : '冰点'}
        </span>
      </div>
    </div>
  );
}

function profileRisk(type: string): RiskLevel {
  if (type === '保守型') return '保守';
  if (type === '激进型') return '激进';
  return '稳健';
}

/** 把行情结论翻译成「新闻解读」卡片（明确标注：AI解读，非原文） */
function buildNews(sectors: Sector[], up: number, down: number) {
  const out: { title: string; stars: number; tone: string; oneLine: string; tags: string[] }[] = [];
  sectors.slice(0, 2).forEach((s) => {
    if (s.changePercent > 0) {
      out.push({
        title: `${s.name}今日走强`,
        stars: 4,
        tone: 'text-up',
        oneLine: `板块资金流入明显，对相关个股偏利好，可关注是否延续。`,
        tags: [s.name, '资金流入'],
      });
    } else if (s.changePercent < 0) {
      out.push({
        title: `${s.name}今日承压`,
        stars: 2,
        tone: 'text-down',
        oneLine: `板块整体走弱，短期注意回避，等企稳再说。`,
        tags: [s.name, '资金流出'],
      });
    }
  });
  out.push({
    title: '全市场涨跌分布',
    stars: up >= down ? 4 : 2,
    tone: up >= down ? 'text-up' : 'text-down',
    oneLine: `今天 ${up} 只上涨、${down} 只下跌，市场${up >= down ? '情绪偏暖' : '情绪偏弱'}，AI 建议${up >= down ? '可积极一些' : '多看少动'}。`,
    tags: ['情绪', up >= down ? '偏暖' : '偏弱'],
  });
  return out.slice(0, 3);
}

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export default function TodayPage() {
  const { data, isLoading } = useMarketDiagnosis();
  const profile = useUserStore((s) => s.profile);
  const mode = useUserStore((s) => s.mode);

  const pool = useMemo(() => getProfilePool(profile.profileType), [profile.profileType]);
  const { data: recs = [], isLoading: recLoading } = useRecommendations({
    limit: 8,
    pool,
    period: profile.period,
    risk: profileRisk(profile.profileType),
  });
  const { data: indices = [] } = useWatchlistQuotes(INDEX_CODES);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={4} className="h-56" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <div className="mb-2 text-[15px] font-bold text-txt">行情加载失败</div>
        <p className="text-[13px] text-txt-dim">公开接口可能暂时不可用，点击右上角刷新按钮重试。</p>
      </div>
    );
  }

  const d = data.diagnosis;
  const news = buildNews(d.strongSectors.concat(d.weakSectors), d.upCount, d.downCount);

  return (
    <div className="space-y-5">
      {/* Beta 版本标识 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold leading-tight text-txt">今日市场</h1>
          <p className="text-[12px] text-txt-dim">AI 帮你判断今天该怎么办，而不是给你一堆代码</p>
        </div>
        <BetaBadge />
      </div>

      {/* 大盘速览 */}
      <motion.div {...fade} transition={{ duration: 0.3 }}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {indices.map((idx) => (
            <Link
              key={idx.code}
              to={`/stock/${idx.market === 'sh' ? '1' : '0'}.${idx.code}`}
              className="glass flex flex-col gap-0.5 rounded-2xl px-3 py-2.5"
            >
              <span className="truncate text-[12px] text-txt-dim">{idx.name}</span>
              <span className="font-mono text-[16px] font-bold text-txt">{idx.price.toFixed(2)}</span>
              <span className="text-[12px]">
                <UpDown value={idx.changePercent} />
              </span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* 今日市场诊断 — 第一屏（回答：今天该怎么办） */}
      <motion.div {...fade} transition={{ duration: 0.35, delay: 0.04 }}>
        <GlassCard className="overflow-hidden bg-glass-grad">
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[auto_1fr]">
            <div className="flex items-center justify-center">
              <TempGauge value={d.temperature} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[15px] font-bold text-txt">今日市场诊断</span>
                <span className="rounded-lg bg-white/6 px-2 py-0.5 text-[12px] text-txt-dim">
                  {d.profitLabel}赚钱效应
                </span>
                <Stars value={d.profitStars} />
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                <Stat label="AI操作建议" value={<span className="text-[15px] font-bold text-accent">{d.suggestion}</span>} />
                <Stat label="建议仓位" value={<span className="text-up">{d.position}%</span>} tone="up" />
                <Stat
                  label="资金方向"
                  value={<span className="text-[13px] font-semibold text-txt">{d.fundDirection}</span>}
                />
                <Stat label="成交总额" value={<span className="text-[15px]">{d.totalAmountText}</span>} />
                <Stat
                  label="涨跌家数"
                  value={
                    <span className="text-[13px]">
                      <span className="text-up">{d.upCount}</span>
                      <span className="text-txt-faint"> / </span>
                      <span className="text-down">{d.downCount}</span>
                    </span>
                  }
                />
                <Stat label="平均涨跌" value={<UpDown value={d.avgChange} />} tone={d.avgChange >= 0 ? 'up' : 'down'} />
              </div>

              <div className="rounded-xl border border-accent/20 bg-accent/8 px-4 py-3">
                <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                  <IconSpark className="h-4 w-4" /> AI一句话
                </div>
                <p className="text-[14px] leading-relaxed text-txt">{d.oneLine}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* AI总结：板块强弱 */}
      <motion.div {...fade} transition={{ duration: 0.35, delay: 0.08 }}>
        <SectionTitle
          icon={<IconBolt className="h-4 w-4" />}
          title="AI总结 · 今天哪些板块强、哪些弱"
          sub="不是给你一堆代码，而是直接说结论"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <GlassCard title={<span className="text-up">今日最强板块</span>} icon={<IconBolt className="h-4 w-4" />}>
            <div className="space-y-2">
              {d.strongSectors.length ? (
                d.strongSectors.map((s) => (
                  <div key={s.code} className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
                    <span className="text-[13.5px] text-txt">{s.name}</span>
                    <span className="font-mono text-[13.5px] font-bold text-up">+{s.changePercent.toFixed(2)}%</span>
                  </div>
                ))
              ) : (
                <div className="text-[12.5px] text-txt-dim">今天没有明显的领涨板块，市场偏谨慎。</div>
              )}
            </div>
          </GlassCard>
          <GlassCard title={<span className="text-down">今日风险板块</span>} icon={<IconBolt className="h-4 w-4" />}>
            <div className="space-y-2">
              {d.weakSectors.length ? (
                d.weakSectors.map((s) => (
                  <div key={s.code} className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
                    <span className="text-[13.5px] text-txt">{s.name}</span>
                    <span className="font-mono text-[13.5px] font-bold text-down">{s.changePercent.toFixed(2)}%</span>
                  </div>
                ))
              ) : (
                <div className="text-[12.5px] text-txt-dim">今天没有明显的领跌板块，整体平稳。</div>
              )}
            </div>
          </GlassCard>
        </div>
      </motion.div>

      {/* 今日推荐（按你的画像筛选） */}
      <motion.div {...fade} transition={{ duration: 0.35, delay: 0.12 }}>
        <SectionTitle
          icon={<IconTarget className="h-4 w-4" />}
          title={`今日推荐 · 为「${profile.profileType}」定制`}
          sub="AI按你的风格从专属股票池筛出，附带可买指数与风险"
          right={
            <Link to="/discover" className="flex items-center gap-0.5 text-[12.5px] text-txt-dim hover:text-accent">
              发现更多 <IconChevron className="h-3.5 w-3.5 rotate-90" />
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recLoading && recs.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} lines={4} className="h-44" />)
            : recs.map((item, i) => <RecommendCard key={item.code} item={item} rank={i + 1} />)}
          {!recLoading && recs.length === 0 && (
            <div className="col-span-full glass rounded-2xl p-6 text-center text-[13px] text-txt-dim">
              今天没筛到合适又没涨过头的标的，建议先观望。换个周期可到「AI发现」。
            </div>
          )}
        </div>
      </motion.div>

      {/* 重要新闻解读（AI 解读，不是原文） */}
      <motion.div {...fade} transition={{ duration: 0.35, delay: 0.16 }}>
        <SectionTitle
          icon={<IconNews className="h-4 w-4" />}
          title="重要新闻解读"
          sub="AI 把市场变化翻译成你能用的结论"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {news.map((n, i) => (
            <GlassCard key={i} className="bg-glass-grad">
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-[14px] font-bold ${n.tone}`}>{n.title}</span>
                <Stars value={n.stars} />
              </div>
              <p className="text-[13px] leading-relaxed text-txt-dim">{n.oneLine}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {n.tags.map((t) => (
                  <span key={t} className="rounded-md bg-white/6 px-2 py-0.5 text-[11px] text-txt-faint">{t}</span>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-txt-faint">
          * 以上为 AI 基于行情数据的客观解读，非新闻原文，仅供学习参考。
        </p>
      </motion.div>

      {mode === 'beginner' && (
        <div className="glass rounded-2xl px-4 py-3 text-[12px] leading-relaxed text-txt-faint">
          你现在是 <span className="text-accent">新手模式</span>，复杂的 MACD/KDJ 等指标已自动翻译成人话。右上角可切换「专业模式」查看完整指标。
        </div>
      )}
    </div>
  );
}
