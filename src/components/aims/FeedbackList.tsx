import { GlassCard, SectionTitle, EmptyHint } from '@/components/ui';
import { useFeedbackStore } from '@/store/feedbackStore';
import { IconBolt } from '@/components/layout/icons';

const TYPE_LABEL: Record<string, string> = { bug: '🐞 Bug', suggestion: '💡 建议', rating: '⭐ 评分' };

/** Beta 反馈统一管理：列出用户提交的所有反馈 */
export default function FeedbackList() {
  const items = useFeedbackStore((s) => s.items);
  const remove = useFeedbackStore((s) => s.remove);

  return (
    <div className="space-y-4">
      <SectionTitle icon={<IconBolt className="h-4 w-4" />} title="Beta 反馈管理" sub={`已收集 ${items.length} 条反馈`} />
      {items.length === 0 ? (
        <GlassCard>
          <EmptyHint icon={<IconBolt className="h-8 w-8" />} title="还没有反馈" desc="点右下角 🐞 按钮随时提交 Bug / 建议 / 评分。" />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((f) => (
            <GlassCard key={f.id} className="bg-glass-grad">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] text-txt-dim">{TYPE_LABEL[f.type]}</span>
                    <span className="truncate text-[13.5px] font-semibold text-txt">{f.title}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-txt-faint">{f.date}</div>
                </div>
                <button onClick={() => remove(f.id)} className="text-[11px] text-txt-faint hover:text-down">
                  删除
                </button>
              </div>
              {f.body && <p className="mt-2 text-[12.5px] leading-relaxed text-txt-dim">{f.body}</p>}
              {f.rating != null && (
                <div className="mt-1.5 text-[15px]" style={{ color: '#f5c451' }}>
                  {'★'.repeat(f.rating)}
                  <span className="text-txt-faint">{'★'.repeat(5 - f.rating)}</span>
                </div>
              )}
              {f.contact && <div className="mt-1 text-[11px] text-txt-faint">联系方式：{f.contact}</div>}
              {f.screenshot && (
                <img src={f.screenshot} alt="截图" className="mt-2 max-h-32 rounded-lg border border-line object-cover" />
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
