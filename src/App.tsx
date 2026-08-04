import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import TodayPage from '@/pages/TodayPage';
import DiscoverPage from '@/pages/DiscoverPage';
import PortfolioPage from '@/pages/PortfolioPage';
import CoachPage from '@/pages/CoachPage';
import MePage from '@/pages/MePage';
import StockDetailPage from '@/pages/StockDetailPage';
import OnboardingPage from '@/pages/OnboardingPage';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import BetaFeedback from '@/components/aims/BetaFeedback';
import AuthGate from '@/components/auth/AuthGate';
import { useUserStore } from '@/store/userStore';
import { useAimsGrowthStore } from '@/store/aimsGrowthStore';
import { useAimsDiaryStore } from '@/store/aimsDiaryStore';
import { useAimsMemoryStore } from '@/store/aimsMemoryStore';
import { getRecommendations } from '@/ai/recommend';

function Shell() {
  const location = useLocation();
  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-4 sm:px-6">
          <AnimatePresence mode="sync">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <ErrorBoundary label="路由区域">
                <Routes location={location}>
                  <Route path="/" element={<TodayPage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/coach" element={<CoachPage />} />
                  <Route path="/me" element={<MePage />} />
                  <Route path="/stock/:secid" element={<StockDetailPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/** 应用主体：仅在登录通过后挂载，避免未登录时发起无谓的行情请求 */
function AuthedApp() {
  const onboarded = useUserStore((s) => s.onboarded);
  const location = useLocation();

  // 每日成长 + 自动生成今日投资日记（仅当日首次进入时触发一次）
  useEffect(() => {
    useAimsGrowthStore.getState().awardDaily();
    const diary = useAimsDiaryStore.getState();
    const today = new Date().toISOString().slice(0, 10);
    if (!diary.get(today)) {
      const profile = useUserStore.getState().profile;
      const opsToday = useAimsMemoryStore.getState().ops.filter((o) => o.date === today).length;
      getRecommendations({
        limit: 5,
        pool: [],
        period: profile.period,
        risk: profile.riskTolerance === '低' ? '保守' : profile.riskTolerance === '高' ? '激进' : '稳健',
      })
        .then((recs) => diary.generate({ marketTemp: 50, marketLabel: '平稳', recs: recs.slice(0, 5).map((r) => r.name), opsCount: opsToday }))
        .catch(() => diary.generate({ marketTemp: 50, marketLabel: '平稳', recs: [], opsCount: opsToday }));
    }
  }, []);

  // 未建立画像前，强制进入引导页（即使直接访问其他路由）
  if (!onboarded && location.pathname !== '/onboarding') {
    return <OnboardingPage />;
  }
  if (onboarded && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <Shell />
      <BetaFeedback />
    </>
  );
}

export default function App() {
  return (
    <AuthGate>
      <AuthedApp />
    </AuthGate>
  );
}
