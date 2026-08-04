"""End-to-end DOM mount test for the A-share stock terminal.

Uses Playwright (Chromium, headless). Because the sandbox blocks outbound
network from the Node process (Vite proxy returns 502), we intercept the
EastMoney/Sina/Tencent data endpoints and fulfill them with realistic mock
data. This verifies the full render pipeline:
  React mount -> data -> ECharts canvas -> quote header (high > low).

Server is started externally by webapp-testing's with_server.py.
"""
import sys
import json
import random
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" -- {detail}" if detail else ""))


def build_mock():
    # --- Quote for 601728 (中国电信) with the FIXED field mapping ---
    quote = {
        "rc": 0, "rt": 4, "svr": 1, "lt": 2, "full": 1, "dlmkts": "8,10,128", "dsc": "0",
        "data": {
            "f43": 6.24, "f44": 6.38, "f45": 6.23, "f46": 6.38, "f47": 1301199,
            "f48": 818812785.0, "f57": "601728", "f58": "中国电信", "f60": 6.30,
            "f116": 571004545481.76, "f162": 19.42, "f163": 17.21,
        },
    }

    # --- K-line: 80 trading days, ascending, ending near 6.24 ---
    random.seed(42)
    klines = []
    price = 5.80
    for i in range(80):
        date = f"2026-04-{(i % 30) + 1:02d}" if i < 30 else f"2026-05-{(i % 30) + 1:02d}" if i < 60 else f"2026-07-{(i % 30) + 1:02d}"
        open_p = price
        close_p = round(price + random.uniform(-0.08, 0.09), 2)
        high_p = round(max(open_p, close_p) + random.uniform(0.0, 0.06), 2)
        low_p = round(min(open_p, close_p) - random.uniform(0.0, 0.06), 2)
        vol = random.randint(800000, 2000000)
        amount = vol * close_p * 100
        klines.append(f"{date},{open_p},{close_p},{high_p},{low_p},{vol},{amount:.0f}")
        price = close_p
    kline = {
        "rc": 0, "rt": 4, "svr": 1, "lt": 2, "full": 1,
        "data": {"code": "601728", "name": "中国电信", "klines": klines},
    }

    # --- Time-share (trends2): ~48 points across the trading day ---
    trends = []
    base = 6.30
    for m in range(0, 240, 5):
        hh = 9 + (m + 30) // 60
        mm = (m + 30) % 60
        if hh >= 12:
            hh = 13 + (hh - 12)
        if hh > 15:
            break
        pr = round(base + random.uniform(-0.1, 0.1), 2)
        trends.append(f"2026-07-30 {hh:02d}:{mm:02d},{base},{pr},{pr},{pr},{random.randint(1000, 9000)},{pr * 1000:.0f},{(base + pr) / 2:.2f}")
    timeshare = {
        "rc": 0, "rt": 4, "svr": 1, "lt": 2, "full": 1,
        "data": {"code": "601728", "name": "中国电信", "trends": trends},
    }

    # --- Rank list (clist) ---
    names = ["贵州茅台", "宁德时代", "比亚迪", "中国平安", "招商银行", "五粮液", "隆基绿能", "东方财富"]
    diff = []
    for i, nm in enumerate(names):
        c = round(10 + i * 3.5, 2)
        diff.append({
            "f12": f"600{i+1:03d}", "f13": 1, "f14": nm, "f2": c,
            "f3": round(random.uniform(-3, 5), 2), "f4": round(random.uniform(-0.5, 0.8), 2),
            "f6": 1000000, "f7": 500000000, "f15": round(c + 0.2, 2), "f16": round(c - 0.2, 2),
            "f17": round(c + 0.1, 2), "f18": round(c - 0.1, 2), "f62": round(random.uniform(0.5, 3), 2),
        })
    rank = {"rc": 0, "rt": 4, "svr": 1, "data": {"diff": diff}}

    # --- Sectors (clist, fs=m:90...). Distinct codes per group so merged
    #     keys stay unique (real API returns distinct codes per group). ---
    sec_groups = {
        "industry": ["半导体", "人工智能", "新能源车", "白酒", "银行", "光伏"],
        "concept": ["锂电池", "芯片", "5G", "氢能源", "国资云", "东数西算"],
        "region": ["北京板块", "上海板块", "广东板块", "深圳板块", "浙江板块", "江苏板块"],
    }
    sectors = {}
    for g, names in sec_groups.items():
        diff = []
        for i, nm in enumerate(names):
            diff.append({
                "f12": f"BK{g[0].upper()}{i:02d}", "f13": 90, "f14": nm,
                "f3": round(random.uniform(-2, 4), 2),
                "f62": round(random.uniform(0.5, 3), 2), "f104": "龙头股",
            })
        sectors[g] = {"rc": 0, "rt": 4, "svr": 1, "data": {"diff": diff}}

    return quote, kline, timeshare, rank, sectors


