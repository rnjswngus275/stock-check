const STOCK_OPTIONS = [
  { symbol: "DASH", name: "도어대시" },
  { symbol: "RXRX", name: "리커전 파마슈티컬스" },
  { symbol: "AVGO", name: "브로드컴" },
  { symbol: "VIST", name: "비스타 에너지" },
  { symbol: "AMZN", name: "아마존" },
  { symbol: "GOOGL", name: "알파벳 A" },
  { symbol: "GOOG", name: "알파벳 C" },
  { symbol: "AAPL", name: "애플" },
  { symbol: "NVDA", name: "엔비디아" },
  { symbol: "WMT", name: "월마트" },
  { symbol: "UNH", name: "유나이티드헬스그룹" },
  { symbol: "CNI", name: "캐나디안 내셔널 레일웨이" },
  { symbol: "CEG", name: "컨스텔레이션 에너지" },
  { symbol: "STZ", name: "콘스텔레이션 브랜즈" },
  { symbol: "CPNG", name: "쿠팡" },
  { symbol: "TSLA", name: "테슬라" },
  { symbol: "TEM", name: "템퍼스 AI" },
  { symbol: "PLTR", name: "팔란티어" },
  { symbol: "CME", name: "CME 그룹" },
  { symbol: "MSFT", name: "마이크로소프트" },
  { symbol: "META", name: "메타" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "JPM", name: "JP모건" },
  { symbol: "V", name: "비자" },
  { symbol: "INTC", name: "인텔" },
  { symbol: "DIS", name: "디즈니" },
  { symbol: "NFLX", name: "넷플릭스" },
  { symbol: "COST", name: "코스트코" },
  { symbol: "PEP", name: "펩시코" },
  { symbol: "KO", name: "코카콜라" },
  { symbol: "PG", name: "프록터앤드갬블" },
  { symbol: "JNJ", name: "존슨앤드존슨" },
  { symbol: "XOM", name: "엑슨모빌" },
  { symbol: "CVX", name: "셰브론" },
  { symbol: "BA", name: "보잉" },
  { symbol: "GE", name: "GE 에어로스페이스" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "인베스코 QQQ ETF" },
];

const POPULAR = [
  "DASH",
  "RXRX",
  "AVGO",
  "VIST",
  "AMZN",
  "GOOGL",
  "GOOG",
  "AAPL",
  "NVDA",
  "WMT",
  "UNH",
  "CNI",
  "CEG",
  "STZ",
  "CPNG",
  "TSLA",
  "TEM",
  "PLTR",
  "CME",
];

const AUTOCOMPLETE = STOCK_OPTIONS.map((s) => s.symbol);
const STOCK_NAME_BY_SYMBOL = Object.fromEntries(
  STOCK_OPTIONS.map((s) => [s.symbol, s.name])
);

