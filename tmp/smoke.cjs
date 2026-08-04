"use strict";

// src/utils/indicators.ts
function sma(values, period) {
  const out = new Array(values.length).fill(NaN);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}
function ema(values, period) {
  const out = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length === 0) return out;
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    prev = Number.isNaN(prev) ? v : v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
function hhv(values, period) {
  const out = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - period + 1);
    let max = -Infinity;
    for (let j = start; j <= i; j += 1) if (values[j] > max) max = values[j];
    out[i] = max;
  }
  return out;
}
function llv(values, period) {
  const out = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - period + 1);
    let min = Infinity;
    for (let j = start; j <= i; j += 1) if (values[j] < min) min = values[j];
    out[i] = min;
  }
  return out;
}
function wilderSmooth(values, period) {
  const out = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  let prev = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j += 1) sum += values[j];
      prev = sum / period;
      out[i] = prev;
    } else if (i >= period) {
      prev = (prev * (period - 1) + values[i]) / period;
      out[i] = prev;
    }
  }
  return out;
}
function computeMACD(close2, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(close2, fast);
  const emaSlow = ema(close2, slow);
  const dif = close2.map(
    (_, i) => Number.isNaN(emaFast[i]) || Number.isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i]
  );
  const dea = ema(dif, signal);
  const macd2 = dif.map(
    (d, i) => Number.isNaN(d) || Number.isNaN(dea[i]) ? NaN : (d - dea[i]) * 2
  );
  return { dif, dea, macd: macd2 };
}
function computeKDJ(high2, low2, close2, n = 9, m1 = 3, m2 = 3) {
  const k = new Array(close2.length).fill(NaN);
  const d = new Array(close2.length).fill(NaN);
  const j = new Array(close2.length).fill(NaN);
  let prevK = 50;
  let prevD = 50;
  for (let i = 0; i < close2.length; i += 1) {
    if (i < n - 1) {
      k[i] = NaN;
      d[i] = NaN;
      j[i] = NaN;
      continue;
    }
    const hh = hhv(high2.slice(0, i + 1), n)[i];
    const ll = llv(low2.slice(0, i + 1), n)[i];
    const rsv = hh === ll ? 50 : (close2[i] - ll) / (hh - ll) * 100;
    const curK = (m1 - 1) / m1 * prevK + 1 / m1 * rsv;
    const curD = (m2 - 1) / m2 * prevD + 1 / m2 * curK;
    k[i] = curK;
    d[i] = curD;
    j[i] = 3 * curK - 2 * curD;
    prevK = curK;
    prevD = curD;
  }
  return { k, d, j };
}
function computeRSI(close2, period = 6) {
  const out = new Array(close2.length).fill(NaN);
  if (close2.length < period + 1) return out;
  const gains = [];
  const losses = [];
  for (let i = 1; i < close2.length; i += 1) {
    const diff = close2[i] - close2[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i += 1) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < close2.length; i += 1) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}
