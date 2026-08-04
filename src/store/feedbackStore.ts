import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FeedbackType = 'bug' | 'suggestion' | 'rating';

export interface Feedback {
  id: string;
  /** YYYY-MM-DD HH:mm */
  date: string;
  type: FeedbackType;
  title: string;
  body: string;
  /** 体验评分（1-5），仅 rating 类型 */
  rating?: number;
  contact?: string;
  /** 截图 base64（可选） */
  screenshot?: string;
}

interface FeedbackState {
  items: Feedback[];
  submit: (f: Omit<Feedback, 'id' | 'date'>) => void;
  list: () => Feedback[];
  remove: (id: string) => void;
}

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set, get) => ({
      items: [],
      submit: (f) => {
        const item: Feedback = {
          ...f,
          id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          date: new Date().toLocaleString('zh-CN', { hour12: false }),
        };
        set({ items: [item, ...get().items].slice(0, 200) });
      },
      list: () => get().items,
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
    }),
    { name: 'phoenix-feedback' },
  ),
);