const METRICS = [
  {
    id: "price",
    title: "현재 가격",
    key: "price",
    format: (v) => formatMoney(v),
    hint: "선택한 종목의 최근 종가입니다.",
  },
  {
    id: "ma200",
    title: "MA200",
    key: "ma200",
    format: (v) => formatMoney(v),
    hint: "200일 평균 가격 기준선입니다. 현재가가 MA200 위면 추세가 상대적으로 강하고, 아래면 약한 흐름으로 해석합니다.",
  },
  {
    id: "vix",
    title: "VIX",
    key: "vix",
    format: (v) => v.toFixed(2),
    hint: "시장 공포 지수입니다. 높을수록 공포와 변동성이 큰 구간으로 해석하며, 낮을수록 안정 구간으로 봅니다.",
  },
  {
    id: "rsi",
    title: "RSI (14)",
    key: "rsi",
    format: (v) => v.toFixed(1),
    hint: "과매수·과매도 지표입니다. 30 이하는 과매도로 매수 후보, 70 이상은 과매수로 매도 고려 구간으로 해석합니다.",
  },
  {
    id: "week52Position",
    title: "52주 위치",
    key: "week52Position",
    format: (v) => formatPercent(v),
    hint: "1년 고점·저점 기준 현재 위치입니다. 20% 이하는 저점권(매수), 80% 이상은 고점권(매도 고려)으로 해석합니다.",
  },
  {
    id: "volume",
    title: "거래량",
    key: "volume",
    format: (v, data) => {
      const now = formatInteger(v);
      const avg = formatInteger(data.avgVolume);
      return `${now} (평균 ${avg})`;
    },
    hint: "거래 활발 정도입니다. 현재 거래량이 평균보다 크면 추세 신뢰도가 높아진다고 해석합니다.",
  },
  {
    id: "disparity",
    title: "이격도",
    key: "disparity",
    format: (v) => formatPercentFrom100(v),
    hint: "이평선 대비 가격 거리입니다. 85 미만은 과도한 하락(매수 기회), 115 초과는 과도한 상승(매도 고려)으로 해석합니다.",
  },
  {
    id: "trend",
    title: "추세 구조",
    key: "trend",
    format: (v, data) => {
      const label =
        v === "BULLISH" ? "정배열 (BULLISH)" : v === "BEARISH" ? "역배열 (BEARISH)" : "중립 (NEUTRAL)";
      return `${label} · MA20 ${formatMoney(data.ma20)} / MA60 ${formatMoney(data.ma60)}`;
    },
    hint: "정배열(MA20>MA60>MA200)은 상승 추세 유지, 역배열(MA200>MA60>MA20)은 하락 추세로 해석합니다.",
  },
  {
    id: "pullback",
    title: "눌림목",
    key: "isPullback",
    format: (v) => (v ? "매수 타이밍 신호 (YES)" : "해당 없음 (NO)"),
    hint: "정배열 상태에서 현재가가 MA20 아래면 눌림목으로, 상승 추세 내 단기 매수 타이밍 후보로 해석합니다.",
  },
  {
    id: "energy",
    title: "에너지 상태",
    key: "energy",
    format: (v, data) => `${formatEnergy(v)} · spread ${formatSignedNumber(data.spread, 2)}`,
    hint: "이평선 간격 상태입니다. 수렴은 에너지 축적(변곡 가능성), 확산은 추세 강화 신호로 해석합니다.",
  },
  {
    id: "score",
    title: "종합 점수",
    key: "score",
    format: (v) => String(Math.round(v)),
    hint: "가격·추세·공포·모멘텀·밸류에이션·위치·거래량·이평 구조를 종합한 점수입니다.",
  },
];

const $ = (sel) => document.querySelector(sel);

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPercent(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function formatInteger(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    n
  );
}

