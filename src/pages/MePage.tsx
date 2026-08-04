import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { GlassCard, SectionTitle } from '@/components/ui';
import { IconUser, IconEdit, IconBook, IconShield, IconTarget } from '@/components/layout/icons';
import BetaBadge from '@/components/aims/BetaBadge';
import GrowthPanel from '@/components/aims/GrowthPanel';
import AccuracyPanel from '@/components/aims/AccuracyPanel';
import DiaryPanel from '@/components/aims/DiaryPanel';
import FeedbackList from '@/components/aims/FeedbackList';

const TEACH = [
  { icon: '📈', title: '为什么涨 / 跌', body: '买的人多、愿意出更高价 → 涨；卖的人多、竞相压价 → 跌。价格就是买卖双方的博弈结果，不用想复杂。' },
  { icon: '🌊', title: '什么是放量', body: '成交量突然变大，说明今天参与的人特别多。上涨放量 = 真有人进场；下跌放量 = 大家在出逃，要小心。' },
  { icon: '📊', title: 'MACD 是什么', body: '看「趋势有没有形成」。红柱变长、快慢线金叉 → 上涨趋势开始形成；绿柱变长、死叉 → 趋势转弱。' },
  { icon: '🎯', title: 'KDJ 超买超卖', body: 'KDJ 到 80 以上 = 短期涨太快，像弹簧拉满，容易回落；到 20 以下 = 跌过头，可能反弹。' },
  { icon: '➰', title: '均线怎么看', body: '均线是把最近 N 天价格平均连成的线。股价站上均线、均线向上 = 趋势好；跌破且均线向下 = 走弱。' },
  { icon: '🛡️', title: '为什么设止损', body: '止损不是认输，是保命。买之前就想好「跌到哪我走」，到了就执行，避免一次亏太多、回不来。' },
];

export default function MePage() {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const mode = useUserStore((s) => s.mode);
  const toggleMode = useUserStore((s) => s.toggleMode);
  const resetProfile = useUserStore((s) => s.resetProfile);

  const reTest = () => {
    resetProfile();
    navigate('/onboarding');
  };

  return (
    <div className="space-y-5">
      {/* 画像卡片 */}
      <GlassCard className="overflow-hidden bg-glass-grad">
        <div className="flex items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-grad text-[18px] font-black text-ink-900">
              <IconUser className="h-6 w-6 text-ink-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold text-txt">{profile.profileType}投资者</span>
                <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[11px] text-txt-dim">{profile.experience}</span>
              </div>
              <div className="text-[12px] text-txt-dim">本金 ¥{profile.principal.toLocaleString()} · {profile.period} · 目标 {profile.targetReturn}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={reTest}
              className="flex items-center gap-1 rounded-xl border border-line bg-glass px-3 py-2 text-[12.5px] text-txt-dim hover:text-accent"
            >
              <IconEdit className="h-3.5 w-3.5" /> 重新测评
            </button>
            <BetaBadge />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line/40 sm:grid-cols-4">
          {[
            { k: '风险承受', v: profile.riskTolerance },
            { k: '投资风格', v: profile.style },
            { k: '年龄段', v: profile.age },
            { k: '周期', v: profile.period },
          ].map((it) => (
            <div key={it.k} className="bg-ink-900/40 px-4 py-3">
              <div className="text-[11px] text-txt-dim">{it.k}</div>
              <div className="text-[14px] font-semibold text-txt">{it.v}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* AI 成长系统（等级 / 经验 / 连续打卡 / 勋章） */}
      <GrowthPanel />

      {/* AI 历史准确率 */}
      <AccuracyPanel />

      {/* AI 投资日记 */}
      <DiaryPanel />

      {/* 小白教学 */}
      <div>
        <SectionTitle
          icon={<IconBook className="h-4 w-4" />}
          title="小白教学"
          sub="看不懂的指标，这里用人话讲明白"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEACH.map((t, i) => (
            <motion.div key={t.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
              <GlassCard>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[18px]">{t.icon}</span>
                  <span className="text-[14px] font-semibold text-txt">{t.title}</span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-txt-dim">{t.body}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Beta 反馈管理 */}
      <FeedbackList />

      {/* 设置 */}
      <div>
        <SectionTitle icon={<IconTarget className="h-4 w-4" />} title="设置" sub="调整显示与偏好" />
        <GlassCard>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13.5px] font-medium text-txt">显示模式</div>
                <div className="text-[11.5px] text-txt-dim">新手模式自动把指标翻译成人话</div>
              </div>
              <button
                onClick={toggleMode}
                className="relative flex h-8 w-16 items-center rounded-full bg-glass p-1"
              >
                <motion.span
                  layout
                  className="h-6 w-6 rounded-full bg-accent-grad"
                  style={{ marginLeft: mode === 'pro' ? 32 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <div className="text-[13.5px] font-medium text-txt">当前模式</div>
              <span className="rounded-lg bg-white/8 px-2.5 py-1 text-[12.5px] text-txt-dim">
                {mode === 'beginner' ? '新手模式' : '专业模式'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-txt">
                <IconShield className="h-4 w-4 text-txt-dim" /> 风险与免责
              </div>
              <span className="max-w-[60%] text-right text-[11.5px] leading-relaxed text-txt-faint">
                数据来自公开行情接口，仅供学习参考，不构成投资建议
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
