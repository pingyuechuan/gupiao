import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getStockAdvice, type StockAdvice } from '@/ai/advice';
import { explainIndicator, type IndicatorKeyHuman } from '@/ai/translate';
import { computeKlineSignals } from '@/ai/klineSignals';
import KLineChart from '@/components/charts/KLineChart';
import TimeShareChart from '@/components/charts/TimeShareChart';
import { useKline, useTimeShare } from '@/queries';
import { useUserStore } from '@/store/userStore';
import { useAimsMemoryStore, type OpAction } from '@/store/aimsMemoryStore';
import { useAimsGrowthStore } from '@/store/aimsGrowthStore';
import AIMSCard from '@/components/aims/AIMSCard';
import {
  GlassCard,
  UpDown,
  Skeleton,
  EmptyHint,
} from '@/components/ui';
import type { KlinePeriod } from '@/types';
import {
  IconStar,
  IconChevron,
  IconBolt,
  IconShield,
  IconEdit,
} from '@/components/layout/icons';

const PERIODS: { key: KlinePeriod; label: string }[] = [
  { key: 'min60', label: '60分' },
  { key: 'day', label: '日K' },
  { key: 'week', label: '周K' },
  { key: 'month', label: '月K' },
];

const PRO_INDICATORS: { key: IndicatorKeyHuman; name: string }[] = [
  { key: 'MA', name: '均线' },
  { key: 'MACD', name: 'MACD' },
  { key: 'KDJ', name: 'KDJ' },
  { key: 'RSI', name: 'RSI' },
  { key: 'BOLL', name: '布林带' },
  { key: 'VOL', name: '成交量' },
];

