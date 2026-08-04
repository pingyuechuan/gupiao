import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, Meter, scoreColor } from '@/components/ui';
import { IconBolt, IconChevron } from '@/components/layout/icons';
import type { AIMSResult, DimensionScore } from '@/aims/types';

/** risk 维度反向着色：分数越高=越危险 */
function dimColor(d: DimensionScore): string {
  if (d.invertColor) {
    const v = d.rawLevel ?? 100 - d.score;
    return v >= 70 ? '#ff5470' : v >= 45 ? '#f5a623' : '#19c37d';
  }
  return scoreColor(d.score);
}
function dimValue(d: DimensionScore): number {
  return d.invertColor ? d.rawLevel ?? 100 - d.score : d.score;
}

/**
 * AI 解释组件：任何建议都可展开「为什么」，展示
 * 市场 / 行业 / 资金 / 趋势 / 风险 五维评分 + 用户匹配度 + 最终评分。
 * 全产品统一使用，保证解释口径一致。
 */
export default function WhyExpansion({ aims, defaultOpen = false }: { aims: AIMSResult; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[14.5px] font-bold text-txt">
          <IconBolt className="h-4 w-4 text-accent" /> 为什么这么建议？
        </span>
        <span className={`text-txt-dim transition-transform ${open ? 'rotate-180' : ''}`}>
          <IconChevron className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 overflow-hidden"
        >
          <GlassCard>
            <div className="space-y-3">
              {aims.dimensions.map((d) => (
                <div key={d.key}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-txt">
                      {d.label}
                      <span className="ml-1 text-txt-faint">· {Math.round(d.weight * 100)}%</span>
                    </span>
                    <span className="font-bold" style={{ color: dimColor(d) }}>
                      {d.invertColor ? `风险 ${dimValue(d)}` : dimValue(d)}
                    </span>
                  </div>
                  <Meter value={dimValue(d)} color={dimColor(d)} height={6} />
                  <div className="mt-1 text-[11.5px] text-txt-dim">{d.note}</div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
                <div className="rounded-xl bg-white/4 p-3">
                  <div className="text-[11px] text-txt-dim">用户匹配度</div>
                  <div className="text-[18px] font-bold" style={{ color: scoreColor(aims.userMatch) }}>
                    {aims.userMatch}
                  </div>
                  <Meter value={aims.userMatch} color={scoreColor(aims.userMatch)} height={5} />
                </div>
                <div className="rounded-xl bg-white/4 p-3">
                  <div className="text-[11px] text-txt-dim">最终评分</div>
                  <div className="text-[18px] font-bold text-accent">{aims.composite}</div>
                  <Meter value={aims.composite} color="#37e6c9" height={5} />
                </div>
              </div>

              {aims.usedMemory && aims.behavioralNote && (
                <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] leading-relaxed text-txt">
                  🧠 {aims.behavioralNote}
                </div>
              )}
              <div className="text-[10.5px] text-txt-faint">
                AIMS 统一决策：五维各占 20%，最终评分 = 五维×0.7 + 用户匹配度×0.3。仅供学习参考，不构成投资建议。
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
