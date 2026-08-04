import { useState } from 'react';
import { GlassCard, SectionTitle, Meter, EmptyHint } from '@/components/ui';
import { useAimsAccuracyStore } from '@/store/aimsAccuracyStore';
import { IconTarget, IconChevron } from '@/components/layout/icons';
import { useQuery } from '@tanstack/react-query';

/** AI 历史准确率：近 30 天推荐命中率 + 可展开的历史记录 */
export default function AccuracyPanel() {
  const records = useAimsAccuracyStore((s) => s.records);
  const reconcile = useAimsAccuracyStore((s) => s.reconcile);
  const [showHistory, setShowHistory] = useState(false);

  const stats = useAimsAccuracyStore.getState().stats(30);

  // 点击查看历史时触发一次对账（拉取当前价计算涨/跌）
  const { refetch, isFetching } = useQuery({
    queryKey: ['accuracy-reconcile'],
    queryFn: () => reconcile(),
    enabled: false,
  });

  const openHistory = async () => {
    setShowHistory((v) => !v);
    if (!showHistory) await refetch();
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<IconTarget className="h-4 w-4" />}
        title="AI 历史准确率"
        sub="近 30 天推荐表现，点击可看历史"
        right={
          <button onClick={openHistory} className="flex items-center gap-0.5 text-[12.5px] text-txt-dim hover:text-accent">
            查看历史 <IconChevron className={`h-3.5 w-3.5 rotate-90 ${showHistory ? 'rotate-[-90deg]' : ''}`} />
          </button>
        }
      />

      <GlassCard className="bg-glass-grad">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div className="rounded-xl bg-white/4 px-3 py-3 text-center">
            <div className="text-[11px] text-txt-dim">近30天推荐</div>
            <div className="text-[22px] font-bold text-txt">{stats.total}</div>
            <div className="text-[10px] text-txt-faint">只</div>
          </div>
          <div className="rounded-xl bg-white/4 px-3 py-3 text-center">
            <div className="text-[11px] text-txt-dim">已验证</div>
            <div className="text-[22px] font-bold text-txt-dim">{stats.resolved}</div>
            <div className="text-[10px] text-txt-faint">只</div>
          </div>
          <div className="rounded-xl bg-white/4 px-3 py-3 text-center">
            <div className="text-[11px] text-txt-dim">上涨</div>
            <div className="text-[22px] font-bold text-up">{stats.wins}</div>
            <div className="text-[10px] text-txt-faint">只</div>
          </div>
          <div className="rounded-xl bg-white/4 px-3 py-3 text-center">
            <div className="text-[11px] text-txt-dim">成功率</div>
            <div className="text-[22px] font-bold text-accent">{stats.rate}%</div>
            <div className="text-[10px] text-txt-faint">验证样本</div>
          </div>
        </div>
        {stats.resolved > 0 && (
          <div className="px-4 pb-4">
            <Meter value={stats.rate} color="#37e6c9" height={8} />
          </div>
        )}
        {stats.resolved === 0 && (
          <div className="px-4 pb-4 text-[11.5px] text-txt-faint">推荐会随行情自动验证；过一两个交易日再来看成功率会更准。</div>
        )}
      </GlassCard>

      {showHistory && (
        <GlassCard title={isFetching ? '对账中…' : `推荐记录（${records.length}）`}>
          {records.length === 0 ? (
            <EmptyHint title="还没有推荐记录" desc="去首页或 AI 发现看看，AI 推荐的标的会自动记录在这里。" />
          ) : (
            <div className="max-h-80 space-y-1.5 overflow-y-auto no-scrollbar">
              {records.slice(0, 60).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-txt">{r.name}</span>
                      <span className="font-mono text-[10.5px] text-txt-faint">{r.code}</span>
                      <span className="text-[10.5px] text-txt-faint">{r.date}</span>
                    </div>
                    <div className="text-[11px] text-txt-dim">
                      评分 {r.composite} · 上涨概率 {r.upProb}% · 推荐价 {r.priceAtRec || '--'}
                      {r.currentPrice ? ` → 现 ${r.currentPrice}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {r.resolved ? (
                      r.result === 'win' ? (
                        <span className="text-[12px] font-bold text-up">上涨 ✓</span>
                      ) : (
                        <span className="text-[12px] font-bold text-down">下跌</span>
                      )
                    ) : (
                      <span className="text-[11px] text-txt-faint">待验证</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
