import { MEDALS } from '@/store/aimsGrowthStore';

/** 勋章墙：已获得高亮，未获得灰显 */
export default function MedalWall({ earned }: { earned: string[] }) {
  const set = new Set(earned);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MEDALS.map((m) => {
        const got = set.has(m.id);
        return (
          <div
            key={m.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${got ? 'border-accent/40 bg-accent/10' : 'border-line bg-white/4 opacity-55'}`}
          >
            <span className="text-[20px]">{m.icon}</span>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-semibold text-txt">{m.name}</div>
              <div className="truncate text-[10.5px] text-txt-faint">{m.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