function computeBOLL(close2, n = 20, k = 2) {
  const mid = sma(close2, n);
  const upper = new Array(close2.length).fill(NaN);
  const lower = new Array(close2.length).fill(NaN);
  for (let i = 0; i < close2.length; i += 1) {
    if (Number.isNaN(mid[i])) continue;
    let variance = 0;
    for (let j = i - n + 1; j <= i; j += 1) variance += (close2[j] - mid[i]) ** 2;
    const std = Math.sqrt(variance / n);
    upper[i] = mid[i] + k * std;
    lower[i] = mid[i] - k * std;
  }
  return { mid, upper, lower };
}
function computeDMA(close2, n1 = 10, n2 = 50, amaPeriod = 10) {
  const ma1 = sma(close2, n1);
  const ma2 = sma(close2, n2);
  const dma2 = ma1.map(
    (v, i) => Number.isNaN(v) || Number.isNaN(ma2[i]) ? NaN : v - ma2[i]
  );
  const ama = sma(dma2, amaPeriod);
  return { dma: dma2, ama };
}
function computeWR(high2, low2, close2, n = 14) {
  const out = new Array(close2.length).fill(NaN);
  for (let i = 0; i < close2.length; i += 1) {
    if (i < n - 1) continue;
    const hh = hhv(high2.slice(0, i + 1), n)[i];
    const ll = llv(low2.slice(0, i + 1), n)[i];
    out[i] = hh === ll ? 0 : (hh - close2[i]) / (hh - ll) * 100;
  }
  return out;
}
function computeDMI(high2, low2, close2, n = 14, m = 6) {
  const len = close2.length;
  const tr = new Array(len).fill(NaN);
  const pdm = new Array(len).fill(0);
  const mdm = new Array(len).fill(0);
  for (let i = 1; i < len; i += 1) {
    const hl = high2[i] - low2[i];
    const hc = Math.abs(high2[i] - close2[i - 1]);
    const lc = Math.abs(low2[i] - close2[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
    const hd = high2[i] - high2[i - 1];
    const ld = low2[i - 1] - low2[i];
    pdm[i] = hd > 0 && hd > ld ? hd : 0;
    mdm[i] = ld > 0 && ld > hd ? ld : 0;
  }
  const atr = wilderSmooth(tr, n);
  const pdiSm = wilderSmooth(pdm, n);
  const mdiSm = wilderSmooth(mdm, n);
  const pdi = new Array(len).fill(NaN);
  const mdi = new Array(len).fill(NaN);
  for (let i = 0; i < len; i += 1) {
    if (Number.isNaN(atr[i]) || atr[i] === 0) continue;
    pdi[i] = pdiSm[i] / atr[i] * 100;
    mdi[i] = mdiSm[i] / atr[i] * 100;
  }
  const dx = new Array(len).fill(NaN);
  for (let i = 0; i < len; i += 1) {
    const sum = (pdi[i] || 0) + (mdi[i] || 0);
    dx[i] = sum === 0 ? 0 : Math.abs((pdi[i] || 0) - (mdi[i] || 0)) / sum * 100;
  }
  const adx = wilderSmooth(dx, m);
  const adxr = new Array(len).fill(NaN);
  for (let i = m; i < len; i += 1) {
    if (!Number.isNaN(adx[i]) && !Number.isNaN(adx[i - m])) {
      adxr[i] = (adx[i] + adx[i - m]) / 2;
    }
  }
  return { pdi, mdi, adx, adxr };
}

// src/utils/formula.ts
var TWO_CHAR_OPS = [">=", "<=", "==", "!=", "&&", "||"];
var ONE_CHAR_OPS = ["+", "-", "*", "/", ">", "<"];
function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c >= "0" && c <= "9" || c === ".") {
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i];
        i += 1;
      }
      tokens.push({ type: "num", value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let id = "";
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) {
        id += src[i];
        i += 1;
      }
      tokens.push({ type: "id", value: id });
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen", value: c });
      i += 1;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: c });
      i += 1;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "comma", value: c });
      i += 1;
      continue;
    }
    const two = src.substr(i, 2);
    if (TWO_CHAR_OPS.includes(two)) {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }
    if (ONE_CHAR_OPS.includes(c)) {
      tokens.push({ type: "op", value: c });
      i += 1;
      continue;
    }
    throw new Error(`\u65E0\u6CD5\u8BC6\u522B\u7684\u5B57\u7B26: "${c}"`);
  }
  return tokens;
}
var Parser = class {
  constructor(tokens) {
    this.tokens = tokens;
  }
  pos = 0;
  parse() {
    const node = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new Error("\u8868\u8FBE\u5F0F\u5B58\u5728\u591A\u4F59\u5B57\u7B26");
    }
    return node;
  }
  peek() {
    return this.tokens[this.pos];
  }
  eat() {
    return this.tokens[this.pos++];
  }
  parseOr() {
    let left = this.parseAnd();
    while (this.peek()?.type === "op" && this.peek()?.value === "||") {
      this.eat();
      const right = this.parseAnd();
      left = { kind: "binary", op: "||", left, right };
    }
    return left;
  }
  parseAnd() {
    let left = this.parseCompare();
    while (this.peek()?.type === "op" && this.peek()?.value === "&&") {
      this.eat();
      const right = this.parseCompare();
      left = { kind: "binary", op: "&&", left, right };
    }
    return left;
  }
  parseCompare() {
    let left = this.parseAdd();
    while (this.peek()?.type === "op" && [">", "<", ">=", "<=", "==", "!="].includes(this.peek().value)) {
      const op = this.eat().value;
      const right = this.parseAdd();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }
  parseAdd() {
    let left = this.parseMul();
    while (this.peek()?.type === "op" && (this.peek()?.value === "+" || this.peek()?.value === "-")) {
      const op = this.eat().value;
      const right = this.parseMul();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }
  parseMul() {
    let left = this.parseUnary();
    while (this.peek()?.type === "op" && (this.peek()?.value === "*" || this.peek()?.value === "/")) {
      const op = this.eat().value;
      const right = this.parseUnary();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }
  parseUnary() {
    const t = this.peek();
    if (t?.type === "op" && (t.value === "-" || t.value === "+")) {
      this.eat();
      const right = this.parseUnary();
      if (t.value === "-") {
        return { kind: "binary", op: "-", left: { kind: "number", value: 0 }, right };
      }
      return right;
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    const t = this.peek();
    if (!t) throw new Error("\u8868\u8FBE\u5F0F\u4E0D\u5B8C\u6574");
    if (t.type === "lparen") {
      this.eat();
      const node = this.parseOr();
      if (this.peek()?.type !== "rparen") throw new Error("\u7F3A\u5C11\u53F3\u62EC\u53F7");
      this.eat();
      return node;
    }
    if (t.type === "num") {
      this.eat();
      return { kind: "number", value: parseFloat(t.value) };
    }
    if (t.type === "id") {
      this.eat();
      if (this.peek()?.type === "lparen") {
        this.eat();
        const args = [];
        if (this.peek()?.type !== "rparen") {
          args.push(this.parseOr());
          while (this.peek()?.type === "comma") {
            this.eat();
            args.push(this.parseOr());
          }
        }
        if (this.peek()?.type !== "rparen") throw new Error(`\u51FD\u6570 ${t.value} \u7F3A\u5C11\u53F3\u62EC\u53F7`);
        this.eat();
        return { kind: "call", name: t.value.toUpperCase(), args };
      }
      const field = t.value.toUpperCase();
      if (!["OPEN", "HIGH", "LOW", "CLOSE", "VOL", "AMOUNT"].includes(field)) {
        throw new Error(`\u672A\u77E5\u53D8\u91CF: ${t.value}`);
      }
      return { kind: "series", field };
    }
    throw new Error("\u8868\u8FBE\u5F0F\u8BED\u6CD5\u9519\u8BEF");
  }
};
var SERIES_FIELDS = {
  OPEN: "open",
  HIGH: "high",
  LOW: "low",
  CLOSE: "close",
  VOL: "vol",
  AMOUNT: "amount"
};
function constant(value, len) {
  return new Array(len).fill(value);
}
function getArg(args, ctx2, index) {
  if (!args[index]) throw new Error("\u51FD\u6570\u53C2\u6570\u4E0D\u8DB3");
  return evaluate(args[index], ctx2);
}
function asInt(value) {
  return Math.max(1, Math.round(value));
}
function callFunction(name, args, ctx2) {
  const len = ctx2.close.length;
  switch (name) {
    case "MA": {
      const x = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      return sma(x, n);
    }
    case "EMA": {
      const x = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      return ema(x, n);
    }
    case "SMA": {
      const x = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      const m = getScalar(getArg(args, ctx2, 2), len);
      return smaCustom(x, n, m);
    }
    case "REF": {
      const x = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      const out = new Array(len).fill(NaN);
      for (let i = n; i < len; i += 1) out[i] = x[i - n];
      return out;
    }
    case "HHV": {
      const x = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      return hhv(x, n);
    }
    case "LLV": {
      const x = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      return llv(x, n);
    }
    case "COUNT": {
      const c = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      const out = new Array(len).fill(0);
      for (let i = 0; i < len; i += 1) {
        let cnt = 0;
        for (let j = Math.max(0, i - n + 1); j <= i; j += 1) if (c[j] > 0) cnt += 1;
        out[i] = cnt;
      }
      return out;
    }
    case "IF": {
      const c = getArg(args, ctx2, 0);
      const a = getArg(args, ctx2, 1);
      const b = getArg(args, ctx2, 2);
      return c.map((v, i) => v > 0 ? a[i] : b[i]);
    }
    case "CROSS": {
      const a = getArg(args, ctx2, 0);
      const b = getArg(args, ctx2, 1);
      const out = new Array(len).fill(0);
      for (let i = 1; i < len; i += 1) {
        if (a[i - 1] <= b[i - 1] && a[i] > b[i]) out[i] = 1;
      }
      return out;
    }
    case "ABS":
      return getArg(args, ctx2, 0).map((v) => Math.abs(v));
    case "MAX":
      return getArg(args, ctx2, 0).map((v, i) => Math.max(v, getArg(args, ctx2, 1)[i]));
    case "MIN":
      return getArg(args, ctx2, 0).map((v, i) => Math.min(v, getArg(args, ctx2, 1)[i]));
    case "BARSLAST": {
      const c = getArg(args, ctx2, 0);
      const out = new Array(len).fill(999999);
      let lastTrue = -1;
      for (let i = 0; i < len; i += 1) {
        if (c[i] > 0) {
          lastTrue = i;
          out[i] = 0;
        } else if (lastTrue >= 0) {
          out[i] = i - lastTrue;
        }
      }
      return out;
    }
    case "FILTER": {
      const x = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      const out = new Array(len).fill(0);
      let lastTrigger = -Infinity;
      for (let i = 0; i < len; i += 1) {
        if (x[i] > 0 && i - lastTrigger > n) {
          out[i] = 1;
          lastTrigger = i;
        }
      }
      return out;
    }
    case "EVERY": {
      const c = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      const out = new Array(len).fill(0);
      for (let i = 0; i < len; i += 1) {
        let ok = true;
        for (let j = Math.max(0, i - n + 1); j <= i; j += 1) {
          if (c[j] <= 0) {
            ok = false;
            break;
          }
        }
        out[i] = ok ? 1 : 0;
      }
      return out;
    }
    case "EXIST": {
      const c = getArg(args, ctx2, 0);
      const n = asInt(getScalar(getArg(args, ctx2, 1), len));
      const out = new Array(len).fill(0);
      for (let i = 0; i < len; i += 1) {
        let ok = false;
        for (let j = Math.max(0, i - n + 1); j <= i; j += 1) {
          if (c[j] > 0) {
            ok = true;
            break;
          }
        }
        out[i] = ok ? 1 : 0;
      }
      return out;
    }
    default:
      throw new Error(`\u4E0D\u652F\u6301\u7684\u51FD\u6570: ${name}`);
  }
}
function smaCustom(values, n, m) {
  const out = new Array(values.length).fill(NaN);
  let prev = NaN;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (Number.isNaN(prev)) prev = v;
    else prev = (m * v + (n - m) * prev) / n;
    out[i] = prev;
  }
  return out;
}
function getScalar(arr, len) {
  if (arr.length === len) return arr[arr.length - 1];
  return arr[0] ?? 0;
}
function evaluate(node, ctx2) {
  const len = ctx2.close.length;
  switch (node.kind) {
    case "number":
      return constant(node.value, len);
    case "series":
      return [...ctx2[SERIES_FIELDS[node.field]] ?? []];
    case "binary": {
      const a = evaluate(node.left, ctx2);
      const b = evaluate(node.right, ctx2);
      return binop(node.op, a, b, len);
    }
    case "call":
      return callFunction(node.name, node.args, ctx2);
    default:
      return constant(NaN, len);
  }
}
function binop(op, a, b, len) {
  const out = new Array(len).fill(NaN);
  for (let i = 0; i < len; i += 1) {
    const x = a[i];
    const y = b[i];
    switch (op) {
      case "+":
        out[i] = x + y;
        break;
      case "-":
        out[i] = x - y;
        break;
      case "*":
        out[i] = x * y;
        break;
      case "/":
        out[i] = y === 0 ? NaN : x / y;
        break;
      case ">":
        out[i] = x > y ? 1 : 0;
        break;
      case "<":
        out[i] = x < y ? 1 : 0;
        break;
      case ">=":
        out[i] = x >= y ? 1 : 0;
        break;
      case "<=":
        out[i] = x <= y ? 1 : 0;
        break;
      case "==":
        out[i] = x === y ? 1 : 0;
        break;
      case "!=":
        out[i] = x !== y ? 1 : 0;
        break;
      case "&&":
        out[i] = x > 0 && y > 0 ? 1 : 0;
        break;
      case "||":
        out[i] = x > 0 || y > 0 ? 1 : 0;
        break;
      default:
        throw new Error(`\u672A\u77E5\u8FD0\u7B97\u7B26: ${op}`);
    }
  }
  return out;
}
function parseFormula(expr) {
  try {
    const tokens = tokenize(expr);
    const ast = new Parser(tokens).parse();
    return { ast };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
function runFormula(expr, ctx2) {
  const { ast, error } = parseFormula(expr);
  if (error || !ast) return { error: error ?? "\u672A\u77E5\u89E3\u6790\u9519\u8BEF" };
  try {
    const series = evaluate(ast, ctx2);
    return { series };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// src/utils/selectors.ts
function crossUp(a, b) {
  const n = a.length;
  if (n < 2) return false;
  return a[n - 2] <= b[n - 2] && a[n - 1] > b[n - 1];
}
function prepare(klines2) {
  const close2 = klines2.map((k) => k.close);
  const open2 = klines2.map((k) => k.open);
  const high2 = klines2.map((k) => k.high);
  const low2 = klines2.map((k) => k.low);
  const volume = klines2.map((k) => k.volume);
  return {
    close: close2,
    open: open2,
    high: high2,
    low: low2,
    volume,
    ma5: sma(close2, 5),
    ma10: sma(close2, 10),
    ma20: sma(close2, 20),
    ma60: sma(close2, 60),
    maVol5: sma(volume, 5),
    macd: computeMACD(close2, 12, 26, 9),
    rsi6: computeRSI(close2, 6),
    rsi12: computeRSI(close2, 12)
  };
}
function isNewHigh(close2, n) {
  if (close2.length < n) return false;
  const last = close2[close2.length - 1];
  const window = close2.slice(close2.length - n);
  return last === Math.max(...window) && last > 0;
}
function evalStrategy(type, p2, params) {
  const n = p2.close.length;
  const last = n - 1;
  switch (type) {
    case "MA_MULTI":
      return p2.ma5[last] > p2.ma10[last] && p2.ma10[last] > p2.ma20[last] && p2.ma20[last] > p2.ma60[last] && !Number.isNaN(p2.ma60[last]);
    case "MA5_CROSS_MA10":
      return crossUp(p2.ma5, p2.ma10);
    case "MA10_CROSS_MA20":
      return crossUp(p2.ma10, p2.ma20);
    case "MACD_GOLD":
      return crossUp(p2.macd.dif, p2.macd.dea);
    case "MACD_ABOVE_ZERO":
      return p2.macd.dif[last] > 0 && p2.macd.dea[last] > 0;
    case "RSI_BELOW_30":
      return !Number.isNaN(p2.rsi6[last]) && p2.rsi6[last] < 30;
    case "RSI_CROSS_50":
      return crossUp(p2.rsi6, new Array(n).fill(50));
    case "VOL_UP_GOING":
      return p2.volume[last] > p2.maVol5[last] * 1.5 && p2.close[last] > p2.open[last];
    case "VOL_BREAK_PLATFORM": {
      const hh = hhv(p2.close, 20)[last];
      return !Number.isNaN(hh) && p2.close[last] >= hh && p2.volume[last] > p2.maVol5[last] * 1.8;
    }
    case "NEW_HIGH_5":
      return isNewHigh(p2.close, 5);
    case "NEW_HIGH_10":
      return isNewHigh(p2.close, 10);
    case "NEW_HIGH_20":
      return isNewHigh(p2.close, 20);
    case "CONTINUE_YANG": {
      const days = params.days ?? 3;
      if (n < days) return false;
      for (let i = 0; i < days; i += 1) {
        const idx = last - i;
        if (p2.close[idx] <= p2.open[idx]) return false;
      }
      return true;
    }
    case "CONTINUE_VOL": {
      const days = params.days ?? 3;
      if (n < days + 1) return false;
      for (let i = 0; i < days; i += 1) {
        const idx = last - i;
        if (p2.volume[idx] <= p2.volume[idx - 1]) return false;
      }
      return true;
    }
    case "VOL_SHRINK_PULLBACK":
      return p2.volume[last] < p2.volume[last - 1] && p2.close[last] < p2.close[last - 1] && !Number.isNaN(p2.ma20[last]) && p2.close[last] > p2.ma20[last];
    default:
      return false;
  }
}
function evaluateStrategies(klines2, strategies2) {
  if (klines2.length < 62) return [];
  const p2 = prepare(klines2);
  const matched2 = [];
  for (const s of strategies2) {
    if (!s.enabled) continue;
    try {
      if (evalStrategy(s.type, p2, s.params ?? {})) matched2.push(s.type);
    } catch {
    }
  }
  return matched2;
}

// src/constants/index.ts
var import_meta = {};
var DEFAULT_PROVIDER = import_meta.env.VITE_DEFAULT_PROVIDER || "eastmoney";
var AKSHARE_BASE_URL = import_meta.env.VITE_AKSHARE_BASE_URL || "http://localhost:8000";
var COLORS = {
  up: "#f5475b",
  down: "#2dbd6e",
  text: "#d7dae0",
  textDim: "#8a93a6",
  grid: "rgba(255,255,255,0.06)",
  axis: "#5a6478",
  ma5: "#e8c64a",
  ma10: "#39a0ff",
  ma20: "#ff7ac3",
  ma60: "#9d7bff",
  macd: "#e8c64a",
  dif: "#39a0ff",
  dea: "#ff7ac3",
  vol: "#39a0ff",
  kdjK: "#e8c64a",
  kdjD: "#39a0ff",
  kdjJ: "#ff7ac3",
  bollMid: "#e8c64a",
  bollUp: "#39a0ff",
  bollLow: "#ff7ac3",
  bg: "#0b0e14",
  panel: "#12161f",
  border: "rgba(255,255,255,0.08)"
};

// src/utils/format.ts
function formatNum(value, decimals = 2) {
  if (!isFinite(value)) return "--";
  return value.toFixed(decimals);
}
function formatPercent(value, decimals = 2) {
  if (!isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}
function changeColor(changePercent) {
  if (changePercent > 0) return COLORS.up;
  if (changePercent < 0) return COLORS.down;
  return COLORS.text;
}
function parseSecid(secid) {
  const [prefix, code] = secid.split(".");
  return { marketPrefix: prefix ?? "", code: code ?? secid };
}
function codeToSecid(code) {
  const c = code.replace(/^(sh|sz|bj)/i, "");
  let market = "sh";
  let prefix = "1";
  if (/^(60|68|9)/.test(c)) {
    market = "sh";
    prefix = "1";
  } else if (/^(00|30|02|03)/.test(c)) {
    market = "sz";
    prefix = "0";
  } else if (/^(8|4|92)/.test(c)) {
    market = "bj";
    prefix = "0";
  }
  return { market, secid: `${prefix}.${c}`, marketPrefix: prefix };
}

// scripts/smoke.ts
var pass = 0;
var fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass += 1;
    console.log("  \u2713", name);
  } else {
    fail += 1;
    console.log("  \u2717 FAIL:", name, extra);
  }
}
var N = 80;
var open = [];
var high = [];
var low = [];
var close = [];
var vol = [];
var amount = [];
var p = 10;
for (let i = 0; i < N; i += 1) {
  const o = p;
  p = p + 0.3 + i % 3 * 0.05;
  const c = p;
  const hi = Math.max(o, c) + 0.1 + i % 2 * 0.05;
  const lo = Math.min(o, c) - 0.1 - i % 2 * 0.05;
  open.push(o);
  high.push(hi);
  low.push(lo);
  close.push(c);
  vol.push(1e3 + i * 20 + i % 4 * 50);
  amount.push(close[i] * vol[i]);
}
var klines = Array.from({ length: N }, (_, i) => ({
  date: `2024-01-${String(i % 28 + 1).padStart(2, "0")}`,
  open: open[i],
  high: high[i],
  low: low[i],
  close: close[i],
  volume: vol[i],
  amount: amount[i]
}));
var ctx = { open, high, low, close, vol, amount };
console.log("Indicators:");
var sma5 = sma(close, 5);
var last5 = 0;
for (let i = N - 5; i < N; i += 1) last5 += close[i];
check("SMA5 \u672B\u503C = \u6700\u8FD15\u65E5\u5747\u503C", Math.abs(sma5[N - 1] - last5 / 5) < 1e-9, `${sma5[N - 1]} vs ${last5 / 5}`);
var macd = computeMACD(close, 12, 26, 9);
check("MACD \u6570\u7EC4\u957F\u5EA6\u4E00\u81F4", macd.dif.length === N && macd.dea.length === N && macd.macd.length === N);
check("MACD.dif \u672B\u503C\u975E NaN", !Number.isNaN(macd.dif[N - 1]));
var rsi = computeRSI(close, 6);
check("RSI \u843D\u5728 [0,100]", rsi.every((v) => Number.isNaN(v) || v >= 0 && v <= 100));
var boll = computeBOLL(close, 20, 2);
check(
  "BOLL upper>=mid>=lower",
  boll.upper[N - 1] >= (boll.mid[N - 1] ?? -Infinity) - 1e-9 && (boll.mid[N - 1] ?? -Infinity) >= boll.lower[N - 1] - 1e-9
);
var kdj = computeKDJ(high, low, close, 9);
check("KDJ \u4E09\u6761\u7EBF\u957F\u5EA6\u4E00\u81F4", kdj.k.length === N && kdj.d.length === N && kdj.j.length === N);
var wr = computeWR(high, low, close, 14);
check("WR \u843D\u5728 [0,100]", wr.every((v) => Number.isNaN(v) || v >= 0 && v <= 100));
var dmi = computeDMI(high, low, close, 14, 6);
check("DMI \u4E09\u6761\u7EBF\u957F\u5EA6\u4E00\u81F4", dmi.pdi.length === N && dmi.mdi.length === N && dmi.adx.length === N);
var dma = computeDMA(close, 10, 50, 10);
check("DMA/DMAma \u957F\u5EA6\u4E00\u81F4", dma.dma.length === N && dma.ama.length === N);
console.log("Formula engine:");
var r1 = runFormula("MA(CLOSE,5)", ctx);
check("MA(CLOSE,5) \u65E0\u9519\u8BEF", !r1.error && !!r1.series);
check(
  "MA(CLOSE,5) === sma(close,5)",
  !!r1.series && r1.series.every((v, i) => Math.abs(v - sma5[i]) < 1e-9 || Number.isNaN(v) && Number.isNaN(sma5[i]))
);
var r2 = runFormula("CROSS(MA(CLOSE,5), MA(CLOSE,10))", ctx);
check("CROSS \u8FD4\u56DE 0/1 \u5E8F\u5217", !!r2.series && r2.series.every((v) => v === 0 || v === 1));
var r3 = runFormula("RSI(CLOSE,6) < 30", ctx);
check("RSI<30 \u8FD4\u56DE 0/1 \u5E8F\u5217", !!r3.series && r3.series.every((v) => v === 0 || v === 1));
var r4 = runFormula("COUNT(CLOSE>OPEN,5) >= 3", ctx);
check("COUNT>=3 \u8FD4\u56DE 0/1 \u5E8F\u5217", !!r4.series && r4.series.every((v) => v === 0 || v === 1));
var r5 = runFormula("CLOSE = HHV(CLOSE,20)", ctx);
check("CLOSE=HHV \u8FD4\u56DE 0/1 \u5E8F\u5217", !!r5.series && r5.series.every((v) => v === 0 || v === 1));
var r6 = runFormula("MA(", ctx);
check("\u6B8B\u7F3A\u8868\u8FBE\u5F0F\u8FD4\u56DE\u9519\u8BEF", !!r6.error);
var r7 = runFormula("FOO(CLOSE,1)", ctx);
check("\u672A\u77E5\u51FD\u6570\u8FD4\u56DE\u9519\u8BEF", !!r7.error);
var r8 = runFormula("MA(CLOSE,5) > MA(CLOSE,10) && MA(CLOSE,10) > MA(CLOSE,20)", ctx);
check("\u591A\u6761\u4EF6\u903B\u8F91\u8868\u8FBE\u5F0F\u8FD4\u56DE 0/1", !!r8.series && r8.series.every((v) => v === 0 || v === 1));
console.log("Selectors:");
var ALL = [
  "MA_MULTI",
  "MA5_CROSS_MA10",
  "MA10_CROSS_MA20",
  "MACD_GOLD",
  "MACD_ABOVE_ZERO",
  "RSI_BELOW_30",
  "RSI_CROSS_50",
  "VOL_UP_GOING",
  "VOL_BREAK_PLATFORM",
  "NEW_HIGH_5",
  "NEW_HIGH_10",
  "NEW_HIGH_20",
  "CONTINUE_YANG",
  "CONTINUE_VOL",
  "VOL_SHRINK_PULLBACK"
];
var strategies = ALL.map((t) => ({ type: t, enabled: true, params: {} }));
var matched = evaluateStrategies(klines, strategies);
check("evaluateStrategies \u8FD4\u56DE\u6570\u7EC4\u4E14\u4E0D\u629B\u9519", Array.isArray(matched));
check("\u5F3A\u4E0A\u6DA8\u5E8F\u5217\u547D\u4E2D MA_MULTI", matched.includes("MA_MULTI"), JSON.stringify(matched));
check("\u5F3A\u4E0A\u6DA8\u5E8F\u5217\u547D\u4E2D NEW_HIGH_20", matched.includes("NEW_HIGH_20"));
check("\u5F3A\u4E0A\u6DA8\u5E8F\u5217\u4E0D\u547D\u4E2D RSI_BELOW_30", !matched.includes("RSI_BELOW_30"));
check("\u6570\u636E\u4E0D\u8DB3(<62) \u8FD4\u56DE\u7A7A", evaluateStrategies(klines.slice(0, 10), strategies).length === 0);
console.log("Format:");
check("codeToSecid('600519').secid === '1.600519'", codeToSecid("600519").secid === "1.600519");
check("codeToSecid('000001').secid === '0.000001'", codeToSecid("000001").secid === "0.000001");
var ps = parseSecid("1.600519");
check("parseSecid('1.600519').code === '600519'", ps.code === "600519");
check("formatPercent \u542B %", formatPercent(1.234).includes("%"));
check("formatNum \u8FD4\u56DE\u5B57\u7B26\u4E32", typeof formatNum(1234.5) === "string");
check("changeColor \u8FD4\u56DE\u989C\u8272", typeof changeColor(1) === "string");
console.log(`
RESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
