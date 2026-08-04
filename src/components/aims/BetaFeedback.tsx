import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedbackStore, type FeedbackType } from '@/store/feedbackStore';
import { APP_NAME, APP_STAGE, APP_VERSION } from '@/constants';
import { IconSend, IconCheck } from '@/components/layout/icons';

const TYPES: { key: FeedbackType; label: string }[] = [
  { key: 'bug', label: '🐞 提交 Bug' },
  { key: 'suggestion', label: '💡 建议' },
  { key: 'rating', label: '⭐ 体验评分' },
];

/** 每个页面右下角的 Beta 反馈入口：提交 Bug / 建议 / 评分，统一进入 feedbackStore 管理 */
export default function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [contact, setContact] = useState('');
  const [screenshot, setScreenshot] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = useFeedbackStore((s) => s.submit);

  const reset = () => {
    setType('suggestion');
    setTitle('');
    setBody('');
    setRating(5);
    setContact('');
    setScreenshot(undefined);
    setDone(false);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setScreenshot(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  };

  const send = () => {
    if (!body.trim() && !title.trim()) return;
    submit({
      type,
      title: title.trim() || (type === 'rating' ? `体验评分 ${rating} 星` : '无标题'),
      body: body.trim(),
      rating: type === 'rating' ? rating : undefined,
      contact: contact.trim() || undefined,
      screenshot,
    });
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 1200);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent-grad px-4 py-3 text-[13px] font-bold text-ink-900 shadow-lg shadow-accent/30 transition-transform hover:scale-105"
        aria-label="Beta 反馈"
      >
        🐞 <span className="hidden sm:inline">意见反馈</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="glass w-full max-w-md rounded-2xl p-5"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {done ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <IconCheck className="h-10 w-10 text-up" />
                  <div className="text-[15px] font-bold text-txt">已收到，谢谢你的反馈！</div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-[15px] font-bold text-txt">Beta 反馈</div>
                    <span className="text-[11px] text-txt-faint">
                      {APP_NAME} {APP_STAGE} v{APP_VERSION}
                    </span>
                  </div>

                  <div className="mb-3 flex gap-1.5 rounded-xl bg-glass p-1">
                    {TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setType(t.key)}
                        className={`flex-1 rounded-lg px-2 py-2 text-[12px] font-medium transition-colors ${
                          type === t.key ? 'bg-accent-grad text-ink-900' : 'text-txt-dim hover:text-txt'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {type === 'rating' && (
                    <div className="mb-3 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setRating(n)} className="text-[22px] leading-none" style={{ color: n <= rating ? '#f5c451' : '#3a4150' }}>
                          ★
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={type === 'rating' ? '一句话感受（可选）' : '标题（一句话）'}
                    className="mb-2 w-full rounded-xl bg-white/6 px-3 py-2 text-[13.5px] text-txt outline-none focus:ring-1 focus:ring-accent"
                  />
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={type === 'rating' ? '想对我们说点什么…' : '详细描述问题或建议…'}
                    rows={4}
                    className="mb-2 w-full resize-none rounded-xl bg-white/6 px-3 py-2 text-[13.5px] text-txt outline-none focus:ring-1 focus:ring-accent"
                  />

                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="rounded-lg border border-line bg-glass px-3 py-1.5 text-[12px] text-txt-dim hover:text-txt"
                    >
                      📎 上传截图
                    </button>
                    {screenshot && <span className="text-[11px] text-up">已附加截图</span>}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
                  </div>

                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="联系方式（可选）：微信 / 邮箱"
                    className="mb-4 w-full rounded-xl bg-white/6 px-3 py-2 text-[13px] text-txt outline-none focus:ring-1 focus:ring-accent"
                  />

                  <div className="flex gap-2">
                    <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-line bg-glass py-2.5 text-[13.5px] text-txt-dim">
                      取消
                    </button>
                    <button
                      onClick={send}
                      disabled={!body.trim() && !title.trim()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-grad py-2.5 text-[13.5px] font-bold text-ink-900 disabled:opacity-40"
                    >
                      <IconSend className="h-4 w-4" /> 提交
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
