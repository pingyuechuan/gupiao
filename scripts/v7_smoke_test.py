"""V7 Beta runtime smoke test: loads each page against the live dev server
and reports uncaught JS exceptions + ErrorBoundary crash text.
Network is blocked in this sandbox, so AI data queries will fail gracefully;
we only care about render crashes, not missing data.
"""
import sys
from playwright.sync_api import sync_playwright

URL_BASE = "http://localhost:5173"
PAGES = ["/", "/me", "/discover", "/portfolio", "/coach", "/stock/1.600519"]

INIT = (
    "localStorage.setItem('phoenix-user', JSON.stringify("
    "{state:{onboarded:true, mode:'beginner', holdings:[]}, version:0}));"
)

pageerrors = []


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        ctx.add_init_script(INIT)
        page = ctx.new_page()
        page.on("pageerror", lambda e: pageerrors.append(str(e)))

        for path in PAGES:
            pageerrors.clear()
            try:
                page.goto(URL_BASE + path, wait_until="load", timeout=20000)
            except Exception as e:
                print(f"[GOTO-ERR] {path}: {e}")
            page.wait_for_timeout(3000)
            root_children = page.evaluate(
                "document.querySelector('#root') ? document.querySelector('#root').children.length : -1"
            )
            body = page.evaluate("document.body.innerText || ''")
            crashed = "页面渲染出错" in body
            beta = "Project Phoenix" in body
            print(
                f"{path:22s} root_children={root_children} crashed={crashed} betaBadge={beta} pageerrors={len(pageerrors)}"
            )
            if crashed:
                print("   CRASH:", body[:240].replace(chr(10), " "))
            for e in pageerrors[:3]:
                print("   PAGEERROR:", e[:200])
        browser.close()


if __name__ == "__main__":
    run()
