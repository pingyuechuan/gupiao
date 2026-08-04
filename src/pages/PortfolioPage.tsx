import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { useBatchAdvice, useSearch } from '@/queries';
import { getProfilePool } from '@/ai/recommend';
import { toSecid } from '@/utils/format';
import { GlassCard, ScoreRing, ActionBadge, UpDown, EmptyHint, SkeletonCard, Stat } from '@/components/ui';
import { IconWallet, IconSearch, IconSpark, IconBolt } from '@/components/layout/icons';
import type { StockInfo } from '@/types';

function AddPanel({ onClose }: { onClose: () => void }) {
  const [kw, setKw] = useState('');
  const [cost, setCost] = useState('');
  const [shares, setShares] = useState('');
  const [picked, setPicked] = useState<StockInfo | null>(null);
  const { data: results = [] } = useSearch(kw);
  const addHolding = useUserStore((s) => s.addHolding);

  const confirm = () => {
    if (!picked) return;
    const c = Number(cost) || 0;
    const sh = Number(shares) || 100;
    addHolding({
      secid: toSecid(picked.code),
      code: picked.code,
      name: picked.name,
      cost: c,
      shares: sh,
    });
    onClose();
  };

  return (
    <GlassCard className="bg-glass-grad">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-txt">添加持仓</span>
        <button onClick={onClose} className="text-[12px] text-txt-dim hover:text-txt">取消</button>
      </div>

      {!picked ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl bg-white/6 px-3 py-2">
            <IconSearch className="h-4 w-4 text-txt-faint" />
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="搜股票代码或名称，如 600519 / 茅台"
              className="w-full bg-transparent text-[13.5px] text-txt outline-none placeholder:text-txt-faint"
            />
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto no-scrollbar">
            {results.map((r) => (
              <button
                key={r.code}
                onClick={() => setPicked(r)}
                className="flex w-full items-center justify-between rounded-lg bg-white/4 px-3 py-2 text-left hover:bg-accent/10"
              >
                <span className="text-[13.5px] text-txt">{r.name}</span>
                <span className="font-mono text-[12px] text-txt-faint">{r.code}</span>
              </button>
            ))}
            {kw && results.length === 0 && (
              <div className="px-2 py-3 text-center text-[12px] text-txt-faint">没搜到，换个关键词试试</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
            <span className="text-[14px] font-medium text-txt">{picked.name}</span>
            <span className="font-mono text-[12px] text-txt-faint">{picked.code}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-txt-dim">成本价</span>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="rounded-xl bg-white/6 px-3 py-2 text-[13.5px] text-txt outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-txt-dim">股数</span>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="100"
                className="rounded-xl bg-white/6 px-3 py-2 text-[13.5px] text-txt outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
          </div>
          <button onClick={confirm} className="btn-accent w-full py-2.5 text-[14px] font-bold">
            加入持仓
          </button>
        </div>
      )}
    </GlassCard>
  );
}

export default function PortfolioPage() {
  const holdings = useUserStore((s) => s.holdings);
  const removeHolding = useUserStore((s) => s.removeHolding);
  const profile = useUserStore((s) => s.profile);
  const [adding, setAdding] = useState(false);

  const secids = useMemo(() => holdings.map((h) => h.secid), [holdings]);
  const { data: advices = [], isLoading } = useBatchAdvice(secids);
  const poolSet = useMemo(() => new Set(getProfilePool(profile.profileType)), [profile.profileType]);

  const adviceByCode = useMemo(() => {
    const m = new Map<string, (typeof advices)[number]>();
    advices.forEach((a) => m.set(a.quote.code, a));
    return m;
  }, [advices]);

  const summary = useMemo(() => {
    let mv = 0;
    let pnl = 0;
    holdings.forEach((h) => {
      const a = adviceByCode.get(h.code);
      const price = a?.quote.price ?? h.cost;
      mv += price * h.shares;
      pnl += (price - h.cost) * h.shares;
    });
    return { mv, pnl };
  }, [holdings, adviceByCode]);

  return (
    <div className="space-y-5">
      {/* 顶部 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-glass text-accent-cyan">
            <IconWallet className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[16px] font-bold leading-tight text-txt">我的持仓</h2>
            <p className="text-[12px] text-txt-dim">真实仓位管理，AI 每天给你诊断</p>
          </div>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-xl bg-accent-grad px-4 py-2 text-[13px] font-bold text-ink-900"
        >
          {adding ? '收起' : '+ 添加持仓'}
        </button>
      </div>

      {adding && <AddPanel onClose={() => setAdding(false)} />}

      {holdings.length === 0 && !adding ? (
        <GlassCard>
          <EmptyHint
            icon={<IconWallet className="h-10 w-10" />}
            title="还没有持仓"
            desc="添加你的真实持仓，AI 会每天告诉你：继续持有、加仓、还是减仓，并给出目标价与止损位。"
          />
          <div className="flex justify-center">
            <button onClick={() => setAdding(true)} className="btn-accent px-5 py-2.5 text-[13.5px] font-bold">
              + 添加第一只持仓
            </button>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* 汇总 */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <GlassCard>
              <Stat label="持仓市值" value={<span className="text-[20px] font-bold text-txt">¥{summary.mv.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span>} />
            </GlassCard>
            <GlassCard>
              <Stat
                label="持仓盈亏"
                value={<span className={`text-[20px] font-bold ${summary.pnl >= 0 ? 'text-up' : 'text-down'}`}>{summary.pnl >= 0 ? '+' : ''}{summary.pnl.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span>}
                sub={<UpDown value={summary.mv ? (summary.pnl / (summary.mv - summary.pnl)) * 100 : 0} />}
              />
            </GlassCard>
            <GlassCard>
              <Stat label="持仓数" value={<span className="text-[20px] font-bold text-txt">{holdings.length}</span>} sub="AI 每日更新" />
            </GlassCard>
          </div>

          {/* 持仓卡片 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {holdings.map((h) => {
              const a = adviceByCode.get(h.code);
              const price = a?.quote.price ?? h.cost;
              const mv = price * h.shares;
              const pnl = (price - h.cost) * h.shares;
              const pnlPct = h.cost ? ((price - h.cost) / h.cost) * 100 : 0;
              const fit = poolSet.has(h.code);
              if (!a && isLoading) return <SkeletonCard key={h.secid} lines={4} className="h-44" />;
              return (
                <motion.div key={h.secid} layout>
                  <GlassCard className="bg-glass-grad">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/stock/${h.secid}`} className="text-[16px] font-bold text-txt hover:text-accent">
                          {h.name}
                        </Link>
                        <div className="font-mono text-[12px] text-txt-faint">{h.code}</div>
                      </div>
                      <button
                        onClick={() => removeHolding(h.secid)}
                        className="text-[12px] text-txt-faint hover:text-down"
                      >
                        移除
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white/4 py-2">
                        <div className="text-[11px] text-txt-dim">市值</div>
                        <div className="text-[14px] font-bold text-txt">¥{(mv / 10000).toFixed(1)}万</div>
                      </div>
                      <div className="rounded-xl bg-white/4 py-2">
                        <div className="text-[11px] text-txt-dim">盈亏</div>
                        <div className={`text-[14px] font-bold ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/4 py-2">
                        <div className="text-[11px] text-txt-dim">收益率</div>
                        <div className={pnl >= 0 ? 'text-up' : 'text-down'}>
                          <UpDown value={pnlPct} />
                        </div>
                      </div>
                    </div>

                    {/* AI 每日诊断 */}
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/8 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <IconSpark className="h-4 w-4 text-accent" />
                        <span className="text-[13px] text-txt">AI 建议</span>
                        <ActionBadge action={a?.action ?? '持有'} />
                      </div>
                      <div className="text-[11.5px] text-txt-dim">
                        {a ? `目标 ${a.takeProfit.toFixed(2)} · 止损 ${a.stopLoss.toFixed(2)}` : '计算中…'}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {a && <ScoreRing value={a.signal.score} size={52} label="评分" thickness={6} />}
                      <div className="flex items-center gap-2">
                        {fit ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-up/12 px-2 py-1 text-[11.5px] font-semibold text-up">
                            <IconBolt className="h-3.5 w-3.5" /> 符合你的画像
                          </span>
                        ) : (
                          <span className="rounded-lg bg-white/6 px-2 py-1 text-[11.5px] text-txt-faint">中性持仓</span>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
