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
  const closes = result.indicators.quote[0].close.filter(
    (v) => v != null && !Number.isNaN(v)
  );
  if (closes.length < 200) {
    throw new Error(
      "200일 이동평균 계산을 위해 충분한 가격 이력이 없습니다. 다른 종목을 선택해 주세요."
    );
  }

  const price = closes[closes.length - 1];
  const slice = closes.slice(-200);
  const ma200 = slice.reduce((a, b) => a + b, 0) / 200;
  const rsi = calculateRSI(closes, 14);

  return { price, ma200, rsi };
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

function calculateScore({ price, ma200, vix, rsi }) {
  let score = 0;

  if (price > ma200) score += 40;
  else score -= 40;

  if (vix > 25) score += 30;
  if (vix < 15) score -= 30;

  if (rsi < 30) score += 30;
  if (rsi > 70) score -= 30;

  return score;
}

app.get("/analyze", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.query.symbol);

    const [vix, stock] = await Promise.all([getVIX(), getStockData(symbol)]);

    const score = calculateScore({
      price: stock.price,
      ma200: stock.ma200,
      vix,
      rsi: stock.rsi,
    });

    let recommendation = "HOLD";
    if (score >= 40) recommendation = "BUY";
    else if (score < 10) recommendation = "SELL";

    res.json({
      symbol,
      price: stock.price,
      ma200: stock.ma200,
      vix,
      rsi: stock.rsi,
      score,
      recommendation,
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
