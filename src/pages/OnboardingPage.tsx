import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore, type UserProfile } from '@/store/userStore';
import {
  GlassCard,
} from '@/components/ui';
import { IconCheck, IconArrowRight } from '@/components/layout/icons';

type Step = {
  key: keyof Pick<UserProfile, 'principal' | 'riskTolerance' | 'period' | 'targetReturn' | 'age' | 'experience' | 'style'>;
  q: string;
  sub?: string;
  options: { label: string; value: string | number; desc?: string }[];
};

const STEPS: Step[] = [
  {
    key: 'principal',
    q: '你的投资本金大概多少？',
    sub: 'AI 会按这个规模给你具体的仓位建议',
    options: [
      { label: '1 万以内', value: 5000 },
      { label: '1 - 5 万', value: 30000 },
      { label: '5 - 20 万', value: 100000 },
      { label: '20 - 50 万', value: 300000 },
      { label: '50 万以上', value: 800000 },
    ],
  },
  {
    key: 'riskTolerance',
    q: '你能接受多大的浮亏？',
    sub: '决定 AI 敢给你推荐多激进的标的',
    options: [
      { label: '一点都不能亏', value: '低', desc: '保守优先' },
      { label: '能接受小幅波动', value: '中', desc: '均衡' },
      { label: '波动大也行', value: '高', desc: '追求弹性' },
    ],
  },
  {
    key: 'period',
    q: '你打算拿多久？',
    sub: '短线看情绪，长线看价值',
    options: [
      { label: '几天~几周', value: '短线', desc: '看热点' },
      { label: '几周到数月', value: '中线', desc: '看趋势' },
      { label: '半年以上', value: '长线', desc: '看价值' },
    ],
  },
  {
    key: 'targetReturn',
    q: '你希望达到什么收益目标？',
    options: [
      { label: '跑赢通胀就好', value: '跑赢通胀' },
      { label: '年化 8% 左右', value: '年化8%' },
      { label: '年化 15%+', value: '年化15%' },
      { label: '追求高收益', value: '财务自由' },
    ],
  },
  {
    key: 'age',
    q: '你的年龄段？',
    sub: '帮助 AI 理解你的风险周期',
    options: [
      { label: '30 岁以下', value: '<30' },
      { label: '30 - 45 岁', value: '30-45' },
      { label: '45 - 60 岁', value: '45-60' },
      { label: '60 岁以上', value: '>60' },
    ],
  },
  {
    key: 'experience',
    q: '你的炒股经验？',
    sub: '纯小白也没关系，AI 会把指标翻译成人话',
    options: [
      { label: '纯小白', value: '小白' },
      { label: '1 - 3 年', value: '1-3年' },
      { label: '3 年以上', value: '3年以上' },
    ],
  },
  {
    key: 'style',
    q: '你更偏向哪种风格？',
    sub: '决定 AI 给你推什么类型的股票',
    options: [
      { label: '稳健', value: '稳健', desc: '不亏最重要' },
      { label: '价值', value: '价值', desc: '买便宜好公司' },
      { label: '成长', value: '成长', desc: '追高景气赛道' },
      { label: '激进', value: '激进', desc: '敢上高弹性' },
    ],
  },
];

const fade = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const setProfile = useUserStore((s) => s.setProfile);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const profileType = useUserStore((s) => s.profile.profileType);
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step >= STEPS.length;

  const pick = (value: string | number) => {
    setProfile({ [current.key]: value } as Partial<UserProfile>);
    setTimeout(() => setStep((s) => s + 1), 180);
  };

  const finish = () => {
    completeOnboarding();
    navigate('/');
  };

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-radial-glow p-4">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-grad text-[22px] font-black text-ink-900">
            AI
          </div>
          <h1 className="text-[22px] font-bold text-txt">先花 30 秒，让 AI 认识你</h1>
          <p className="mt-1 text-[13px] text-txt-dim">
            之后所有推荐，都会按你的画像来——不同人看到的首页完全不同。
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!isLast ? (
            <motion.div key={step} {...fade} transition={{ duration: 0.3 }}>
              <GlassCard className="bg-glass-grad">
                <div className="mb-1 flex items-center justify-between text-[12px] text-txt-faint">
                  <span>第 {step + 1} / {STEPS.length} 步</span>
                  <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
                </div>
                <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-accent-grad"
                    initial={{ width: 0 }}
                    animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <h2 className="mt-4 text-[19px] font-bold text-txt">{current.q}</h2>
                {current.sub && <p className="mb-4 text-[13px] text-txt-dim">{current.sub}</p>}

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {current.options.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => pick(opt.value)}
                      className="group flex items-center justify-between rounded-xl border border-line bg-white/4 px-4 py-3 text-left transition-all hover:border-accent/50 hover:bg-accent/10"
                    >
                      <span>
                        <span className="block text-[14.5px] font-medium text-txt">{opt.label}</span>
                        {opt.desc && <span className="block text-[11.5px] text-txt-faint">{opt.desc}</span>}
                      </span>
                      <IconArrowRight className="h-4 w-4 text-txt-faint transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                    </button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div key="summary" {...fade} transition={{ duration: 0.3 }}>
              <GlassCard className="bg-glass-grad text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <IconCheck className="h-7 w-7" />
                </div>
                <h2 className="mb-1 text-[18px] font-bold text-txt">AI 已为你生成画像</h2>
                <div className="my-4 inline-flex items-center gap-2 rounded-2xl bg-accent-grad px-5 py-2.5 text-[18px] font-black text-ink-900">
                  {profileType}投资者
                </div>
                <p className="mx-auto max-w-sm text-[13.5px] leading-relaxed text-txt-dim">
                  之后首页推荐、AI发现、持仓诊断都会围绕「{profileType}」来展开。
                  随时可以在「我的」里重新测评。
                </p>
                <button
                  onClick={finish}
                  className="btn-accent mt-6 w-full py-3 text-[15px] font-bold"
                >
                  进入我的投资教练 <IconArrowRight className="ml-1 inline h-4 w-4" />
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-5 text-center text-[11px] text-txt-faint">
          数据仅供学习参考，不构成投资建议。投资有风险，入市需谨慎。
        </p>
      </div>
    </div>
  );
}
