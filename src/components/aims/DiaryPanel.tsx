import { useState } from 'react';
import { GlassCard, SectionTitle, EmptyHint } from '@/components/ui';
import { useAimsDiaryStore } from '@/store/aimsDiaryStore';
import { useAimsMemoryStore } from '@/store/aimsMemoryStore';
import { useUserStore } from '@/store/userStore';
import { getRecommendations } from '@/ai/recommend';
import { IconBook, IconSpark } from '@/components/layout/icons';

/** AI 投资日记：每天自动生成今日市场 / 操作 / 收益 / 总结 */
export default function DiaryPanel() {
  const entries = useAimsDiaryStore((s) => s.entries);
  const generate = useAimsDiaryStore((s) => s.generate);
  const ops = useAimsMemoryStore((s) => s.ops);
  const profile = useUserStore((s) => s.profile);
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((e) => e.date === today);

  const makeToday = async () => {
    setBusy(true);
    try {
      const recs = await getRecommendations({ limit: 6, pool: [], period: profile.period, risk: profile.riskTolerance === '低' ? '保守' : profile.riskTolerance === '高' ? '激进' : '稳健' });
      const names = recs.slice(0, 5).map((r) => r.name);
      generate({ marketTemp: 50, marketLabel: '平稳', recs: names, opsCount: ops.filter((o) => o.date === today).length });
    } catch {
      generate({ marketTemp: 50, marketLabel: '平稳', recs: [], opsCount: ops.filter((o) => o.date === today).length });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<IconBook className="h-4 w-4" />}
        title="AI 投资日记"
        sub="每天自动记录市场、操作与成长"
        right={
          <button onClick={makeToday} disabled={busy} className="flex items-center gap-0.5 text-[12.5px] text-txt-dim hover:text-accent">
            <IconSpark className="h-3.5 w-3.5" /> {todayEntry ? '重新生成' : '生成今日'}
          </button>
        }
      />

      {todayEntry ? (
        <GlassCard title={`今日日记 · ${todayEntry.date}`} icon={<IconBook className="h-4 w-4" />}>
          <p className="text-[13px] leading-relaxed text-txt-dim">{todayEntry.summary}</p>
        </GlassCard>
      ) : (
        <GlassCard>
          <EmptyHint icon={<IconBook className="h-8 w-8" />} title="今天还没有日记" desc="点右上角「生成今日」让 AI 帮你记录今天的市场与操作。" />
        </GlassCard>
      )}

      {entries.length > 1 && (
        <GlassCard title="历史日记">
          <div className="max-h-72 space-y-1.5 overflow-y-auto no-scrollbar">
            {entries.slice(1, 40).map((e) => (
              <div key={e.date} className="rounded-lg bg-white/4 px-3 py-2">
                <div className="text-[12px] font-semibold text-txt">{e.date} · 市场{e.marketLabel}</div>
                <div className="text-[11.5px] text-txt-dim">{e.summary}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
