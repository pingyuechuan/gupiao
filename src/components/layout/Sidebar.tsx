import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconHome,
  IconCompass,
  IconWallet,
  IconCoach,
  IconUser,
} from '@/components/layout/icons';

const NAV = [
  { to: '/', label: '首页', Icon: IconHome, hint: '今天怎么办' },
  { to: '/discover', label: 'AI发现', Icon: IconCompass, hint: 'AI推荐流' },
  { to: '/portfolio', label: '持仓', Icon: IconWallet, hint: '我的仓位' },
  { to: '/coach', label: 'AI教练', Icon: IconCoach, hint: '私人经理' },
  { to: '/me', label: '我的', Icon: IconUser, hint: '画像与设置' },
];

export default function Sidebar() {
  return (
    <aside className="glass z-20 hidden w-16 shrink-0 flex-col border-r border-line py-4 md:flex lg:w-60">
      <div className="mb-6 flex items-center gap-2.5 px-3 lg:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-grad text-[15px] font-black text-ink-900">
          AI
        </div>
        <div className="hidden min-w-0 lg:block">
          <div className="truncate text-[15px] font-bold leading-tight text-txt">Phoenix 投资教练</div>
          <div className="truncate text-[11px] text-txt-dim">你的私人投资教练</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 lg:px-3">
        {NAV.map(({ to, label, Icon, hint }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <div
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isActive ? 'bg-glass-strong text-txt' : 'text-txt-dim hover:bg-glass hover:text-txt'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent-grad"
                  />
                )}
                <Icon className={isActive ? 'text-accent' : ''} />
                <div className="hidden min-w-0 lg:block">
                  <div className="truncate text-[13.5px] font-medium leading-tight">{label}</div>
                  <div className="truncate text-[10.5px] text-txt-faint">{hint}</div>
                </div>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="hidden px-5 lg:block">
        <div className="rounded-xl border border-line bg-glass p-3 text-[11px] leading-relaxed text-txt-faint">
          数据来自公开行情接口，<span className="text-txt-dim">仅供学习参考，不构成投资建议</span>。
        </div>
      </div>
    </aside>
  );
}
