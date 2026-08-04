import { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { useMarketDiagnosis, useRecommendations, useBatchAdvice } from '@/queries';
import { getProfilePool, type RiskLevel, type RecommendItem } from '@/ai/recommend';
import { runCoach, type CoachReply, type UserProfile as CoachProfile } from '@/coach/engine';
import { GlassCard, ScoreRing, ActionBadge } from '@/components/ui';
import { IconCoach, IconSend, IconSpark, IconChevron } from '@/components/layout/icons';

function profileRisk(type: string): RiskLevel {
  if (type === '保守型') return '保守';
  if (type === '激进型') return '激进';
  return '稳健';
}

function currentSlot() {
  const h = new Date().getHours();
  if (h < 11) return 'morning';
  if (h < 14) return 'noon';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const SLOT_META: Record<string, { label: string; time: string; icon: string }> = {
  morning: { label: '早上', time: '09:00', icon: '🌅' },
  noon: { label: '中午', time: '12:30', icon: '☀️' },
  afternoon: { label: '下午', time: '14:30', icon: '🌤️' },
  evening: { label: '晚上', time: '20:00', icon: '🌙' },
};

function buildProactive(
  slot: string,
  d: any,
  recs: RecommendItem[],
  holdingsAdvice: { name: string; action: string }[],
) {
  if (slot === 'morning') {
    const names = recs.slice(0, 3).map((r) => r.name).join('、');
    return `早上好。今天市场温度 ${d.temperature}℃，AI 建议仓位 ${d.position}%，操作上「${d.suggestion}」。为你「${recs.length ? '' : ''}」定制的关注标的：${names || '暂无'}。别追高，按计划分批。`;
  }
  if (slot === 'noon') {
    return `午间播报：当前市场平均涨跌 ${d.avgChange}%，${d.fundDirection}。${d.strongSectors[0] ? `${d.strongSectors[0].name} 领涨` : '没有明显主线'}。下午开盘留意是否冲高回落，仓位重的可以适当锁利。`;
  }
  if (slot === 'afternoon') {
    const warns = holdingsAdvice.filter((h) => h.action === '减仓' || h.action === '卖出');
    if (warns.length) {
      return `下午提醒：你的持仓里 ${warns.map((w) => w.name).join('、')} 触发了减仓/卖出信号，建议降低仓位、锁定利润，别扛。`;
    }
    return `下午提醒：你的持仓整体信号平稳，暂时不需要调仓。市场${d.temperature >= 60 ? '偏强' : '偏弱'}，按早上的计划持有就好。`;
  }
  return `今日复盘：今天市场${d.temperature >= 60 ? '偏暖' : '偏弱'}，赚钱效应${d.profitLabel}。明天继续跟踪为你定制的标的，记住——不追高、设止损，比猜涨跌更重要。`;
}

interface ChatMsg {
  role: 'user' | 'ai';
  text?: string;
  reply?: CoachReply;
}

export default function CoachPage() {
  const profile = useUserStore((s) => s.profile);
  const holdings = useUserStore((s) => s.holdings);
  const slot = useMemo(currentSlot, []);

  const pool = useMemo(() => getProfilePool(profile.profileType), [profile.profileType]);
  const { data: diag } = useMarketDiagnosis();
  const { data: recs = [] } = useRecommendations({ limit: 6, pool, period: profile.period, risk: profileRisk(profile.profileType) });
  const { data: advices = [] } = useBatchAdvice(holdings.map((h) => h.secid));

  const holdingsAdvice = useMemo(
    () => advices.map((a) => ({ name: a.quote.name, action: a.action })),
    [advices],
  );

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, thinking]);

  const proactiveText = diag?.diagnosis
    ? buildProactive(slot, diag.diagnosis, recs, holdingsAdvice)
    : '正在生成今天的专属提醒…';

  const coachProfile: CoachProfile = {
    budget: profile.principal,
    risk: profileRisk(profile.profileType),
    period: profile.period,
    holdings: [],
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setThinking(true);
    try {
      const reply = await runCoach(t, coachProfile);
      setMsgs((m) => [...m, { role: 'ai', reply }]);
    } catch {
      setMsgs((m) => [...m, { role: 'ai', text: '网络波动，AI 没反应过来，稍后再问一次。' }]);
    } finally {
      setThinking(false);
    }
  };

  const quick = ['今天该买吗？', '帮我看看要不要调仓', '我的画像适合现在的市场吗？'];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 顶部 */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-glass text-accent-cyan">
          <IconCoach className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[16px] font-bold leading-tight text-txt">AI 教练</h2>
          <p className="text-[12px] text-txt-dim">你的私人投资经理，会主动找你</p>
        </div>
      </div>

      {/* 主动推送卡片 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(SLOT_META).map(([key, meta]) => {
          const active = key === slot;
          return (
            <GlassCard
              key={key}
              className={`${active ? 'bg-glass-grad ring-1 ring-accent/40' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-txt">
                  <span>{meta.icon}</span> {meta.label}推送
                </span>
                <span className="text-[11px] text-txt-faint">{meta.time}</span>
              </div>
              {active ? (
                <p className="text-[12.5px] leading-relaxed text-txt-dim">{proactiveText}</p>
              ) : (
                <p className="text-[12px] leading-relaxed text-txt-faint">
                  {key === 'morning' && '开盘前的今日计划'}
                  {key === 'noon' && '午间市场变化'}
                  {key === 'afternoon' && '尾盘调仓提醒'}
                  {key === 'evening' && '收盘后今日复盘'}
                </p>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* 对话区 */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
          {msgs.length === 0 && (
            <div className="coach-bubble">
              <p className="text-[13.5px] leading-relaxed text-txt">
                我是你的 AI 投资经理。不用你研究股票——你只管问，我告诉你<strong className="text-accent">现在该怎么办</strong>。
                试试下面的快捷问题，或直接说「我有 5 万，想买点稳健的」。
              </p>
            </div>
          )}

          {msgs.map((m, i) => (
            <div key={i}>
              {m.role === 'user' ? (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent-grad px-4 py-2.5 text-[13.5px] font-medium text-ink-900">
                  {m.text}
                </div>
              ) : m.text ? (
                <div className="coach-bubble">
                  <p className="text-[13.5px] leading-relaxed text-txt">{m.text}</p>
                </div>
              ) : (
                m.reply && (
                  <div className="space-y-2">
                    <div className="coach-bubble">
                      <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-txt">{m.reply.text}</p>
                    </div>
                    {m.reply.recommendations.map((r) => (
                      <Link key={r.code} to={`/stock/${r.code.startsWith('6') ? '1' : '0'}.${r.code}`}>
                        <GlassCard className="bg-glass-grad">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-bold text-txt">{r.name}</span>
                                <span className="font-mono text-[11px] text-txt-faint">{r.code}</span>
                              </div>
                              <div className="mt-0.5 text-[11.5px] text-txt-dim">
                                建议投入 ¥{r.amount.toLocaleString()} · 占预算 {r.percent}%
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ScoreRing value={r.score} size={48} label="评分" thickness={6} />
                              <ActionBadge action={r.signal} />
                            </div>
                          </div>
                          <div className="mt-2 text-[12px] leading-relaxed text-txt-faint">{r.riskNote}</div>
                          <div className="mt-1 flex items-center justify-end text-[11.5px] text-txt-dim">
                            看为什么 <IconChevron className="h-3.5 w-3.5 rotate-90" />
                          </div>
                        </GlassCard>
                      </Link>
                    ))}
                  </div>
                )
              )}
            </div>
          ))}

          {thinking && (
            <div className="coach-bubble">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-txt-faint" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-txt-faint [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-txt-faint [animation-delay:0.3s]" />
              </div>
            </div>
          )}
        </div>

        {/* 快捷问题 */}
        <div className="mt-2 flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full border border-line bg-glass px-3 py-1.5 text-[12.5px] text-txt-dim hover:border-accent/50 hover:text-accent"
            >
              {q}
            </button>
          ))}
        </div>

        {/* 输入 */}
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/6 px-3 py-2">
          <IconSpark className="h-4 w-4 text-accent" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="问我买什么 / 要不要卖 / 现在该怎么操作…"
            className="w-full bg-transparent text-[13.5px] text-txt outline-none placeholder:text-txt-faint"
          />
          <button
            onClick={() => send(input)}
            disabled={thinking || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-grad text-ink-900 disabled:opacity-40"
          >
            <IconSend className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
