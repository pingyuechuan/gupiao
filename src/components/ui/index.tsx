import type { ReactNode, CSSProperties } from 'react';
import { motion } from 'framer-motion';

/* ============ GlassCard ============ */
export function GlassCard({
  children,
  className = '',
  title,
  icon,
  right,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={`glass rounded-2xl ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="text-accent-cyan">{icon}</span>}
            <h3 className="truncate text-[14px] font-semibold text-txt">{title}</h3>
          </div>
          {right}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

/* ============ SectionTitle ============ */
export function SectionTitle({
  icon,
  title,
  sub,
  right,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-glass text-accent-cyan">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-[16px] font-bold leading-tight text-txt">{title}</h2>
          {sub && <p className="text-[12px] text-txt-dim">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ============ 颜色工具 ============ */
export function scoreColor(score: number): string {
  if (score >= 75) return '#19c37d';
  if (score >= 60) return '#37e6c9';
  if (score >= 45) return '#5b8cff';
  if (score >= 30) return '#f5a623';
  return '#ff5470';
}

export function changeTone(v: number): string {
  if (v > 0) return 'text-up';
  if (v < 0) return 'text-down';
  return 'text-txt-dim';
}

/* ============ ScoreRing ============ */
export function ScoreRing({
  value,
  size = 96,
  label,
  sub,
  thickness = 8,
}: {
  value: number;
  size?: number;
  label?: string;
  sub?: string;
  thickness?: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const color = scoreColor(v);
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
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
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-bold leading-none" style={{ color }}>
          {Math.round(v)}
        </span>
        {label && <span className="mt-0.5 text-[10.5px] text-txt-dim">{label}</span>}
        {sub && <span className="text-[10px] text-txt-faint">{sub}</span>}
      </div>
    </div>
  );
}

/* ============ SignalBadge ============ */
export function SignalBadge({ signal }: { signal: string }) {
  const map: Record<string, string> = {
    买入: 'bg-up/15 text-up border-up/30',
    增持: 'bg-up/12 text-up border-up/25',
    观望: 'bg-glass text-txt-dim border-line',
    减持: 'bg-down/12 text-down border-down/25',
    卖出: 'bg-down/15 text-down border-down/30',
  };
  const cls = map[signal] ?? 'bg-glass text-txt-dim border-line';
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold ${cls}`}>
      {signal}
    </span>
  );
}

/* ============ ActionBadge（小白操作建议） ============ */
export function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { cls: string; icon: string }> = {
    买入: { cls: 'bg-up/15 text-up', icon: '▲' },
    加仓: { cls: 'bg-up/12 text-up', icon: '▲' },
    持有: { cls: 'bg-accent/15 text-accent', icon: '＝' },
    减仓: { cls: 'bg-down/12 text-down', icon: '▼' },
    卖出: { cls: 'bg-down/15 text-down', icon: '▼' },
    观望: { cls: 'bg-glass text-txt-dim', icon: '·' },
  };
  const m = map[action] ?? map['观望'];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12.5px] font-bold ${m.cls}`}>
      <span className="text-[10px]">{m.icon}</span>
      {action}
    </span>
  );
}

/* ============ Stars ============ */
export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value}星`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={i < value ? 'text-[#f5c451]' : 'text-txt-faint/40'}
          style={{ fontSize: 13 }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/* ============ Stat ============ */
export function Stat({
  label,
  value,
  tone = 'default',
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'up' | 'down' | 'accent';
  sub?: ReactNode;
}) {
  const toneCls =
    tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : tone === 'accent' ? 'text-accent' : 'text-txt';
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-txt-dim">{label}</span>
      <span className={`text-[18px] font-bold leading-tight ${toneCls}`}>{value}</span>
      {sub && <span className="text-[10.5px] text-txt-faint">{sub}</span>}
    </div>
  );
}

/* ============ UpDown ============ */
export function UpDown({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const sign = value > 0 ? '+' : '';
  return <span className={changeTone(value)}>{`${sign}${value.toFixed(2)}${suffix}`}</span>;
}

/* ============ Skeleton ============ */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`glass space-y-3 rounded-2xl p-4 ${className}`}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

/* ============ 进度条 ============ */
export function Meter({
  value,
  color = '#5b8cff',
  label,
  height = 6,
}: {
  value: number;
  color?: string;
  label?: ReactNode;
  height?: number;
}) {
  return (
    <div className="w-full">
      {label && <div className="mb-1 flex justify-between text-[11px] text-txt-dim">{label}</div>}
      <div className="w-full overflow-hidden rounded-full bg-white/8" style={{ height }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ============ 通用容器 ============ */
export function EmptyHint({ icon, title, desc }: { icon?: ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="text-txt-faint">{icon}</div>}
      <div className="text-[14px] font-medium text-txt-dim">{title}</div>
      {desc && <div className="max-w-xs text-[12px] leading-relaxed text-txt-faint">{desc}</div>}
    </div>
  );
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export type Tone = CSSProperties;
