const path = require("path");
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const headers = {
  "User-Agent": "Mozilla/5.0 (compatible; StockAnalyzer/1.0)",
};

function normalizeSymbol(raw) {
  const s = String(raw || "AAPL")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9.\-]{1,20}$/.test(s)) {
    throw new Error("유효하지 않은 종목 코드입니다.");
  }
  return s;
}

function unwrapYahooNumber(value) {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    typeof value.raw === "number" &&
    !Number.isNaN(value.raw)
  ) {
    return value.raw;
  }
  return null;
}

async function getVIX() {
  const res = await axios.get(
    "https://query1.finance.yahoo.com/v8/finance/chart/^VIX",
    { headers }
  );
  const meta = res.data?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (price == null || Number.isNaN(price)) {
    throw new Error("VIX 데이터를 가져올 수 없습니다.");
  }
  return price;
}

async function getQuoteSummary(symbol, modules) {
  try {
    const joinedModules = modules.join(",");
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      symbol
    )}?modules=${encodeURIComponent(joinedModules)}`;
    const res = await axios.get(url, { headers, validateStatus: () => true });
    if (res.status !== 200) return null;
    const result = res.data?.quoteSummary?.result?.[0];
    if (!result) return null;
    return result;
  } catch (_) {
    // quoteSummary is frequently blocked by Yahoo; degrade gracefully.
    return null;
  }
}

async function getStockData(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=1y&interval=1d`;
  const res = await axios.get(url, { headers, validateStatus: () => true });
  if (res.status !== 200) {
    throw new Error("종목 정보 요청에 실패했습니다.");
  }
  const result = res.data?.chart?.result?.[0];
  if (!result) {
    const err = res.data?.chart?.error?.description;
    throw new Error(err || "종목 데이터를 찾을 수 없습니다.");
  }
  const quote = result.indicators?.quote?.[0];
  const closes = quote.close.filter(
    (v) => v != null && !Number.isNaN(v)
  );
  const volumes = (quote.volume || []).filter(
    (v) => v != null && !Number.isNaN(v)
  );
  if (closes.length < 200) {
    throw new Error(
      "200일 이동평균 계산을 위해 충분한 가격 이력이 없습니다. 다른 종목을 선택해 주세요."
    );
  }

  const price = closes[closes.length - 1];
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ma60 = closes.slice(-60).reduce((a, b) => a + b, 0) / 60;
  const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
  const rsi = calculateRSI(closes, 14);
  const volume = volumes[volumes.length - 1] ?? 0;
  const volumeSample = volumes.slice(-20);
  const avgVolume =
    volumeSample.length > 0
      ? volumeSample.reduce((a, b) => a + b, 0) / volumeSample.length
      : volume;
  const fiftyTwoWeekHigh = Math.max(...closes);
  const fiftyTwoWeekLow = Math.min(...closes);
  let week52Position = null;
  if (fiftyTwoWeekHigh > fiftyTwoWeekLow) {
    week52Position =
      ((price - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100;
  }
  const disparity = (price / ma200) * 100;
  const isBullishTrend = ma20 > ma60 && ma60 > ma200;
  const isBearishTrend = ma200 > ma60 && ma60 > ma20;
  const trend = isBullishTrend ? "BULLISH" : isBearishTrend ? "BEARISH" : "NEUTRAL";
  const isPullback = isBullishTrend && price < ma20;
  const spread = ma20 - ma200;
  const spreadAbsRatio = (Math.abs(spread) / ma200) * 100;
  const isConverging = spreadAbsRatio < 2;
  const isExpanding = spreadAbsRatio > 12;
  const energy = isConverging ? "CONVERGENCE" : "EXPANSION";

  return {
    price,
    ma20,
    ma60,
    ma200,
    rsi,
    volume,
    avgVolume,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    week52Position,
    disparity,
    trend,
    isBullishTrend,
    isBearishTrend,
    isPullback,
    spread,
    energy,
    isConverging,
    isExpanding,
  };
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function getSector(symbol) {
  const map = {
    AAPL: "TECH",
    NVDA: "TECH",
    MSFT: "TECH",
    GOOGL: "TECH",
    GOOG: "TECH",
    AMZN: "TECH",
    META: "TECH",
    AVGO: "TECH",
    AMD: "TECH",
    PLTR: "TECH",
    CPNG: "TECH",
    DASH: "TECH",
    RXRX: "HEALTH",
    TEM: "HEALTH",
    UNH: "HEALTH",
    JNJ: "HEALTH",
    VIST: "ENERGY",
    CEG: "ENERGY",
    XOM: "ENERGY",
    CVX: "ENERGY",
    JPM: "FINANCE",
    V: "FINANCE",
    CME: "FINANCE",
  };
  return map[symbol] || "DEFAULT";
}

function getSectorWeights(sector) {
  switch (sector) {
    case "TECH":
      return { trend: 30, timing: 40, market: 10, reliability: 20 };
    case "FINANCE":
    case "HEALTH":
      return { trend: 40, timing: 20, market: 15, reliability: 25 };
    case "ENERGY":
      return { trend: 30, timing: 20, market: 30, reliability: 20 };
    default:
      return { trend: 35, timing: 30, market: 15, reliability: 20 };
  }
}

function applyWeights(scores, weights) {
  return (
    scores.trendScore * (weights.trend / 30) +
    scores.timingScore * (weights.timing / 25) +
    scores.marketScore * (weights.market / 15) +
    scores.reliabilityScore * (weights.reliability / 15)
  );
}

function applyAIBoost({ score, price, ma200, rsi, vix, disparity }) {
  let adjusted = score;
  if (price < ma200 && rsi < 35 && vix > 25) adjusted += 10;
  if (rsi > 70 && disparity > 115) adjusted -= 10;
  if (price > ma200 && rsi < 40) adjusted += 5;
  return adjusted;
}

function calculateFinalScore({
  symbol,
  price,
  ma200,
  vix,
  rsi,
  week52Position,
  volume,
  avgVolume,
  disparity,
  trend,
  isPullback,
  energy,
}) {
  let trendScore = 0;
  if (price > ma200) trendScore += 15;
  else trendScore -= 15;
  if (trend === "BULLISH") trendScore += 10;
  else trendScore -= 10;
  if (typeof disparity === "number") {
    if (disparity < 85) trendScore += 5;
    if (disparity > 115) trendScore -= 5;
  }

  let timingScore = 0;
  if (rsi < 30) timingScore += 10;
  if (rsi > 70) timingScore -= 10;
  if (typeof week52Position === "number") {
    if (week52Position < 20) timingScore += 10;
    if (week52Position > 80) timingScore -= 10;
  }
  if (isPullback) timingScore += 5;

  let marketScore = 0;
  if (vix > 25) marketScore += 15;
  if (vix < 15) marketScore -= 15;

  let reliabilityScore = 0;
  if (volume > avgVolume) reliabilityScore += 10;
  if (energy === "CONVERGENCE") reliabilityScore += 5;

  const breakdown = {
    trendScore,
    timingScore,
    marketScore,
    reliabilityScore,
  };
  const sector = getSector(symbol);
  const weights = getSectorWeights(sector);
  const weightedScore = applyWeights(breakdown, weights);
  const finalScore = applyAIBoost({
    score: weightedScore,
    price,
    ma200,
    rsi,
    vix,
    disparity,
  });

  let recommendation = "HOLD";
  if (finalScore >= 40) recommendation = "BUY";
  else if (finalScore < 10) recommendation = "SELL";

  return {
    finalScore,
    recommendation,
    breakdown,
    weights,
    sector,
  };
}

app.get("/analyze", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.query.symbol);

    const [vix, stock, priceSummary] = await Promise.all([
      getVIX(),
      getStockData(symbol),
      getQuoteSummary(symbol, ["price"]),
    ]);

    const currentPrice =
      unwrapYahooNumber(priceSummary?.price?.regularMarketPrice) ?? stock.price;
    const fiftyTwoWeekHigh =
      unwrapYahooNumber(priceSummary?.price?.fiftyTwoWeekHigh) ?? stock.fiftyTwoWeekHigh;
    const fiftyTwoWeekLow =
      unwrapYahooNumber(priceSummary?.price?.fiftyTwoWeekLow) ?? stock.fiftyTwoWeekLow;
    let week52Position = stock.week52Position;
    if (
      typeof currentPrice === "number" &&
      typeof fiftyTwoWeekHigh === "number" &&
      typeof fiftyTwoWeekLow === "number" &&
      fiftyTwoWeekHigh > fiftyTwoWeekLow
    ) {
      week52Position =
        ((currentPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) *
        100;
    }

    const scoring = calculateFinalScore({
      symbol,
      price: stock.price,
      ma200: stock.ma200,
      vix,
      rsi: stock.rsi,
      week52Position,
      volume: stock.volume,
      avgVolume: stock.avgVolume,
      disparity: stock.disparity,
      trend: stock.trend,
      isPullback: stock.isPullback,
      energy: stock.energy,
    });

    const score = scoring.finalScore;

    res.json({
      symbol,
      price: stock.price,
      ma20: stock.ma20,
      ma60: stock.ma60,
      ma200: stock.ma200,
      vix,
      rsi: stock.rsi,
      week52Position,
      volume: stock.volume,
      avgVolume: stock.avgVolume,
      disparity: stock.disparity,
      trend: stock.trend,
      isPullback: stock.isPullback,
      spread: stock.spread,
      energy: stock.energy,
      sector: scoring.sector,
      totalScore: score,
      finalScore: score,
      breakdown: scoring.breakdown,
      weights: scoring.weights,
      score,
      recommendation: scoring.recommendation,
    });
  } catch (e) {
    const message =
      e.response?.data?.chart?.error?.description ||
      e.message ||
      "알 수 없는 오류가 발생했습니다.";
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("server running");
});
