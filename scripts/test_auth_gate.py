"""
登录门禁验收测试（V0.8）。

验证两条互斥路径：
  1. 配置了 Supabase  -> 未登录必须停在登录页，主应用不得挂载
  2. 未配置 Supabase  -> 直接放行，保证本地开发不被阻断

用法：python scripts/test_auth_gate.py   （需先 build 出对应产物）
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"
EXPECT_GATE = (sys.argv[2] if len(sys.argv) > 2 else "gate") == "gate"

failures = []
console_errors = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail else ""))
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    page.goto(URL, wait_until="networkidle", timeout=45000)
    page.wait_for_timeout(1500)

    body = page.inner_text("body")
    root_children = page.evaluate("document.getElementById('root')?.children.length ?? 0")

    check("页面成功挂载", root_children > 0, f"root children={root_children}")
    check("无渲染崩溃", "页面渲染出错" not in body)
    check("无未捕获异常", len(console_errors) == 0, "; ".join(console_errors[:2]))

    # 用 DOM 选择器判定，避免文案巧合造成误判
    # （登录页副标题含「教练」二字，纯文本匹配不可靠）
    has_login = page.locator('input[type="password"]').count() > 0
    nav_links = page.locator('nav a, aside a').count()
    has_app = nav_links > 0 or "让 AI 认识你" in body

    if EXPECT_GATE:
        check("显示登录页", has_login, "找到 登录/注册/密码")
        check("主应用未挂载（未登录被拦截）", not has_app)
        check("登录页含 Beta 标识", "Beta" in body)
        check("登录页含风险提示", "不构成投资建议" in body)
    else:
        check("未配置 Supabase 时放行", has_app, "进入引导页或主应用")
        check("不应出现登录门禁", not has_login)

    page.screenshot(path=".playwright-auth.png", full_page=False)
    browser.close()

print("")
if failures:
    print(f"结果：{len(failures)} 项未通过 -> {failures}")
    sys.exit(1)
print("结果：全部通过")