function formatPercentFrom100(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toFixed(2)}%`;
}

function formatSignedNumber(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  const fixed = Number(n).toFixed(digits);
  return Number(n) > 0 ? `+${fixed}` : fixed;
}

function formatEnergy(v) {
  if (v === "CONVERGENCE") return "수렴";
  if (v === "EXPANSION") return "확산";
  return "—";
}

function getCurrentSymbol() {
  const input = $("#symbol-input").value.trim().toUpperCase();
  if (input) return input;
  return $("#symbol-select").value || POPULAR[0];
}

function stockLabel(symbol) {
  const name = STOCK_NAME_BY_SYMBOL[symbol];
  return name ? `${name} (${symbol})` : symbol;
}

function setActiveChip(symbol) {
  document.querySelectorAll(".chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.symbol === symbol);
  });
}

function syncSelectToSymbol(symbol) {
  const sel = $("#symbol-select");
  if ([...sel.options].some((o) => o.value === symbol)) {
    sel.value = symbol;
  }
}

async function analyze() {
  const symbol = getCurrentSymbol();
  if (!symbol) return;

  const errorEl = $("#error-banner");
  const loadingEl = $("#loading");
  const resultsEl = $("#results");

  errorEl.classList.add("hidden");
  errorEl.textContent = "";
  resultsEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  try {
    const res = await fetch(
      `/analyze?symbol=${encodeURIComponent(symbol)}`
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "분석 요청에 실패했습니다.");
    }

    renderResults(data);
    setActiveChip(data.symbol);
    syncSelectToSymbol(data.symbol);
    $("#symbol-input").value = data.symbol;
  } catch (err) {
    errorEl.textContent = err.message || "오류가 발생했습니다.";
    errorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function verdictClass(rec) {
  if (rec === "BUY") return "buy";
  if (rec === "SELL") return "sell";
  return "hold";
}

function cardAccentClass(rec, metricId) {
  if (metricId !== "score") return "";
  if (rec === "BUY") return "accent-buy";
  if (rec === "SELL") return "accent-sell";
  return "accent-hold";
}

function formatSignedInt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const rounded = Math.round(n);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function scoreBadgeClass(v) {
  if (v > 0) return "breakdown-badge pos";
  if (v < 0) return "breakdown-badge neg";
  return "breakdown-badge neutral";
}

function renderBreakdownBadges(data) {
  const b = data.breakdown;
  if (!b) return "";
  const rows = [
    ["추세", b.trendScore],
    ["타이밍", b.timingScore],
    ["시장", b.marketScore],
    ["신뢰도", b.reliabilityScore],
  ];
  return `
    <div class="breakdown-wrap">
      ${rows
        .map(
          ([label, value]) =>
            `<span class="${scoreBadgeClass(value)}"><em>${label}</em> ${formatSignedInt(value)}</span>`
        )
        .join("")}
    </div>
  `;
}

function renderResults(data) {
  const verdict = $("#verdict");
  verdict.className = "verdict-card " + verdictClass(data.recommendation);

  $("#verdict-text").textContent = data.recommendation;
  $("#verdict-symbol").textContent = `${stockLabel(data.symbol)} · 지표 기반 요약`;

  const container = $("#metric-cards");
  container.innerHTML = "";

  METRICS.forEach((m) => {
    const raw = data[m.key];
    const valueText = m.format(raw, data);
    const card = document.createElement("article");
    card.className =
      "card " + cardAccentClass(data.recommendation, m.id);

    card.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${m.title}</h3>
        <div class="tooltip-wrap">
          <button type="button" class="tooltip-btn" aria-label="${m.title} 설명">?</button>
          <div class="tooltip-panel" role="tooltip">${m.hint}</div>
        </div>
      </div>
      <p class="card-value ${m.id === "score" ? "sub" : ""}">${valueText}</p>
      ${m.id === "score" ? renderBreakdownBadges(data) : ""}
      <p class="card-desc">${m.hint}</p>
    `;
    container.appendChild(card);
  });

  $("#results").classList.remove("hidden");
}

function init() {
  const chips = $("#popular-chips");
  POPULAR.forEach((sym) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.symbol = sym;
    b.textContent = stockLabel(sym);
    b.addEventListener("click", () => {
      $("#symbol-input").value = sym;
      $("#symbol-select").value = sym;
      setActiveChip(sym);
      analyze();
    });
    chips.appendChild(b);
  });

  const select = $("#symbol-select");
  STOCK_OPTIONS.slice()
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.symbol;
    opt.textContent = `${item.name} (${item.symbol})`;
    select.appendChild(opt);
    });

  const datalist = $("#symbol-list");
  STOCK_OPTIONS.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.symbol;
    opt.label = item.name;
    datalist.appendChild(opt);
  });

  select.addEventListener("change", () => {
    $("#symbol-input").value = select.value;
    setActiveChip(select.value);
    analyze();
  });

  $("#analyze-btn").addEventListener("click", analyze);

  $("#symbol-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      analyze();
    }
  });

  $("#symbol-input").value = POPULAR[0];
  select.value = POPULAR[0];
  setActiveChip(POPULAR[0]);
  analyze();
}

document.addEventListener("DOMContentLoaded", init);
