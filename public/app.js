const POPULAR = [
  "AAPL",
  "TSLA",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "AMD",
  "JPM",
  "V",
];

const AUTOCOMPLETE = [
  ...POPULAR,
  "INTC",
  "DIS",
  "NFLX",
  "COST",
  "PEP",
  "KO",
  "WMT",
  "PG",
  "JNJ",
  "UNH",
  "XOM",
  "CVX",
  "BA",
  "GE",
  "SPY",
  "QQQ",
];

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
    hint: "200일 평균 가격, 추세 판단 기준입니다. 가격이 위에 있으면 상대적으로 강한 추세로 볼 수 있습니다.",
  },
  {
    id: "vix",
    title: "VIX",
    key: "vix",
    format: (v) => v.toFixed(2),
    hint: "시장 공포 지수입니다. 높을수록 변동성·불안이 크다는 뜻이며, 낮으면 비교적 안정적입니다.",
  },
  {
    id: "rsi",
    title: "RSI (14)",
    key: "rsi",
    format: (v) => v.toFixed(1),
    hint: "과매수·과매도 지표입니다. 30 이하는 과매도, 70 이상은 과매수 구간으로 자주 해석합니다.",
  },
  {
    id: "score",
    title: "종합 점수",
    key: "score",
    format: (v) => String(Math.round(v)),
    hint: "가격·MA200, VIX, RSI를 합친 단순 점수입니다. 높을수록 모델이 긍정적으로 보는 편입니다.",
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

function getCurrentSymbol() {
  const input = $("#symbol-input").value.trim().toUpperCase();
  if (input) return input;
  return $("#symbol-select").value || POPULAR[0];
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

function renderResults(data) {
  const verdict = $("#verdict");
  verdict.className = "verdict-card " + verdictClass(data.recommendation);

  $("#verdict-text").textContent = data.recommendation;
  $("#verdict-symbol").textContent = `${data.symbol} · 지표 기반 요약`;

  const container = $("#metric-cards");
  container.innerHTML = "";

  METRICS.forEach((m) => {
    const raw = data[m.key];
    const valueText = m.format(raw);
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
    b.textContent = sym;
    b.addEventListener("click", () => {
      $("#symbol-input").value = sym;
      $("#symbol-select").value = sym;
      setActiveChip(sym);
      analyze();
    });
    chips.appendChild(b);
  });

  const select = $("#symbol-select");
  AUTOCOMPLETE.sort().forEach((sym) => {
    const opt = document.createElement("option");
    opt.value = sym;
    opt.textContent = sym;
    select.appendChild(opt);
  });

  const datalist = $("#symbol-list");
  AUTOCOMPLETE.forEach((sym) => {
    const opt = document.createElement("option");
    opt.value = sym;
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