def make_quote(code, secid):
    """Generate a per-code quote so keyed tables don't get duplicate codes
    (the real API returns a distinct code per secid)."""
    names = {
        "600519": "贵州茅台", "000858": "五粮液", "601318": "中国平安",
        "300750": "宁德时代", "600036": "招商银行", "601728": "中国电信",
    }
    name = names.get(code, code)
    # deterministic-ish but valid OHLC with high >= low
    base = 10 + (sum(int(c) for c in code) % 50)
    pre = round(base + 0.1, 2)
    open_p = round(pre + 0.05, 2)
    high = round(open_p + 0.2, 2)
    low = round(open_p - 0.15, 2)
    price = round(open_p + 0.08, 2)
    return {
        "rc": 0, "rt": 4, "svr": 1, "lt": 2, "full": 1, "dlmkts": "8,10,128", "dsc": "0",
        "data": {
            "f43": price, "f44": high, "f45": low, "f46": open_p,
            "f47": 1300000, "f48": 800000000.0, "f57": code, "f58": name,
            "f60": pre, "f116": 500000000000.0, "f162": 1.2, "f163": 15.0,
        },
    }


def main():
    quote, kline, timeshare, rank, sectors = build_mock()
    console_errors = []
    page_errors = []

    def fulfill_json(route, payload):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(payload),
        )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on("console", lambda m: console_errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))

        # ---- Route interception (mock data) ----
        def handle(route):
            url = route.request.url
            q = parse_qs(urlparse(url).query)
            if "/em/api/qt/stock/get" in url:
                secid_param = q.get("secid", ["1.601728"])[0]
                code = secid_param.split(".")[-1]
                if code == "601728":
                    fulfill_json(route, quote)
                else:
                    fulfill_json(route, make_quote(code, secid_param))
            elif "/emh/api/qt/stock/kline/get" in url:
                fulfill_json(route, kline)
            elif "/emh/api/qt/stock/trends2/get" in url:
                fulfill_json(route, timeshare)
            elif "/em/api/qt/clist/get" in url:
                fs = (q.get("fs", [""])[0])
                if fs.startswith("m:90"):
                    grp = "industry"
                    if "t:3" in fs:
                        grp = "concept"
                    elif "t:1" in fs:
                        grp = "region"
                    fulfill_json(route, sectors[grp])
                else:
                    fulfill_json(route, rank)
            elif "/ems/" in url:
                fulfill_json(route, {"rc": 0, "data": []})
            else:
                fulfill_json(route, {"rc": 0, "data": {}})

        for prefix in ["**/em/**", "**/emh/**", "**/ems/**", "**/sina/**", "**/tc/**"]:
            page.route(prefix, handle)

        # ---- Home ----
        page.goto(BASE, wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            page.wait_for_timeout(3000)
        root_len = len(page.eval_on_selector("#root", "el => el.innerHTML") or "")
        check("Home: React mounts", root_len > 200, f"#root len = {root_len}")
        page.screenshot(path="scripts/_shot_home.png", full_page=False)

        # ---- Stock detail (中国电信) ----
        page.goto(BASE + "/stock/1.601728", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            page.wait_for_timeout(3000)
        # wait for kline canvas to appear
        try:
            page.wait_for_selector("canvas", timeout=8000)
        except Exception:
            pass
        canvas_n = page.locator("canvas").count()
        check("Detail: K-line canvas rendered", canvas_n > 0, f"canvas count = {canvas_n}")

        body = page.inner_text("body")
        check("Detail: shows 中国电信/601728", ("中国电信" in body) or ("601728" in body),
              "found" if ("中国电信" in body) else "missing")

        # Extract 最高 / 最低 from QuoteHeader
        def field_value(label):
            return page.evaluate("""(label) => {
                const items = [...document.querySelectorAll('div.flex-col')];
                for (const it of items) {
                    const spans = it.querySelectorAll('span');
                    if (spans[0] && spans[0].textContent.trim() === label && spans[1]) {
                        return spans[1].textContent.trim();
                    }
                }
                return null;
            }""", label)

        high = field_value("最高")
        low = field_value("最低")
        try:
            h = float(str(high).replace(",", ""))
            l = float(str(low).replace(",", ""))
            check("Detail: 最高 > 最低 (mapping fix)", h > l, f"最高={high}, 最低={low}")
        except Exception as e:
            check("Detail: 最高 > 最低 (mapping fix)", False, f"parse fail high={high} low={low} ({e})")

        # open should equal 今开
        op = field_value("今开")
        check("Detail: 今开 parsed", op is not None and op != "", f"今开={op}")

        page.screenshot(path="scripts/_shot_detail.png", full_page=False)

        # ---- Other routes mount ----
        for path in ["/select", "/formula", "/market", "/watchlist", "/sectors"]:
            page.goto(BASE + path, wait_until="domcontentloaded")
            try:
                page.wait_for_load_state("networkidle", timeout=12000)
            except Exception:
                page.wait_for_timeout(2000)
            ln = len(page.eval_on_selector("#root", "el => el.innerHTML") or "")
            check(f"Route {path} mounts", ln > 200, f"#root len = {ln}")
            page.screenshot(path=f"scripts/_shot{path.replace('/', '_')}.png", full_page=False)

        browser.close()

    real_console = [e for e in console_errors if e]
    check("No uncaught page errors", len(page_errors) == 0, "; ".join(page_errors[:5]) if page_errors else "none")
    check("No console errors", len(real_console) == 0, "; ".join(real_console[:8]) if real_console else "none")

    failed = [r for r in results if not r[1]]
    print(f"\n=== SUMMARY: {len(results) - len(failed)}/{len(results)} passed ===")
    if failed:
        for n, _, d in failed:
            print(f"  FAIL - {n}: {d}")
        sys.exit(1)
    print("ALL PASSED")


if __name__ == "__main__":
    main()
