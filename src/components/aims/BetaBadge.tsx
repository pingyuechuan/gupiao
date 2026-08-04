import { APP_NAME, APP_STAGE, APP_VERSION } from '@/constants';

/** Beta 版本标识：Project Phoenix · Beta · v0.7 */
export default function BetaBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11.5px] font-semibold text-accent ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {APP_NAME} · {APP_STAGE} · v{APP_VERSION}
    </span>
  );
}
