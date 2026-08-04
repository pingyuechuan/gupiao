import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { useSearch } from '@/queries';
import { stockService } from '@/services/StockService';
import { IconSearch, IconRefresh, IconSpark } from '@/components/layout/icons';
import { queryClient } from '@/queries';

export default function TopBar() {
  const navigate = useNavigate();
  const mode = useUserStore((s) => s.mode);
  const toggleMode = useUserStore((s) => s.toggleMode);
  const [kw, setKw] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { data: results = [] } = useSearch(kw);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (secid: string) => {
    setOpen(false);
    setKw('');
    navigate(`/stock/${secid}`);
  };

  return (
    <header className="glass z-10 flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
      <div className="relative flex-1 max-w-xl" ref={boxRef}>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-800/60 px-3 py-2 focus-within:border-accent">
          <IconSearch className="text-txt-dim" />
          <input
            value={kw}
            onChange={(e) => {
              setKw(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="搜索股票 / 代码，例如 茅台、600519"
            className="w-full bg-transparent text-[13.5px] text-txt outline-none placeholder:text-txt-faint"
          />
        </div>
        {open && results.length > 0 && (
          <div className="glass-strong absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl">
            {results.slice(0, 8).map((r) => (
              <button
                key={r.secid}
                onClick={() => go(r.secid)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-glass"
              >
                <span className="text-txt">{r.name}</span>
                <span className="font-mono text-txt-dim">{r.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => queryClient.invalidateQueries()}
        title="刷新行情"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-ink-800/60 text-txt-dim hover:text-txt"
      >
        <IconRefresh className="h-[18px] w-[18px]" />
      </button>

      <div className="hidden items-center gap-1.5 rounded-xl border border-line bg-ink-800/60 p-1 sm:flex">
        <button
          onClick={() => mode !== 'beginner' && toggleMode()}
          className={`relative rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            mode === 'beginner' ? 'text-ink-900' : 'text-txt-dim'
          }`}
        >
          {mode === 'beginner' && (
            <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-lg bg-accent-grad" />
          )}
          <span className="relative">新手模式</span>
        </button>
        <button
          onClick={() => mode !== 'pro' && toggleMode()}
          className={`relative rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            mode === 'pro' ? 'text-ink-900' : 'text-txt-dim'
          }`}
        >
          {mode === 'pro' && (
            <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-lg bg-accent-grad" />
          )}
          <span className="relative">专业模式</span>
        </button>
      </div>

      <div className="hidden items-center gap-1.5 text-[11px] text-txt-faint md:flex">
        <IconSpark className="h-4 w-4 text-accent-cyan" />
        <span>数据源 · {stockService.getProviderName()}/腾讯</span>
      </div>
    </header>
  );
}
