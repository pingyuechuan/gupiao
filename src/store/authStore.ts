import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** 首次恢复会话中（避免刷新页面闪一下登录页） */
  loading: boolean;
  initialized: boolean;
  init: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,

  init: () => {
    if (get().initialized) return;
    set({ initialized: true });

    // 未配置 Supabase：本地开发直通，不阻断
    if (!isSupabaseConfigured || !supabase) {
      set({ loading: false });
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => set({ session: data.session, user: data.session?.user ?? null, loading: false }))
      .catch(() => set({ loading: false }));

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
