/**
 * 中间探针：测试 _shared.ts 是否能在 Vercel 上加载
 * 如果这个返回 JSON → _shared.ts 没问题，问题在 health.ts 自身
 * 如果这个也 500 → _shared.ts 加载失败
 */
import { sendJson } from "../_shared";

export default function handler(req: unknown, res: unknown) {
  return sendJson(res as any, 200, { ok: true, probe: "shared-import", imports: "_shared.ts loaded OK" });
}