export default function StockDetailPage() {
  const { secid = '' } = useParams();
  const mode = useUserStore((s) => s.mode);
  const isWatched = useUserStore((s) => s.favorites.includes(secid));
  const toggleWatch = useUserStore((s) => s.toggleWatch);
  const [period, setPeriod] = useState<KlinePeriod>('day');
  const [tab, setTab] = useState<'kline' | 'time'>('kline');
  const [recOpen, setRecOpen] = useState(false);
  const [recAction, setRecAction] = useState<OpAction>('买入');
  const [toast, setToast] = useState('');

  const addOperation = useAimsMemoryStore((s) => s.addOperation);
  const recordTrade = useAimsGrowthStore((s) => s.recordTrade);
  const recordStop = useAimsGrowthStore((s) => s.recordStop);
  const recordCorrect = useAimsGrowthStore((s) => s.recordCorrect);

  const doRecord = () => {
    if (!advice) return;
    const q = advice.quote;
    const chg = q.changePercent;
    const chased = (recAction === '买入' || recAction === '加仓') && chg > 5;
    addOperation({
      secid,
      code: q.code,
      name: q.name,
      action: recAction,
      price: q.price,
      changePercentAtAction: chg,
      chasedHigh: chased,
    });
    if (recAction === '卖出' || recAction === '减仓') recordStop();
    else recordTrade();
    if (advice.aims.composite >= 60 && (recAction === '买入' || recAction === '加仓')) recordCorrect();
    setRecOpen(false);
    setToast(chased ? '已记录（标记为追高，AI 会记住）' : '已记录到 AI 记忆');
    setTimeout(() => setToast(''), 2000);
  };

  const { data: advice, isLoading } = useQuery<StockAdvice>({
    queryKey: ['advice', secid],
    queryFn: () => getStockAdvice(secid),
    enabled: !!secid,
  });

  const { data: klines } = useKline(secid || undefined, period);
  const { data: time } = useTimeShare(secid || undefined);

  // 当前周期的 AI 标记（K线图用）
  const signals = useMemo(() => {
    if (!klines) return null;
    return computeKlineSignals(klines);
  }, [klines]);

  if (isLoading && !advice) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!advice) {
    return <EmptyHint title="没拿到行情数据" desc="可能是数据源暂不可用，稍后重试或换个标的。" />;
  }

  const q = advice.quote;
  const up = q.changePercent >= 0;

  return (
    <div className="space-y-5">
      {/* 顶部：名称 + 价格 + 自选 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div className="flex items-end gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-black text-txt">{q.name}</h1>
              <span className="font-mono text-[13px] text-txt-dim">{q.code}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`font-mono text-[30px] font-black ${up ? 'text-up' : 'text-down'}`}>
                {q.price.toFixed(2)}
              </span>
              <span className={`font-mono text-[15px] font-bold ${up ? 'text-up' : 'text-down'}`}>
                <UpDown value={q.changePercent} />
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              toggleWatch(secid);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${
              isWatched
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-line bg-glass text-txt-dim hover:text-txt'
            }`}
          >
            <IconStar className="h-4 w-4" /> {isWatched ? '已自选' : '加自选'}
          </button>
        </div>
      </motion.div>

      {/* AIMS 统一决策（所有 AI 建议的单一来源） */}
      <AIMSCard aims={advice.aims} />

      {/* 记录我的操作 → 喂给 AI 记忆系统 */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setRecOpen((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-glass px-4 py-3 text-[13.5px] font-semibold text-txt hover:border-accent/40"
        >
          <IconEdit className="h-4 w-4" /> 记录我的操作（买入 / 卖出 / 减仓）
        </button>
        {recOpen && (
          <GlassCard>
            <div className="flex flex-wrap items-center gap-2">
              {(['买入', '加仓', '持有', '减仓', '卖出'] as OpAction[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setRecAction(a)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
                    recAction === a ? 'bg-accent-grad text-ink-900' : 'bg-white/6 text-txt-dim hover:text-txt'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-txt-faint">
              当前涨幅 {q.changePercent.toFixed(2)}%
              {(recAction === '买入' || recAction === '加仓') && q.changePercent > 5 ? '，将被标记为「追高」' : ''}
              。记录后 AI 会在后续建议中结合你的历史行为。
            </p>
            <button onClick={doRecord} className="btn-accent mt-3 w-full py-2.5 text-[14px] font-bold">
              确认记录
            </button>
          </GlassCard>
        )}
        {toast && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-center text-[12.5px] text-txt">
            🧠 {toast}
          </div>
        )}
      </div>

      {mode === 'pro' && (
        <GlassCard title="专业指标（人话版）" icon={<IconBolt className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRO_INDICATORS.map((ind) => (
              <div key={ind.key} className="rounded-lg bg-white/4 px-3 py-2">
                <div className="text-[11.5px] font-semibold text-txt">{ind.name}</div>
                <div className="text-[12px] text-txt-dim">{explainIndicator(ind.key, klines ?? [])}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* K线 / 分时 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <GlassCard padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-1">
              {(['kline', 'time'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    tab === t ? 'bg-accent/15 text-accent' : 'text-txt-dim hover:text-txt'
                  }`}
                >
                  {t === 'kline' ? 'K线' : '分时'}
                </button>
              ))}
            </div>
            {tab === 'kline' && (
              <div className="flex items-center gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] transition-colors ${
                      period === p.key ? 'bg-glass text-accent' : 'text-txt-dim hover:text-txt'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3">
            {tab === 'kline' ? (
              klines?.length ? (
                <KLineChart klines={klines} signals={signals} mode={mode} height={440} />
              ) : (
                <div className="flex h-80 items-center justify-center text-[13px] text-txt-dim">
                  加载K线中…
                </div>
              )
            ) : time?.length ? (
              <TimeShareChart points={time} preClose={q.preClose} height={360} />
            ) : (
              <div className="flex h-80 items-center justify-center text-[13px] text-txt-dim">
                加载分时中…
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* AI 标记说明 */}
      {tab === 'kline' && signals && (
        <div className="flex flex-wrap gap-2 text-[11.5px]">
          <span className="chip border-down/30 text-down">● AI买点（金叉）</span>
          <span className="chip border-up/30 text-up">● AI卖点（死叉）</span>
          <span className="chip border-down/30 text-down">— 止损</span>
          <span className="chip border-up/30 text-up">— 止盈</span>
          <span className="chip border-[#5b8cff]/30 text-[#5b8cff]">— 支撑</span>
          <span className="chip border-[#f5a623]/30 text-[#f5a623]">— 压力</span>
          {signals.riskZone && <span className="chip border-[#ff5470]/30 text-up">▦ 风险区</span>}
        </div>
      )}

      {/* 风险提示 */}
      <div className="flex items-start gap-2 rounded-2xl border border-up/20 bg-up/5 px-4 py-3">
        <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-up" />
        <p className="text-[12px] leading-relaxed text-txt-dim">
          AI 建议基于历史量价规律，<span className="text-up">仅供学习参考，不构成投资建议</span>。
          止损/止盈价为技术位测算，请结合自己的风险承受能力操作，股市有风险，入市需谨慎。
        </p>
      </div>

      {/* 持仓跳转 */}
      <Link
        to="/portfolio"
        className="flex items-center justify-center gap-1 text-[12.5px] text-txt-dim hover:text-accent"
      >
        去我的持仓看 AI 每日诊断 <IconChevron className="h-3.5 w-3.5 rotate-90" />
      </Link>
    </div>
  );
}
