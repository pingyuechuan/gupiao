#!/usr/bin/env node
/**
 * 部署后健康检查验收脚本 —— V0.8 上线门禁（R1 风险验收）
 *
 * 探测已部署域名的 /api/health?deep=1，按上游可达性给出明确结论：
 *   - ok        → 退出码 0，可上线
 *   - degraded  → 退出码 1，可上线但部分上游不可达，需关注
 *   - down      → 退出码 2，全部上游不可达，架构需重评（非产品 Bug）
 *   - 无法连接  → 退出码 3，域名未生效 / DNS 未传播 / 部署未完成
 *
 * 用法：
 *   node scripts/health_check.mjs <domain>
 *   node scripts/health_check.mjs project-phoenix-xxx.vercel.app
 *   node scripts/health_check.mjs https://project-phoenix-xxx.vercel.app/
 *
 * 零依赖，使用 Node 22+ 内置 fetch。
 */

const domainArg = process.argv[2];
if (!domainArg) {
  console.error('用法: node scripts/health_check.mjs <domain>');
  console.error('示例: node scripts/health_check.mjs project-phoenix-xxx.vercel.app');
  process.exit(3);
}

const base = domainArg.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
const url = `https://${base}/api/health?deep=1`;

function bar(ok) {
  return ok ? '✅' : '❌';
}

async function main() {
  console.log(`\n🔍 部署验收：探测 ${url}\n`);

  let resp;
  try {
    resp = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    console.error(`❌ 无法连接：${e.message}`);
    console.error('   可能原因：域名未生效 / DNS 未传播 / 部署未完成 / 区域网络拦截。');
    console.error('   建议：等待 1~2 分钟后重试；确认 Vercel Deployment 显示 Ready。\n');
    process.exit(3);
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    console.error(`❌ 响应不是合法 JSON（HTTP ${resp.status}）。`);
    console.error('   可能部署的是旧构建或未包含 api/ 目录。\n');
    process.exit(3);
  }

  const status = data.status ?? 'unknown';
  const region = data.region ?? 'unknown';
  const commit = data.commit ?? 'unknown';
  const upstreams = Array.isArray(data.upstreams) ? data.upstreams : [];

  console.log(`服务      ：${data.service ?? '?'} v${data.version ?? '?'} (${data.stage ?? '?'})`);
  console.log(`机房区域  ：${region}`);
  console.log(`提交      ：${commit}`);
  console.log(`汇总      ：${data.summary ?? status}\n`);

  if (upstreams.length) {
    console.log('上游探测明细：');
    for (const u of upstreams) {
      const ms = u.ms != null ? `${u.ms}ms` : '-';
      const code = u.status != null ? `HTTP ${u.status}` : (u.error ? `ERR:${u.error}` : '-');
      console.log(`  ${bar(u.ok)} ${u.label.padEnd(14)} ${ms.padStart(7)}  ${code}  ${u.ok ? `(${u.bytes}B)` : ''}`);
    }
    console.log('');
  }

  // 结论与退出码
  if (status === 'ok') {
    console.log('🟢 验收结论：PASS —— 国内行情源可达，可正式邀请测试用户。\n');
    process.exit(0);
  }
  if (status === 'degraded') {
    console.log('🟡 验收结论：WARN —— 可上线，但部分上游不可达（主数据源同花顺若正常则不影响核心体验）。');
    console.log('   建议：观察首页行情是否完整；记录不可达的上游，下版本优化补盲源。\n');
    process.exit(1);
  }
  if (status === 'down') {
    console.log('🔴 验收结论：FAIL —— 全部上游不可达（风险 R1 触发）。');
    console.log('   这不是产品 Bug，而是「境外机房 → 国内行情源」被拦截/限流。');
    console.log('   下一步：换部署区域（同区域优先）、加代理中转、或改用国内可达的数据镜像。请截图发给我。\n');
    process.exit(2);
  }
  console.log(`⚠️  未知状态：${status}（接口返回异常）。\n`);
  process.exit(3);
}

main();
