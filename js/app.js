(() => {
  const STORAGE_KEY = "lucky-wheel-config-v3";
  const LIVE_CAST_KEY = "lucky-wheel-live-cast";
  const HISTORY_KEY = "lucky-wheel-history-v3";
  const DECOR_KEY = "lucky-wheel-decor-v1";
  const DEFAULT_DECOR_SRC = "assets/decor-left.jpg";

  /* 用户提供的莫兰迪色板取样（避开过浅色，保证白字可读） */
  const PALETTE = [
    "#D5C9B3",
    "#BEC8D2",
    "#B4C2B1",
    "#A19889",
    "#8792A4",
    "#94A08A",
    "#904F53",
    "#694C51",
    "#A0777D",
    "#7B876F",
    "#9EA3B6",
    "#53818E",
  ];

  function uid() {
    return `p_${Math.random().toString(36).slice(2, 10)}`;
  }

  const DEFAULT_CONFIG = {
    title: "幸运大转盘",
    removeWinner: true,
    people: [
      { id: uid(), name: "张三", probability: 25, color: PALETTE[0] },
      { id: uid(), name: "李四", probability: 25, color: PALETTE[1] },
      { id: uid(), name: "王五", probability: 25, color: PALETTE[2] },
      { id: uid(), name: "赵六", probability: 25, color: PALETTE[3] },
    ],
    prizes: [
      { id: uid(), name: "一等奖", probability: 5, color: PALETTE[0], stock: 1 },
      { id: uid(), name: "二等奖", probability: 10, color: PALETTE[1], stock: 3 },
      { id: uid(), name: "三等奖", probability: 20, color: PALETTE[2], stock: 5 },
      { id: uid(), name: "小礼物", probability: 30, color: PALETTE[5], stock: 10 },
      { id: uid(), name: "谢谢参与", probability: 35, color: PALETTE[3], stock: null },
    ],
  };

  const els = {
    pageTitle: document.getElementById("pageTitle"),
    peopleCanvas: document.getElementById("peopleWheel"),
    prizeCanvas: document.getElementById("prizeWheel"),
    btnSpinPeople: document.getElementById("btnSpinPeople"),
    btnSpinPrize: document.getElementById("btnSpinPrize"),
    lastPerson: document.getElementById("lastPerson"),
    lastPrize: document.getElementById("lastPrize"),
    chkDesignate: document.getElementById("chkDesignate"),
    inputDesignate: document.getElementById("inputDesignate"),
    stockList: document.getElementById("stockList"),
    stockModal: document.getElementById("stockModal"),
    btnStock: document.getElementById("btnStock"),
    btnCloseStock: document.getElementById("btnCloseStock"),
    btnSettings: document.getElementById("btnSettings"),
    btnLiveMode: document.getElementById("btnLiveMode"),
    btnBackLive: document.getElementById("btnBackLive"),
    rotateTipModal: document.getElementById("rotateTipModal"),
    btnRotateTipYes: document.getElementById("btnRotateTipYes"),
    btnRotateTipNo: document.getElementById("btnRotateTipNo"),
    btnHistory: document.getElementById("btnHistory"),
    btnExportHistory: document.getElementById("btnExportHistory"),
    settingsPanel: document.getElementById("settingsPanel"),
    inputTitle: document.getElementById("inputTitle"),
    inputRemoveWinner: document.getElementById("inputRemoveWinner"),
    peopleList: document.getElementById("peopleList"),
    prizeList: document.getElementById("prizeList"),
    peopleProbSum: document.getElementById("peopleProbSum"),
    prizeProbSum: document.getElementById("prizeProbSum"),
    btnAddPerson: document.getElementById("btnAddPerson"),
    btnAddPrize: document.getElementById("btnAddPrize"),
    btnEvenPeople: document.getElementById("btnEvenPeople"),
    btnEvenPrize: document.getElementById("btnEvenPrize"),
    btnDownloadPeopleTpl: document.getElementById("btnDownloadPeopleTpl"),
    btnDownloadPrizeTpl: document.getElementById("btnDownloadPrizeTpl"),
    peopleExcelInput: document.getElementById("peopleExcelInput"),
    prizeExcelInput: document.getElementById("prizeExcelInput"),
    btnReset: document.getElementById("btnReset"),
    btnSave: document.getElementById("btnSave"),
    resultModal: document.getElementById("resultModal"),
    resultTitle: document.getElementById("resultTitle"),
    btnCloseResult: document.getElementById("btnCloseResult"),
    confettiCanvas: document.getElementById("confettiCanvas"),
    celebMascot: document.querySelector(".celeb-mascot"),
    historyModal: document.getElementById("historyModal"),
    historyList: document.getElementById("historyList"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    btnCloseHistory: document.getElementById("btnCloseHistory"),
    decorFrame: document.getElementById("decorFrame"),
    decorPreview: document.getElementById("decorPreview"),
    decorEmpty: document.getElementById("decorEmpty"),
    decorInput: document.getElementById("decorInput"),
    lotteryTube: document.getElementById("lotteryTube"),
    tubeCanvas: document.getElementById("tubeCanvas"),
  };

  const peopleCtx = els.peopleCanvas.getContext("2d");
  const prizeCtx = els.prizeCanvas ? els.prizeCanvas.getContext("2d") : null;
  const tubeCtx = els.tubeCanvas ? els.tubeCanvas.getContext("2d") : null;

  const TUBE_TIPS = [
    "#f0a33a",
    "#5aa8e8",
    "#e45b5b",
    "#6fc26a",
    "#9b6fe0",
    "#f2d04a",
    "#e87ab8",
    "#4ec4b8",
    "#7a8ef0",
    "#f07858",
    "#8ed65a",
    "#d46ad0",
  ];

  const tubeState = {
    sticks: [],
    mode: "idle", // idle | shake | rise
    riseProgress: 0,
    riseLabel: "",
    riseTip: "#e07a3a",
    raf: 0,
    lastTs: 0,
  };

  let config = loadConfig();
  let history = loadHistory();
  let draft = null;
  let peopleRotation = 0;
  let prizeRotation = 0;
  let spinningPeople = false;
  let spinningPrize = false;

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function parseStock(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") {
      if (!Number.isFinite(value) || value < 0) return null;
      return Math.floor(value);
    }
    const text = String(value).trim();
    if (!text || /^(不限|无限|无限制|unlimited|-1)$/i.test(text)) return null;
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }

  function normalizePerson(p, i) {
    return {
      id: p.id || uid(),
      name: String(p.name || `人员${i + 1}`).slice(0, 20),
      probability: Math.max(0, Number(p.probability) || 0),
      color: PALETTE[i % PALETTE.length],
    };
  }

  function normalizePrize(p, i) {
    return {
      id: p.id || uid(),
      name: String(p.name || `奖品${i + 1}`).slice(0, 20),
      probability: Math.max(0, Number(p.probability) || 0),
      color: PALETTE[i % PALETTE.length],
      stock: Object.prototype.hasOwnProperty.call(p, "stock") ? parseStock(p.stock) : null,
    };
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_CONFIG);
      const parsed = JSON.parse(raw);
      const people = Array.isArray(parsed.people) ? parsed.people.map(normalizePerson) : [];
      const prizes = Array.isArray(parsed.prizes) ? parsed.prizes.map(normalizePrize) : [];
      if (people.length < 2 || prizes.length < 2) return clone(DEFAULT_CONFIG);
      return {
        title: String(parsed.title || DEFAULT_CONFIG.title).slice(0, 40),
        removeWinner: parsed.removeWinner !== false,
        people,
        prizes,
      };
    } catch {
      return clone(DEFAULT_CONFIG);
    }
  }

  function saveConfig(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
  }

  function totalProbability(items) {
    return items.reduce((sum, p) => sum + (Number(p.probability) || 0), 0);
  }

  function assignColors(items) {
    items.forEach((p, i) => {
      p.color = PALETTE[i % PALETTE.length];
    });
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function ensureProbSum100(items, mode = "even") {
    const n = items.length;
    if (!n) return;
    assignColors(items);

    if (mode === "even" || totalProbability(items) <= 0) {
      // 按「分」均分，保证合计精确为 100.00，各项最多差 0.01
      const totalCents = 10000;
      const base = Math.floor(totalCents / n);
      const remainder = totalCents - base * n;
      for (let i = 0; i < n; i++) {
        const cents = base + (i < remainder ? 1 : 0);
        items[i].probability = cents / 100;
      }
      return;
    }

    const total = totalProbability(items);
    let assigned = 0;
    for (let i = 0; i < n - 1; i++) {
      const next = round2(((Number(items[i].probability) || 0) / total) * 100);
      items[i].probability = next;
      assigned = round2(assigned + next);
    }
    items[n - 1].probability = round2(100 - assigned);
  }

  function isPrizeAvailable(prize) {
    return prize.stock === null || prize.stock > 0;
  }

  function availablePrizes(list = config.prizes) {
    return list.filter(isPrizeAvailable);
  }

  function applyTitle() {
    const title = config.title || "幸运大转盘";
    els.pageTitle.textContent = title;
    document.title = title;
  }

  function updateButtons() {
    els.btnSpinPeople.disabled = spinningPeople || config.people.length < 1;
    els.btnSpinPrize.disabled = spinningPrize || availablePrizes().length < 1;
  }

  function addHistory(type, name) {
    history.unshift({
      time: Date.now(),
      type,
      name,
      title: config.title || "幸运大转盘",
    });
    saveHistory();
  }

  function addHistoryPair(person, prize) {
    history.unshift({
      time: Date.now(),
      type: "pair",
      person,
      prize,
      name: `${person} → ${prize}`,
      title: config.title || "幸运大转盘",
    });
    saveHistory();
  }

  function getDesignatedPerson() {
    if (!els.chkDesignate || !els.chkDesignate.checked) return "";
    return String(els.inputDesignate.value || "").trim().slice(0, 20);
  }

  function historyLabel(row) {
    if (row.type === "pair") {
      return {
        kind: "中奖配对",
        value: `${row.person || ""} → ${row.prize || row.name || ""}`,
        person: row.person || "",
        prize: row.prize || "",
      };
    }
    if (row.type === "person") {
      return { kind: "中奖人", value: row.name || "", person: row.name || "", prize: "" };
    }
    if (row.type === "prize") {
      return { kind: "奖品", value: row.name || "", person: "", prize: row.name || "" };
    }
    // 兼容旧数据
    if (row.person && row.prize) {
      return {
        kind: "中奖配对",
        value: `${row.person} → ${row.prize}`,
        person: row.person,
        prize: row.prize,
      };
    }
    if (row.person) {
      return { kind: "中奖人", value: row.person, person: row.person, prize: "" };
    }
    if (row.prize) {
      return { kind: "奖品", value: row.prize, person: "", prize: row.prize };
    }
    return { kind: "记录", value: row.name || "—", person: "", prize: "" };
  }

  function sheetNameSafe(name, used) {
    let cleaned = String(name || "未命名奖目")
      .replace(/[\\/?*\[\]:]/g, "_")
      .replace(/'/g, "")
      .trim()
      .slice(0, 31);
    if (!cleaned) cleaned = "未命名奖目";
    let finalName = cleaned;
    let i = 2;
    while (used.has(finalName)) {
      const suffix = `_${i}`;
      finalName = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
      i += 1;
    }
    used.add(finalName);
    return finalName;
  }

  function recordTitle(row) {
    return String(row.title || config.title || "未命名奖目").trim() || "未命名奖目";
  }

  function stockLabel(prize) {
    return prize.stock === null ? "不限" : String(prize.stock);
  }

  function renderStockPanel() {
    els.stockList.innerHTML = "";
    config.prizes.forEach((prize) => {
      const li = document.createElement("li");
      const gone = !isPrizeAvailable(prize);
      li.className = `stock-item${gone ? " gone" : ""}`;
      const qtyClass =
        prize.stock === null ? "" : prize.stock <= 0 ? " out" : prize.stock <= 2 ? " low" : "";
      li.innerHTML = `
        <span class="dot" style="background:${prize.color}"></span>
        <span class="name">${escapeHtml(prize.name)}</span>
        <span class="qty${qtyClass}">${stockLabel(prize)}</span>
      `;
      els.stockList.appendChild(li);
    });
  }

  function truncateLabel(text, max) {
    const s = String(text || "");
    return s.length > max ? `${s.slice(0, max)}…` : s;
  }

  function drawWheel(ctx, canvas, items, rotation, emptyText, labelFn) {
    const size = canvas.width;
    const radius = size / 2 - 8;
    const total = totalProbability(items) || 1;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(rotation);

    if (!items.length) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#d9e6f2";
      ctx.fill();
      ctx.fillStyle = "#5d758a";
      ctx.font = 'bold 20px "Noto Sans SC", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(emptyText, 0, 8);
    } else {
      let start = -Math.PI / 2;
      items.forEach((item) => {
        const angle = ((Number(item.probability) || 0) / total) * Math.PI * 2;
        const end = start + (angle || 0.0001);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const mid = (start + end) / 2;
        ctx.save();
        ctx.rotate(mid);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(13, Math.min(20, radius / 11))}px "Noto Sans SC", sans-serif`;
        ctx.shadowColor = "rgba(60,50,45,0.28)";
        ctx.shadowBlur = 3;
        ctx.fillText(labelFn(item), radius - 20, 5);
        ctx.restore();
        start = end;
      });
    }

    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fillStyle = "#f7f4ef";
    ctx.fill();
    ctx.restore();
  }

  function paintOrbitStar(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.22, -size * 0.22);
    ctx.lineTo(size, 0);
    ctx.lineTo(size * 0.22, size * 0.22);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.22, size * 0.22);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.22, -size * 0.22);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /** 人员侧：环形星轨转盘 + 中心发光星芒 + 外圈金轨 */
  function drawStarOrbitWheel(ctx, canvas, items, rotation) {
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 38;
    const midR = outerR * 0.78;
    const innerR = outerR * 0.38;
    const total = totalProbability(items) || 1;
    const t = performance.now() / 1000;
    const pulse = 0.85 + Math.sin(t * 2.4) * 0.15;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);

    const orbitSpecs = [
      { rx: outerR + 16, ry: outerR * 0.4, rot: -0.48, alpha: 0.8, stars: 5 },
      { rx: outerR + 26, ry: outerR * 0.48, rot: 0.32, alpha: 0.58, stars: 4 },
      { rx: outerR + 34, ry: outerR * 0.34, rot: -0.12, alpha: 0.4, stars: 3 },
    ];

    function strokeOrbitHalf(o, oi, front) {
      ctx.save();
      ctx.rotate(o.rot + Math.sin(t * 0.35 + oi) * 0.03);
      ctx.beginPath();
      // 后半弧 y>0 在盘后，前半弧 y<0 在盘前（椭圆参数角）
      if (front) ctx.ellipse(0, 0, o.rx, o.ry, 0, Math.PI, Math.PI * 2);
      else ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI);
      ctx.strokeStyle = `rgba(240, 193, 75, ${o.alpha})`;
      ctx.lineWidth = front ? 2.6 : 2.2;
      ctx.shadowColor = "rgba(240, 193, 75, 0.55)";
      ctx.shadowBlur = front ? 10 : 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let k = 0; k < o.stars; k++) {
        const a = (k / o.stars) * Math.PI * 2 + t * (0.12 + oi * 0.04);
        const onFront = Math.sin(a) < 0;
        if (onFront !== front) continue;
        paintOrbitStar(
          ctx,
          Math.cos(a) * o.rx,
          Math.sin(a) * o.ry,
          6 + oi * 2,
          k % 2 === 0 ? "#fff6c2" : "#f0c14b"
        );
      }
      ctx.restore();
    }

    // 盘后：轨道后半
    orbitSpecs.forEach((o, oi) => strokeOrbitHalf(o, oi, false));

    // 盘面底
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(12, 16, 48, 0.92)";
    ctx.fill();

    ctx.save();
    ctx.rotate(rotation);

    if (!items.length) {
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(60, 50, 120, 0.55)";
      ctx.fill("evenodd");
      ctx.fillStyle = "#93c5fd";
      ctx.font = 'bold 18px "Noto Sans SC", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("暂无人员", 0, 6);
    } else {
      let start = -Math.PI / 2;
      items.forEach((item, idx) => {
        const angle = ((Number(item.probability) || 0) / total) * Math.PI * 2;
        const end = start + (angle || 0.0001);
        const color = item.color || TUBE_TIPS[idx % TUBE_TIPS.length];

        ctx.beginPath();
        ctx.arc(0, 0, outerR, start, end);
        ctx.arc(0, 0, innerR, end, start, true);
        ctx.closePath();
        const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
        grad.addColorStop(0, "rgba(246, 231, 196, 0.92)");
        grad.addColorStop(0.55, "rgba(246, 231, 196, 0.88)");
        grad.addColorStop(0.72, color);
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "rgba(61, 42, 31, 0.55)";
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, outerR - 1, start, end);
        ctx.strokeStyle = "rgba(240, 193, 75, 0.55)";
        ctx.lineWidth = 3;
        ctx.stroke();

        const mid = (start + end) / 2;
        ctx.save();
        ctx.rotate(mid);
        ctx.textAlign = "right";
        ctx.fillStyle = "#2a1f18";
        ctx.font = `bold ${Math.max(12, Math.min(18, outerR / 12))}px "Noto Sans SC", sans-serif`;
        ctx.fillText(truncateLabel(item.name, 8), midR + 8, 5);
        ctx.restore();
        start = end;
      });
    }
    ctx.restore();

    // 双层金色外框
    ctx.beginPath();
    ctx.arc(0, 0, outerR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(240, 193, 75, 0.95)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, outerR - 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(253, 224, 120, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 外圈光珠
    const beads = 28;
    for (let i = 0; i < beads; i++) {
      const a = (i / beads) * Math.PI * 2 - t * 0.2;
      const bx = Math.cos(a) * (outerR + 3);
      const by = Math.sin(a) * (outerR + 3);
      const glow = 0.55 + Math.sin(t * 3 + i) * 0.35;
      ctx.beginPath();
      ctx.arc(bx, by, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 244, 180, ${glow})`;
      ctx.shadowColor = "rgba(240, 193, 75, 0.9)";
      ctx.shadowBlur = 9;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 内圈紫金细环
    ctx.beginPath();
    ctx.arc(0, 0, innerR + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(243, 167, 191, 0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 中心发光星芒（保留）
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, innerR * 0.95);
    g.addColorStop(0, `rgba(255, 250, 220, ${0.95 * pulse})`);
    g.addColorStop(0.25, `rgba(230, 195, 106, ${0.55 * pulse})`);
    g.addColorStop(0.55, `rgba(243, 167, 191, ${0.32 * pulse})`);
    g.addColorStop(1, "rgba(8, 14, 28, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, innerR - 2, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    const rays = 8;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + t * 0.35;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -innerR * 0.12);
      ctx.lineTo(innerR * 0.12 * pulse, -innerR * 0.72 * pulse);
      ctx.lineTo(0, -innerR * 0.22);
      ctx.lineTo(-innerR * 0.12 * pulse, -innerR * 0.72 * pulse);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 244, 180, ${0.55 * pulse})`;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.18 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#fff8dc";
    ctx.shadowColor = "rgba(240, 193, 75, 0.9)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 盘前：轨道前半 + 轨上星
    orbitSpecs.forEach((o, oi) => strokeOrbitHalf(o, oi, true));

    ctx.restore();
  }

  let peopleGlowRaf = 0;
  function ensurePeopleGlowLoop() {
    if (peopleGlowRaf) return;
    const tick = () => {
      if (!spinningPeople) {
        drawStarOrbitWheel(peopleCtx, els.peopleCanvas, config.people, peopleRotation);
      }
      peopleGlowRaf = requestAnimationFrame(tick);
    };
    peopleGlowRaf = requestAnimationFrame(tick);
  }

  function redrawAll() {
    drawStarOrbitWheel(
      peopleCtx,
      els.peopleCanvas,
      config.people,
      peopleRotation
    );
    ensurePeopleGlowLoop();
    syncTubeSticks();
    renderStockPanel();
    updateButtons();
  }

  function syncTubeSticks() {
    if (!els.tubeCanvas || !tubeCtx) return;
    const count = 28;
    const prev = tubeState.sticks;
    tubeState.sticks = [];
    for (let i = 0; i < count; i++) {
      const old = prev[i];
      const layer = i % 3;
      const slot = Math.floor(i / 3);
      const slots = Math.ceil(count / 3);
      const ang = (slot / slots) * Math.PI * 2 - Math.PI / 2 + layer * 0.07;
      const ring = 0.48 + layer * 0.16 + (slot % 3) * 0.02;
      tubeState.sticks.push({
        ang,
        ring: Math.min(0.88, ring),
        tip: TUBE_TIPS[(i * 3) % TUBE_TIPS.length],
        lean: Math.cos(ang) * (2 + layer * 1.6) + (i % 5 - 2) * 0.5,
        // 闲置：花朵完整露出，下端被前口沿遮住
        h: 0.18 + (i % 5) * 0.012 + (2 - layer) * 0.01,
        shade: i % 3 === 0 ? 0.08 : i % 3 === 1 ? 0.04 : 0,
        wobble: old ? old.wobble : Math.random() * Math.PI * 2,
      });
    }
    ensureTubeLoop();
  }

  function ensureTubeLoop() {
    if (tubeState.raf) return;
    tubeState.lastTs = performance.now();
    const tick = (ts) => {
      const dt = Math.min(0.033, (ts - tubeState.lastTs) / 1000 || 0.016);
      tubeState.lastTs = ts;
      const shaking = tubeState.mode === "shake";
      tubeState.sticks.forEach((s) => {
        s.wobble += dt * (shaking ? 14 : 1.2);
      });
      if (tubeState.mode === "rise") {
        tubeState.riseProgress = Math.min(1, tubeState.riseProgress + dt * 1.2);
      }
      drawTube();
      tubeState.raf = requestAnimationFrame(tick);
    };
    tubeState.raf = requestAnimationFrame(tick);
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function paintFlower(ctx, cx, cy, radius, color) {
    const petals = 5;
    const line = Math.max(2.2, radius * 0.14);
    ctx.save();
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * radius * 0.48;
      const py = cy + Math.sin(a) * radius * 0.48;
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.46, radius * 0.32, a, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#5c2418";
      ctx.lineWidth = line;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe56a";
    ctx.fill();
    ctx.strokeStyle = "#5c2418";
    ctx.lineWidth = line;
    ctx.stroke();
    ctx.restore();
  }

  function paintStick(ctx, x, y, w, h, tipColor, lean, label, shade = 0) {
    ctx.save();
    ctx.translate(x, y + h);
    ctx.rotate((lean * Math.PI) / 180);
    ctx.translate(-w / 2, -h);

    const flowerR = w * 1.05;
    const bodyTop = flowerR * 0.75;
    const r = w * 0.48;
    const line = Math.max(2.4, w * 0.16);
    const choco =
      shade > 0.05 ? "#5a2e1c" : shade > 0 ? "#6b3a24" : "#7a452c";

    roundRect(ctx, 0, bodyTop, w, Math.max(h - bodyTop, w), r);
    ctx.fillStyle = choco;
    ctx.fill();
    ctx.strokeStyle = "#3b1a10";
    ctx.lineWidth = line;
    ctx.stroke();

    if (shade > 0) {
      roundRect(
        ctx,
        line * 0.35,
        bodyTop + w * 0.15,
        w - line * 0.7,
        Math.max(h - bodyTop - w * 0.3, 4),
        r * 0.35
      );
      ctx.fillStyle = `rgba(20, 8, 4, ${0.12 + shade * 0.35})`;
      ctx.fill();
    }

    paintFlower(ctx, w / 2, flowerR * 0.5, flowerR, tipColor);

    if (label) {
      const text = String(label).slice(0, 8);
      const chars = text.split("");
      const fontSize = Math.min(24, Math.max(17, Math.round(w * 0.48)));
      const gap = fontSize * 1.08;
      const bottomPad = Math.max(fontSize * 1.15, w * 0.55);
      const startY = h - bottomPad - (chars.length - 1) * gap;
      ctx.fillStyle = "#fff6e8";
      ctx.font = `bold ${fontSize}px 'Noto Sans SC', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      chars.forEach((ch, i) => {
        ctx.fillText(ch, w / 2, startY + i * gap);
      });
    }
    ctx.restore();
  }

  function paintHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.32);
    ctx.bezierCurveTo(0, size * 0.05, -size * 0.55, -size * 0.35, -size * 0.55, size * 0.05);
    ctx.bezierCurveTo(-size * 0.55, size * 0.42, 0, size * 0.72, 0, size);
    ctx.bezierCurveTo(0, size * 0.72, size * 0.55, size * 0.42, size * 0.55, size * 0.05);
    ctx.bezierCurveTo(size * 0.55, -size * 0.35, 0, size * 0.05, 0, size * 0.32);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(120, 20, 40, 0.35)";
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  function paintSpark4(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.22, -size * 0.22);
    ctx.lineTo(size, 0);
    ctx.lineTo(size * 0.22, size * 0.22);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.22, size * 0.22);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.22, -size * 0.22);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function paintBalloon(ctx, x, y, rx, ry, color, stringTo) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 2, x, y, rx);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.22, color);
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(40, 20, 40, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + ry);
    ctx.lineTo(x - 3, y + ry + 6);
    ctx.lineTo(x + 3, y + ry + 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (stringTo) {
      ctx.beginPath();
      ctx.moveTo(x, y + ry + 6);
      ctx.quadraticCurveTo(
        (x + stringTo.x) / 2 + 8,
        (y + ry + 6 + stringTo.y) / 2,
        stringTo.x,
        stringTo.y
      );
      ctx.strokeStyle = "rgba(80, 60, 90, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintBow(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.9, -s * 0.55, -s * 1.15, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.35, s * 0.25, 0, 0);
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.9, -s * 0.55, s * 1.15, s * 0.1);
    ctx.quadraticCurveTo(s * 0.35, s * 0.25, 0, 0);
    ctx.fillStyle = "#e11d48";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fb7185";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, s * 0.02, s * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#f0c14b";
    ctx.fill();
    ctx.restore();
  }

  function paintStrawberry(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(s * 0.85, s * 0.35, s * 0.7, -s * 0.35, 0, -s * 0.25);
    ctx.bezierCurveTo(-s * 0.7, -s * 0.35, -s * 0.85, s * 0.35, 0, s);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = -0.7 + i * 0.35;
      ctx.beginPath();
      ctx.ellipse(Math.sin(a) * s * 0.28, Math.cos(a) * s * 0.15, 1.4, 2.2, a, 0, Math.PI * 2);
      ctx.fillStyle = "#fde68a";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, -s * 0.28);
    ctx.quadraticCurveTo(0, -s * 0.7, s * 0.22, -s * 0.28);
    ctx.quadraticCurveTo(0, -s * 0.42, -s * 0.22, -s * 0.28);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
    ctx.restore();
  }

  function paintBlueberry(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, "#93c5fd");
    g.addColorStop(1, "#1d4ed8");
    ctx.fillStyle = g;
    ctx.fill();
  }

  function paintCreamSwirl(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 3; i >= 0; i--) {
      ctx.beginPath();
      ctx.ellipse(0, -i * s * 0.22, s * (0.55 - i * 0.06), s * (0.32 - i * 0.03), 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? "#fbf8f4" : "#f0e6ef";
      ctx.fill();
    }
    ctx.restore();
  }

  function paintGem(ctx, x, y, r, colorA, colorB) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
    g.addColorStop(0, colorA);
    g.addColorStop(1, colorB);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 248, 220, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function paintBowCosmic(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.9, -s * 0.55, -s * 1.15, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.35, s * 0.25, 0, 0);
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.9, -s * 0.55, s * 1.15, s * 0.1);
    ctx.quadraticCurveTo(s * 0.35, s * 0.25, 0, 0);
    ctx.fillStyle = "#e57a9b";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f3a7bf";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, s * 0.02, s * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#f0c14b";
    ctx.fill();
    ctx.restore();
  }

  function fillCakeBody(ctx, cx, rimY, topRx, botY, botRx, h) {
    ctx.beginPath();
    ctx.moveTo(cx - topRx, rimY);
    ctx.lineTo(cx + topRx, rimY);
    ctx.lineTo(cx + botRx, botY);
    ctx.quadraticCurveTo(cx, botY + h * 0.02, cx - botRx, botY);
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - topRx, rimY, cx + topRx, botY);
    g.addColorStop(0, "#24365a");
    g.addColorStop(0.4, "#1a2a48");
    g.addColorStop(0.75, "#121f38");
    g.addColorStop(1, "#0c1628");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(230, 195, 106, 0.6)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function fillCreamRim(ctx, cx, cy, outRx, outRy, inRx, inRy, frontOnly) {
    ctx.save();
    if (frontOnly) {
      ctx.beginPath();
      ctx.rect(cx - outRx - 8, cy - 2, outRx * 2 + 16, outRy * 2 + 16);
      ctx.clip();
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, outRx, outRy, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy - 2, inRx, inRy, 0, 0, Math.PI * 2, true);
    ctx.fillStyle = "#f7f2ec";
    ctx.fill("evenodd");
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.12;
      if (frontOnly && Math.sin(a) < 0.05) continue;
      if (!frontOnly && Math.sin(a) > 0.35) continue;
      const px = cx + Math.cos(a) * ((outRx + inRx) * 0.5);
      const py = cy + Math.sin(a) * ((outRy + inRy) * 0.5) - 4;
      paintCreamSwirl(ctx, px, py, Math.max(10, outRx * 0.14));
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, outRx, outRy, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(240, 193, 75, 0.65)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawTube() {
    if (!tubeCtx || !els.tubeCanvas) return;
    const w = els.tubeCanvas.width;
    const h = els.tubeCanvas.height;
    tubeCtx.clearRect(0, 0, w, h);
    const ctx = tubeCtx;

    const cx = w * 0.5;
    const rimY = h * 0.38;
    const topRx = w * 0.28;
    const topRy = h * 0.048;
    const botY = h * 0.88;
    const botRx = w * 0.25;
    const stickW = w * 0.068;
    const topPad = 40;
    const outRx = topRx * 1.06;
    const outRy = topRy * 1.55;
    const inRx = topRx * 0.72;
    const inRy = topRy * 0.95;
    const t = performance.now() / 1000;

    // 底影
    ctx.beginPath();
    ctx.ellipse(cx, botY + h * 0.035, botRx * 1.15, h * 0.022, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(40, 20, 60, 0.28)";
    ctx.fill();

    // 金色底座
    ctx.beginPath();
    ctx.ellipse(cx, botY + 8, botRx * 1.12, h * 0.028, 0, 0, Math.PI * 2);
    const gold = ctx.createLinearGradient(cx - botRx, botY, cx + botRx, botY + 16);
    gold.addColorStop(0, "#fde68a");
    gold.addColorStop(0.5, "#f0c14b");
    gold.addColorStop(1, "#d97706");
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 气球（身后）——紫金星夜
    paintBalloon(ctx, cx - topRx * 1.35, rimY + h * 0.12, 18, 24, "#f3a7bf", {
      x: cx - botRx * 0.55,
      y: botY - 28,
    });
    paintBalloon(ctx, cx - topRx * 1.05, rimY + h * 0.22, 12, 16, "#e6c36a", {
      x: cx - botRx * 0.4,
      y: botY - 20,
    });
    paintBalloon(ctx, cx + topRx * 1.32, rimY + h * 0.14, 17, 23, "#c9b6e0", {
      x: cx + botRx * 0.55,
      y: botY - 28,
    });
    paintBalloon(ctx, cx + topRx * 1.02, rimY + h * 0.24, 11, 15, "#f8c8d8", {
      x: cx + botRx * 0.4,
      y: botY - 18,
    });

    // 星夜蛋糕身
    fillCakeBody(ctx, cx, rimY, topRx, botY, botRx, h);

    // 腰部紫金丝带
    ctx.beginPath();
    ctx.moveTo(cx - botRx * 0.95, botY - 36);
    ctx.quadraticCurveTo(cx, botY - 22, cx + botRx * 0.95, botY - 36);
    ctx.strokeStyle = "rgba(243, 167, 191, 0.85)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - botRx * 0.92, botY - 26);
    ctx.quadraticCurveTo(cx, botY - 14, cx + botRx * 0.92, botY - 26);
    ctx.strokeStyle = "rgba(230, 195, 106, 0.9)";
    ctx.lineWidth = 6;
    ctx.stroke();

    // 星云奶油后沿 + 内腔
    fillCreamRim(ctx, cx, rimY, outRx, outRy, inRx, inRy, false);
    ctx.beginPath();
    ctx.ellipse(cx, rimY - 2, inRx, inRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0a1424";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, rimY - 2, inRx, inRy, 0, Math.PI, 0, true);
    ctx.strokeStyle = "#5a6f96";
    ctx.lineWidth = Math.max(8, outRy - inRy);
    ctx.stroke();

    const ordered = [...tubeState.sticks].sort(
      (a, b) => Math.sin(a.ang) - Math.sin(b.ang)
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, rimY + inRy * 2.6);
    ctx.clip();
    ordered.forEach((s) => {
      const ox = Math.cos(s.ang) * inRx * s.ring * 0.72;
      const baseX = cx + ox;
      const baseY = rimY + inRy * 1.35;
      const jiggle =
        tubeState.mode === "shake"
          ? Math.sin(s.wobble * 1.8) * 2.4 + Math.cos(s.wobble) * 1.0
          : Math.sin(s.wobble) * 0.25;
      const leanJ =
        tubeState.mode === "shake"
          ? Math.sin(s.wobble * 1.4) * 2.2
          : Math.sin(s.wobble) * 0.25;
      const flowerOver = stickW * 1.05 * 0.5;
      const stickH = Math.min(
        h * s.h + inRy * 2.8,
        baseY + jiggle - topPad - flowerOver
      );
      if (stickH < stickW * 2.2) return;
      paintStick(
        ctx,
        baseX,
        baseY - stickH + jiggle,
        stickW,
        stickH,
        s.tip,
        s.lean + leanJ,
        null,
        s.shade || 0
      );
    });
    ctx.restore();

    // 星云奶油前沿盖住签根
    fillCreamRim(ctx, cx, rimY, outRx, outRy, inRx, inRy, true);

    // 口沿宝石 / 星芒
    paintGem(ctx, cx - outRx * 0.55, rimY + outRy * 0.55, 7, "#fde68a", "#d97706");
    paintGem(ctx, cx + outRx * 0.42, rimY + outRy * 0.35, 6, "#f8c8d8", "#e57a9b");
    paintGem(ctx, cx - outRx * 0.18, rimY + outRy * 0.75, 4.5, "#e8eef8", "#8fa6c8");
    paintGem(ctx, cx + outRx * 0.12, rimY + outRy * 0.7, 4, "#fde68a", "#d4a017");
    paintGem(ctx, cx + outRx * 0.65, rimY + outRy * 0.15, 5, "#c9b6e0", "#7a6a9a");
    paintSpark4(ctx, cx - outRx * 0.05, rimY + outRy * 0.3, 8, "#fff6c2");
    paintSpark4(ctx, cx + outRx * 0.28, rimY + outRy * 0.6, 6, "#f8c8d8");

    // 侧边描线
    ctx.beginPath();
    ctx.moveTo(cx + topRx, rimY);
    ctx.lineTo(cx + botRx, botY);
    ctx.quadraticCurveTo(cx, botY + h * 0.02, cx - botRx, botY);
    ctx.lineTo(cx - topRx, rimY);
    ctx.strokeStyle = "rgba(243, 167, 191, 0.45)";
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // 高光
    ctx.beginPath();
    ctx.moveTo(cx - topRx * 0.7, rimY + 16);
    ctx.lineTo(cx - botRx * 0.55, botY - 40);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();

    // 竖排「碎碎生日快乐」
    ctx.save();
    ctx.fillStyle = "#e6c36a";
    ctx.shadowColor = "rgba(230, 195, 106, 0.45)";
    ctx.shadowBlur = 8;
    ctx.font = `${Math.round(w * 0.095)}px 'Long Cang', 'ZCOOL KuaiLe', cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    "碎碎生日快乐".split("").forEach((ch, i) => {
      ctx.fillText(ch, cx, h * 0.53 + i * (h * 0.05));
    });
    ctx.shadowBlur = 0;
    ctx.restore();

    // 筒身星芒 / 爱心 / 星屑
    paintHeart(ctx, cx - topRx * 0.55, h * 0.52, 14, "#f3a7bf");
    paintHeart(ctx, cx + topRx * 0.52, h * 0.58, 12, "#e57a9b");
    paintHeart(ctx, cx + topRx * 0.35, h * 0.7, 10, "#f8c8d8");
    paintSpark4(ctx, cx - topRx * 0.7, rimY + 28, 8, "#fff6c2");
    paintSpark4(ctx, cx + topRx * 0.72, rimY + 40, 7, "#f8c8d8");
    paintSpark4(ctx, cx - topRx * 0.4, botY - 48, 6, "#e8eef8");
    const confetti = [
      [-0.75, 0.55, "#f3a7bf", 0.4],
      [0.7, 0.62, "#e6c36a", -0.3],
      [-0.6, 0.72, "#c9b6e0", 0.6],
      [0.55, 0.48, "#f8c8d8", -0.5],
      [-0.35, 0.78, "#fde68a", 0.2],
      [0.4, 0.75, "#b7c2d8", -0.2],
    ];
    confetti.forEach(([nx, ny, color, rot], i) => {
      const bx = cx + topRx * nx;
      const by = h * ny + Math.sin(t * 1.5 + i) * 2;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot + Math.sin(t + i) * 0.15);
      ctx.fillStyle = color;
      ctx.fillRect(-3, -2, 7, 4);
      ctx.restore();
    });

    // 底部紫金蝴蝶结
    paintBowCosmic(ctx, cx, botY - 18, 22);

    if (tubeState.mode === "rise") {
      const p = tubeState.riseProgress;
      const ease = 1 - Math.pow(1 - p, 3);
      const label = tubeState.riseLabel || "";
      const sw = Math.max(stickW * 1.55, w * 0.11);
      const sh = h * 0.58;
      const yStart = rimY - h * 0.14;
      const yEnd = Math.max(topPad, rimY - sh * 0.82);
      const y = yStart + (yEnd - yStart) * ease;
      paintStick(
        ctx,
        cx,
        y,
        sw,
        sh,
        tubeState.riseTip,
        Math.sin(p * 5) * 1.2,
        label,
        0
      );
    }
  }

  function animateLotteryTube({ items, onDone, setSpinning }) {
    const winnerIndex = pickWeightedIndex(items);
    const winner = items[winnerIndex];
    setSpinning(true);
    updateButtons();
    syncTubeSticks();
    tubeState.mode = "shake";
    tubeState.riseProgress = 0;
    tubeState.riseLabel = "";
    if (els.lotteryTube) els.lotteryTube.classList.add("shaking");
    playTubeShakeSound(2.2);

    window.setTimeout(() => {
      tubeState.mode = "rise";
      tubeState.riseProgress = 0;
      tubeState.riseLabel = winner.name || "";
      tubeState.riseTip =
        TUBE_TIPS[Math.floor(Math.random() * TUBE_TIPS.length)];
      if (els.lotteryTube) els.lotteryTube.classList.remove("shaking");
    }, 2200);

    window.setTimeout(() => {
      tubeState.mode = "idle";
      tubeState.riseProgress = 0;
      tubeState.riseLabel = "";
      setSpinning(false);
      updateButtons();
      syncTubeSticks();
      onDone(winner);
    }, 4000);
  }

  function pickWeightedIndex(items) {
    const total = totalProbability(items);
    if (total <= 0) return Math.floor(Math.random() * items.length);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Number(items[i].probability) || 0;
      if (r <= 0) return i;
    }
    return items.length - 1;
  }

  function segmentCenterAngle(index, items) {
    const total = totalProbability(items) || 1;
    let start = -Math.PI / 2;
    for (let i = 0; i < items.length; i++) {
      const angle = ((Number(items[i].probability) || 0) / total) * Math.PI * 2;
      const end = start + (angle || 0.0001);
      if (i === index) return (start + end) / 2;
      start = end;
    }
    return 0;
  }

  function animateSpin({
    getRotation,
    setRotation,
    draw,
    items,
    onDone,
    setSpinning,
  }) {
    const winnerIndex = pickWeightedIndex(items);
    const winner = items[winnerIndex];
    const center = segmentCenterAngle(winnerIndex, items);
    const rotation = getRotation();
    const current = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const targetMod = (((-Math.PI / 2 - center) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = targetMod - current;
    if (delta <= 0) delta += Math.PI * 2;
    const target = rotation + delta + (5 + Math.floor(Math.random() * 3)) * Math.PI * 2;
    const start = rotation;
    const duration = 3800 + Math.random() * 800;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    setSpinning(true);
    updateButtons();

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      setRotation(start + (target - start) * ease(t));
      draw();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        setRotation(target);
        draw();
        setSpinning(false);
        onDone(winner);
      }
    }
    requestAnimationFrame(frame);
  }

  function spinPeople() {
    if (spinningPeople) return;
    if (config.people.length < 1) {
      alert("请先在设置中添加人员");
      return;
    }
    if (totalProbability(config.people) <= 0) {
      alert("人员概率合计必须大于 0");
      return;
    }

    animateSpin({
      getRotation: () => peopleRotation,
      setRotation: (v) => {
        peopleRotation = v;
      },
      draw: () =>
        drawStarOrbitWheel(
          peopleCtx,
          els.peopleCanvas,
          config.people,
          peopleRotation
        ),
      items: config.people,
      setSpinning: (v) => {
        spinningPeople = v;
      },
      onDone: (winner) => {
        if (config.removeWinner) {
          config.people = config.people.filter((p) => p.id !== winner.id);
          if (config.people.length >= 1) {
            ensureProbSum100(config.people, "ratio");
          }
          saveConfig(config);
        }
        addHistory("person", winner.name);
        els.lastPerson.textContent = `中奖人：${winner.name}`;
        redrawAll();
        showResult("person", winner.name);
      },
    });
  }

  function spinPrize() {
    if (spinningPrize) return;
    if (els.chkDesignate && els.chkDesignate.checked && !getDesignatedPerson()) {
      alert("已开启指定中奖人，请先填写姓名");
      els.inputDesignate && els.inputDesignate.focus();
      return;
    }
    const pool = availablePrizes();
    if (pool.length < 1) {
      alert("所有限量奖品已抽完，请补充库存");
      return;
    }
    if (totalProbability(pool) <= 0) {
      alert("可用奖品的概率合计必须大于 0");
      return;
    }

    animateLotteryTube({
      items: pool,
      setSpinning: (v) => {
        spinningPrize = v;
      },
      onDone: (winner) => {
        const prize = config.prizes.find((p) => p.id === winner.id);
        if (prize && prize.stock !== null) {
          prize.stock = Math.max(0, prize.stock - 1);
        }
        const designated = getDesignatedPerson();
        if (designated) {
          addHistoryPair(designated, winner.name);
          els.lastPerson.textContent = `中奖人：${designated}`;
        } else {
          addHistory("prize", winner.name);
        }
        saveConfig(config);
        els.lastPrize.textContent = designated
          ? `${designated} → ${winner.name}`
          : `奖品：${winner.name}`;
        redrawAll();
        showResult("prize", winner.name, designated || "");
      },
    });
  }

  let audioCtx = null;

  function ensureAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(ctx, { freq, type = "triangle", start, dur = 0.35, peak = 0.2 }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  let tubeShakeAudio = null;
  function getTubeShakeAudio() {
    if (!tubeShakeAudio) {
      tubeShakeAudio = new Audio("assets/tube-shake.mp3");
      tubeShakeAudio.preload = "auto";
    }
    return tubeShakeAudio;
  }

  /** 摇签筒：使用指定 mp3 音效 */
  function playTubeShakeSound(durationSec = 2.2) {
    try {
      const audio = getTubeShakeAudio();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.9;
      audio.loop = false;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => console.warn("摇签音效播放失败", err));
      }
      // 摇签结束时淡出停掉，避免音效比动画更长
      window.setTimeout(() => {
        try {
          if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
          }
        } catch (_) {
          /* ignore */
        }
      }, Math.round(durationSec * 1000));
    } catch (err) {
      console.warn("摇签音效播放失败", err);
    }
  }

  /** 中奖人转盘：上行和弦音效 */
  function playPersonWinSound() {
    try {
      const ctx = ensureAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone(ctx, { freq, type: "triangle", start: now + i * 0.12, dur: 0.35, peak: 0.22 });
      });
      tone(ctx, { freq: 1318.5, type: "sine", start: now + 0.35, dur: 0.55, peak: 0.12 });
    } catch (err) {
      console.warn("音效播放失败", err);
    }
  }

  /** 奖品转盘：鼓点式庆祝音效（与中奖人不同） */
  function playPrizeWinSound() {
    try {
      const ctx = ensureAudio();
      if (!ctx) return;
      const now = ctx.currentTime;

      // bright descending sparkle
      [987.77, 880.0, 783.99, 659.25].forEach((freq, i) => {
        tone(ctx, { freq, type: "square", start: now + i * 0.08, dur: 0.22, peak: 0.09 });
      });

      // warm major hit
      [392.0, 493.88, 587.33].forEach((freq, i) => {
        tone(ctx, {
          freq,
          type: "sawtooth",
          start: now + 0.28 + i * 0.04,
          dur: 0.55,
          peak: 0.08,
        });
      });

      // final chime
      tone(ctx, { freq: 1174.66, type: "sine", start: now + 0.55, dur: 0.7, peak: 0.16 });
      tone(ctx, { freq: 1567.98, type: "sine", start: now + 0.62, dur: 0.65, peak: 0.1 });
    } catch (err) {
      console.warn("音效播放失败", err);
    }
  }

  let confettiRaf = null;
  let confettiPieces = [];

  function stopConfetti() {
    if (confettiRaf) {
      cancelAnimationFrame(confettiRaf);
      confettiRaf = null;
    }
    confettiPieces = [];
    const canvas = els.confettiCanvas;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function launchConfetti() {
    const canvas = els.confettiCanvas;
    if (!canvas) return;
    stopConfetti();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#FF7A45", "#F0C14B", "#7B5CFF", "#FF8FA3", "#4ECDC4", "#E9C46A", "#fff"];
    const originX = w * 0.58;
    const originY = h * 0.38;
    confettiPieces = Array.from({ length: 90 }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 7 + Math.random() * 11;
      return {
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        w: 5 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        life: 1,
        decay: 0.008 + Math.random() * 0.01,
      };
    });

    const t0 = performance.now();
    function frame(now) {
      const elapsed = now - t0;
      ctx.clearRect(0, 0, w, h);
      confettiPieces.forEach((p) => {
        p.vy += 0.22;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= p.decay;
        if (p.life <= 0) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      confettiPieces = confettiPieces.filter((p) => p.life > 0 && p.y < h + 40);
      if (confettiPieces.length && elapsed < 3200) {
        confettiRaf = requestAnimationFrame(frame);
      } else {
        stopConfetti();
      }
    }
    confettiRaf = requestAnimationFrame(frame);
  }

  function replayMascot() {
    if (!els.celebMascot) return;
    const nodes = [
      els.celebMascot,
      ...els.celebMascot.querySelectorAll(".mascot-img, .spark"),
    ];
    nodes.forEach((node) => {
      node.style.animation = "none";
    });
    void els.celebMascot.offsetWidth;
    nodes.forEach((node) => {
      node.style.animation = "";
    });
  }

  function stopSpeech() {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (_) {
      /* ignore */
    }
  }

  function scoreSweetVoice(v) {
    const name = `${v.name} ${v.lang}`;
    const n = name.toLowerCase();
    let score = 0;
    if (/zh-cn|zh_cn|zh-hk|zh-tw|chinese|中文|普通话|國語|国语/.test(n)) score += 20;
    else if (String(v.lang).toLowerCase().startsWith("zh")) score += 12;
    else return -1;

    // 偏甜、年轻女声常见名称加权
    const sweetHits = [
      "xiaoxiao",
      "xiaoyi",
      "yunxia",
      "xiaochen",
      "xiaomeng",
      "xiaorou",
      "xiaoshuang",
      "xiaoyan",
      "huihui",
      "yaoyao",
      "kangkang",
      "tingting",
      "meijia",
      "hanhan",
      "female",
      "woman",
      "girl",
      "女",
    ];
    sweetHits.forEach((key) => {
      if (n.includes(key)) score += 30;
    });

    // 避开偏硬/男声/旁白
    const avoid = ["male", "yunyang", "yunjian", "kefu", "news", "男", "旁白", "播音"];
    avoid.forEach((key) => {
      if (n.includes(key)) score -= 40;
    });

    // Microsoft Online Neural 通常更自然
    if (/neural|online|natural|自然/.test(n)) score += 15;
    if (/microsoft|google|apple|siri|ting-ting|mei-jia/.test(n)) score += 8;
    return score;
  }

  function pickSweetVoice() {
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    let best = null;
    let bestScore = -1;
    voices.forEach((v) => {
      const s = scoreSweetVoice(v);
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    });
    return bestScore > 0 ? best : null;
  }

  const SPEECH_BANK = {
    personOpen: [
      "哇！恭喜恭喜！",
      "太棒了！",
      "耶！好运爆棚！",
      "啊哈！中奖了！",
      "恭喜恭喜！超开心！",
      "哇哦！好运来啦！",
      "天呐！恭喜你！",
      "好耶！就是你！",
    ],
    personClose: [
      "中奖啦！太开心了！",
      "中奖啦！好运满满！",
      "中奖啦！恭喜恭喜！",
      "中奖啦！今晚可以开心庆祝啦！",
      "中奖啦！好运一直陪伴你！",
      "中奖啦！幸福加倍哦！",
      "中奖啦！掌声送给你！",
      "中奖啦！继续好运吧！",
      "中奖啦！祝你天天开心，万事如意！",
    ],
    prizeOpen: [
      "太棒了！",
      "哇塞！好运连连！",
      "耶！大奖靠近！",
      "恭喜恭喜！",
      "哇哦！惊喜来了！",
      "好幸运啊！",
      "天呐！这份礼物绝了！",
      "叮咚！好运到账！",
    ],
    prizeClose: [
      "好运连连哦！",
      "愿你天天开心！",
      "这份幸运真不错！",
      "继续保持好运吧！",
      "开心收下这份礼物吧！",
      "幸福满满哦！",
      "好运常伴你左右！",
      "今晚可以美美庆祝啦！",
      "祝你天天开心，万事如意！",
      "愿你岁岁平安，身心健康！",
    ],
    punishOpen: [
      "哎呀！",
      "哦豁！",
      "嘿嘿！",
      "注意啦！",
      "哇哦！",
      "叮咚！",
      "不好啦！",
    ],
    punishLine: [
      "独特幸运，来解锁今天的快乐任务吧！",
      "恭喜抽中：再送一份！",
      "运气爆棚，请再送出一份吧！",
      "缘分安排：再来一份哦～",
      "手气太旺，再送一份才圆满！",
      "再送一份已生效，请准备冰蓝玫瑰哦！",
      "今日份赠礼名额，非你莫属！",
      "抽中再送一份，爱心加一！",
      "好运附赠义务：再送一束冰蓝玫瑰呀！",
      "别慌，只是再送一份小心意啦！",
    ],
    punishClose: [
      "送出冰蓝玫瑰，快乐翻倍！誓死效忠碎碎！",
      "小小礼物，大大心意！誓死效忠碎碎！送给碎碎最爱的冰蓝玫瑰吧",
      "送完冰蓝玫瑰，功德加一！誓死效忠碎碎",
      "解锁专属彩蛋运气爆棚了！誓死效忠碎碎！碎碎最爱冰蓝玫瑰了！",
      "再送一束冰蓝玫瑰，友谊加加倍升温！誓死效忠碎碎",
      "准备好冰蓝玫瑰，开开心心送出去吧！誓死效忠碎碎哦",
      "这束冰蓝玫瑰，大家都会记得你的！誓死效忠碎碎呀",
    ],
  };

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function isPunishPrize(name) {
    const n = String(name || "").trim();
    return n === "再送一份" || n === "再送一只";
  }

  function buildExcitedSpeech(kind, name, person) {
    if (kind === "prize" && isPunishPrize(name)) {
      if (person) {
        return `${pickRandom(SPEECH_BANK.punishOpen)}${person}！${pickRandom(SPEECH_BANK.punishLine)}！${pickRandom(SPEECH_BANK.punishClose)}`;
      }
      return `${pickRandom(SPEECH_BANK.punishOpen)}${pickRandom(SPEECH_BANK.punishLine)}！${pickRandom(SPEECH_BANK.punishClose)}`;
    }
    if (kind === "prize") {
      if (person) {
        return `${pickRandom(SPEECH_BANK.prizeOpen)}恭喜${person}获得${name}！${pickRandom(SPEECH_BANK.prizeClose)}`;
      }
      return `${pickRandom(SPEECH_BANK.prizeOpen)}恭喜获得${name}！${pickRandom(SPEECH_BANK.prizeClose)}`;
    }
    return `${pickRandom(SPEECH_BANK.personOpen)}${name}！${pickRandom(SPEECH_BANK.personClose)}`;
  }

  function speakExcited(kind, name, person) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      stopSpeech();
      const text = buildExcitedSpeech(kind, name, person);
      let started = false;

      const enqueue = () => {
        if (started) return;
        started = true;
        const voice = pickSweetVoice();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = (voice && voice.lang) || "zh-CN";
        if (voice) utter.voice = voice;
        utter.rate = 1.72;
        utter.pitch = 1.38;
        utter.volume = 1;
        window.speechSynthesis.speak(utter);
      };

      if (window.speechSynthesis.getVoices().length) enqueue();
      else {
        window.speechSynthesis.addEventListener("voiceschanged", enqueue, { once: true });
        setTimeout(enqueue, 220);
      }
    } catch (err) {
      console.warn("语音播报失败", err);
    }
  }

  function showResult(kind, name, person) {
    const punish = kind === "prize" && isPunishPrize(name);
    let text;
    if (punish) {
      text = person
        ? `${person}：${pickRandom(SPEECH_BANK.punishLine)}`
        : pickRandom(SPEECH_BANK.punishLine);
    } else if (kind === "prize") {
      text = person ? `恭喜${person}获得${name}` : `恭喜获得${name}`;
    } else {
      text = `恭喜${name}中奖啦`;
    }
    els.resultTitle.textContent = text;
    if (kind === "prize") playPrizeWinSound();
    else playPersonWinSound();
    els.resultModal.classList.add("open");
    els.resultModal.setAttribute("aria-hidden", "false");
    replayMascot();
    launchConfetti();
    setTimeout(() => speakExcited(kind, name, person || ""), 320);
  }

  function hideResult() {
    els.resultModal.classList.remove("open");
    els.resultModal.setAttribute("aria-hidden", "true");
    stopConfetti();
    stopSpeech();
  }

  function openHistory() {
    els.historyList.innerHTML = "";
    if (!history.length) {
      els.historyList.innerHTML = '<li class="empty">暂无记录</li>';
    } else {
      history.forEach((row) => {
        const li = document.createElement("li");
        const time = new Date(row.time).toLocaleString();
        const info = historyLabel(row);
        const title = recordTitle(row);
        li.textContent = `【${title}】${info.kind}：${info.value}（${time}）`;
        els.historyList.appendChild(li);
      });
    }
    els.historyModal.classList.add("open");
    els.historyModal.setAttribute("aria-hidden", "false");
  }

  function hideHistory() {
    els.historyModal.classList.remove("open");
    els.historyModal.setAttribute("aria-hidden", "true");
  }

  function openStock() {
    renderStockPanel();
    if (!config.prizes.length) {
      els.stockList.innerHTML = '<li class="empty">暂无奖品</li>';
    }
    els.stockModal.classList.add("open");
    els.stockModal.setAttribute("aria-hidden", "false");
  }

  function hideStock() {
    els.stockModal.classList.remove("open");
    els.stockModal.setAttribute("aria-hidden", "true");
  }

  async function saveWorkbookWithPicker(book, filename) {
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
          types: [
            {
              description: "Excel 工作簿",
              accept: {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
                  ".xlsx",
                ],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(buffer);
        await writable.close();
        return true;
      }
    } catch (err) {
      if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) {
        return false;
      }
      console.warn("另存为失败，回退普通下载", err);
    }
    XLSX.writeFile(book, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    return true;
  }

  async function exportHistory() {
    if (!history.length) {
      alert("暂无中奖记录可导出");
      return;
    }

    const stamp = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const filename = `中奖记录_${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}`;

    // 按转盘标题（不同奖目）分到不同 sheet
    const groups = new Map();
    history.forEach((row) => {
      const title = recordTitle(row);
      if (!groups.has(title)) {
        groups.set(title, [["时间", "类型", "中奖人", "奖品", "结果"]]);
      }
      const info = historyLabel(row);
      groups.get(title).push([
        new Date(row.time).toLocaleString(),
        info.kind,
        info.person || "",
        info.prize || "",
        info.value,
      ]);
    });

    if (window.XLSX) {
      const book = XLSX.utils.book_new();
      const usedNames = new Set();
      groups.forEach((rows, title) => {
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(book, sheet, sheetNameSafe(title, usedNames));
      });
      await saveWorkbookWithPicker(book, `${filename}.xlsx`);
      return;
    }

    groups.forEach((rows, title) => {
      const csv = rows
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_${sheetNameSafe(title, new Set())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function openSettings() {
    draft = clone(config);
    els.inputTitle.value = draft.title;
    els.inputRemoveWinner.checked = draft.removeWinner !== false;
    switchTab("people");
    renderPeopleEditor();
    renderPrizeEditor();
    els.settingsPanel.classList.add("open");
    els.settingsPanel.setAttribute("aria-hidden", "false");
  }

  function closeSettings() {
    draft = null;
    els.settingsPanel.classList.remove("open");
    els.settingsPanel.setAttribute("aria-hidden", "true");
  }

  function switchTab(name) {
    document.querySelectorAll(".settings-tabs .tab").forEach((btn) => {
      const on = btn.dataset.tab === name;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === name);
    });
  }

  function updateProbSum(el, items) {
    const sum = totalProbability(items);
    const rounded = Math.round(sum * 100) / 100;
    el.textContent = `合计 ${rounded}%`;
    el.classList.toggle("ok", Math.abs(sum - 100) < 0.01);
    el.classList.toggle("warn", Math.abs(sum - 100) >= 0.01);
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderPeopleEditor() {
    els.peopleList.innerHTML = "";
    draft.people.forEach((person, index) => {
      const row = document.createElement("div");
      row.className = "prize-row people-row";
      row.innerHTML = `
        <span class="swatch" style="background:${person.color}"></span>
        <input type="text" value="${escapeAttr(person.name)}" data-field="name" maxlength="20" placeholder="姓名" />
        <div class="prob-unit">
          <input type="number" class="prob-input" value="${round2(person.probability)}" data-field="probability" min="0" max="100" step="0.01" />
        </div>
        <button type="button" class="remove-btn" data-remove aria-label="删除">×</button>
      `;
      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          if (input.dataset.field === "probability") {
            draft.people[index].probability = Math.max(0, Number(input.value) || 0);
            updateProbSum(els.peopleProbSum, draft.people);
          } else {
            draft.people[index].name = input.value.slice(0, 20);
          }
        });
      });
      row.querySelector("[data-remove]").addEventListener("click", () => {
        if (draft.people.length <= 2) {
          alert("至少保留两名人员");
          return;
        }
        draft.people.splice(index, 1);
        ensureProbSum100(draft.people, "even");
        renderPeopleEditor();
      });
      els.peopleList.appendChild(row);
    });
    updateProbSum(els.peopleProbSum, draft.people);
  }

  function renderPrizeEditor() {
    els.prizeList.innerHTML = "";
    draft.prizes.forEach((prize, index) => {
      const row = document.createElement("div");
      row.className = `prize-row${prize.stock === 0 ? " sold-out" : ""}`;
      row.innerHTML = `
        <span class="swatch" style="background:${prize.color}"></span>
        <input type="text" value="${escapeAttr(prize.name)}" data-field="name" maxlength="20" placeholder="奖品名称" />
        <div class="prob-unit">
          <input type="number" class="prob-input" value="${round2(prize.probability)}" data-field="probability" min="0" max="100" step="0.01" />
        </div>
        <input type="number" value="${prize.stock === null ? "" : prize.stock}" data-field="stock" min="0" step="1" placeholder="不限" title="库存，留空=不限" />
        <button type="button" class="remove-btn" data-remove aria-label="删除">×</button>
      `;
      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          const field = input.dataset.field;
          if (field === "probability") {
            draft.prizes[index].probability = Math.max(0, Number(input.value) || 0);
            updateProbSum(els.prizeProbSum, draft.prizes);
          } else if (field === "name") {
            draft.prizes[index].name = input.value.slice(0, 20);
          } else if (field === "stock") {
            draft.prizes[index].stock = parseStock(input.value);
            row.classList.toggle("sold-out", draft.prizes[index].stock === 0);
          }
        });
      });
      row.querySelector("[data-remove]").addEventListener("click", () => {
        if (draft.prizes.length <= 2) {
          alert("至少保留两个奖品");
          return;
        }
        draft.prizes.splice(index, 1);
        ensureProbSum100(draft.prizes, "even");
        renderPrizeEditor();
      });
      els.prizeList.appendChild(row);
    });
    updateProbSum(els.prizeProbSum, draft.prizes);
  }

  function normalizeHeader(h) {
    return String(h || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function findCol(headers, aliases) {
    for (let i = 0; i < headers.length; i++) {
      const h = normalizeHeader(headers[i]);
      if (aliases.some((a) => h === normalizeHeader(a) || h.includes(normalizeHeader(a)))) {
        return i;
      }
    }
    return -1;
  }

  function readSheetRows(file) {
    return new Promise((resolve, reject) => {
      if (!window.XLSX) {
        reject(new Error("xlsx missing"));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function downloadWorkbook(filename, rows) {
    if (!window.XLSX) {
      alert("表格解析库未加载，请刷新页面后重试");
      return;
    }
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(book, sheet, "模板");
    await saveWorkbookWithPicker(book, filename);
  }

  function downloadPeopleTemplate() {
    return downloadWorkbook("人员导入模板.xlsx", [
      ["姓名", "概率"],
      ["张三", 25],
      ["李四", 25],
      ["王五", 25],
      ["赵六", 25],
    ]);
  }

  function downloadPrizeTemplate() {
    return downloadWorkbook("奖项导入模板.xlsx", [
      ["奖品名称", "概率", "库存"],
      ["一等奖", 5, 1],
      ["二等奖", 15, 3],
      ["三等奖", 30, 5],
      ["谢谢参与", 50, ""],
    ]);
  }

  async function importPeople(file) {
    try {
      const rows = await readSheetRows(file);
      if (!rows.length) {
        alert("表格为空");
        return;
      }
      let start = 0;
      let nameCol = 0;
      let probCol = 1;
      const first = rows[0].map((c) => String(c));
      const maybeName = findCol(first, ["姓名", "名字", "人员", "name", "人员姓名"]);
      const maybeProb = findCol(first, ["概率", "权重", "probability", "weight"]);
      if (maybeName >= 0 || maybeProb >= 0) {
        start = 1;
        nameCol = maybeName >= 0 ? maybeName : 0;
        probCol = maybeProb >= 0 ? maybeProb : 1;
      }
      const imported = [];
      for (let r = start; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row.length) continue;
        const name = String(row[nameCol] ?? "").trim();
        if (!name) continue;
        imported.push({
          id: uid(),
          name: name.slice(0, 20),
          probability: Math.max(0, Number(row[probCol]) || 0),
          color: PALETTE[imported.length % PALETTE.length],
        });
      }
      if (imported.length < 2) {
        alert("至少需要导入 2 名人员");
        return;
      }
      ensureProbSum100(imported, totalProbability(imported) > 0 ? "ratio" : "even");
      draft.people = imported;
      renderPeopleEditor();
      alert(`已导入 ${imported.length} 名人员`);
    } catch (err) {
      console.error(err);
      const tip = !window.XLSX
        ? "表格解析库未加载，请刷新页面后重试"
        : err && err.message
          ? `人员导入失败：${err.message}`
          : "人员导入失败";
      alert(tip);
    }
  }

  async function importPrizes(file) {
    try {
      const rows = await readSheetRows(file);
      if (!rows.length) {
        alert("表格为空");
        return;
      }
      let start = 0;
      let nameCol = 0;
      let probCol = 1;
      let stockCol = -1;
      const first = rows[0].map((c) => String(c));
      const maybeName = findCol(first, ["奖品名称", "奖项名称", "名称", "奖项", "奖品", "name", "prize"]);
      const maybeProb = findCol(first, ["概率", "权重", "probability", "weight", "占比"]);
      const maybeStock = findCol(first, ["库存", "数量", "stock", "qty", "quantity", "份数"]);
      if (maybeName >= 0 || maybeProb >= 0 || maybeStock >= 0) {
        start = 1;
        nameCol = maybeName >= 0 ? maybeName : 0;
        probCol = maybeProb >= 0 ? maybeProb : 1;
        stockCol = maybeStock;
      }
      const imported = [];
      for (let r = start; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row.length) continue;
        const name = String(row[nameCol] ?? "").trim();
        if (!name) continue;
        imported.push({
          id: uid(),
          name: name.slice(0, 20),
          probability: Math.max(0, Number(row[probCol]) || 0),
          color: PALETTE[imported.length % PALETTE.length],
          stock: stockCol >= 0 ? parseStock(row[stockCol]) : null,
        });
      }
      if (imported.length < 2) {
        alert("至少需要导入 2 个奖品");
        return;
      }
      ensureProbSum100(imported, totalProbability(imported) > 0 ? "ratio" : "even");
      draft.prizes = imported;
      renderPrizeEditor();
      alert(`已导入 ${imported.length} 个奖品`);
    } catch (err) {
      console.error(err);
      const tip = !window.XLSX
        ? "表格解析库未加载，请刷新页面后重试"
        : err && err.message
          ? `奖品导入失败：${err.message}`
          : "奖品导入失败";
      alert(tip);
    }
  }

  function commitSettings() {
    const title = els.inputTitle.value.trim() || "幸运大转盘";
    const people = draft.people
      .map((p, i) => normalizePerson({ ...p, name: String(p.name || "").trim() || "未命名" }, i))
      .filter((p) => p.name);
    const prizes = draft.prizes
      .map((p, i) =>
        normalizePrize(
          {
            ...p,
            name: String(p.name || "").trim() || "未命名",
            stock: p.stock,
          },
          i
        )
      )
      .filter((p) => p.name);

    if (people.length < 2) {
      alert("至少需要两名人员");
      return;
    }
    if (prizes.length < 2) {
      alert("至少需要两个奖品");
      return;
    }

    if (Math.abs(totalProbability(people) - 100) >= 0.01) {
      ensureProbSum100(people, totalProbability(people) > 0 ? "ratio" : "even");
    } else {
      assignColors(people);
    }
    if (Math.abs(totalProbability(prizes) - 100) >= 0.01) {
      ensureProbSum100(prizes, totalProbability(prizes) > 0 ? "ratio" : "even");
    } else {
      assignColors(prizes);
    }

    config = {
      title: title.slice(0, 40),
      removeWinner: els.inputRemoveWinner.checked,
      people,
      prizes,
    };
    saveConfig(config);
    applyTitle();
    redrawAll();
    closeSettings();
  }

  function resetDefaults() {
    if (!confirm("确定恢复默认配置？未保存修改会丢失。")) return;
    draft = clone(DEFAULT_CONFIG);
    els.inputTitle.value = draft.title;
    els.inputRemoveWinner.checked = true;
    renderPeopleEditor();
    renderPrizeEditor();
  }

  // events
  els.btnSpinPeople.addEventListener("click", spinPeople);
  els.peopleCanvas.addEventListener("click", spinPeople);
  els.peopleCanvas.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      spinPeople();
    }
  });
  els.btnSpinPrize.addEventListener("click", spinPrize);
  els.btnSettings.addEventListener("click", openSettings);
  els.btnStock.addEventListener("click", openStock);
  els.btnHistory.addEventListener("click", openHistory);
  if (els.btnLiveMode) {
    els.btnLiveMode.addEventListener("click", () => {
      setLiveCast(!isLiveCast());
    });
  }
  if (els.btnBackLive) {
    els.btnBackLive.hidden = true;
    els.btnBackLive.addEventListener("click", () => {
      hideRotateTip();
      setForceLandscapeUi(false);
      setLiveCast(true);
    });
  }
  if (els.btnRotateTipYes) {
    els.btnRotateTipYes.addEventListener("click", () => {
      hideRotateTip();
      setForceLandscapeUi(true);
      if (els.btnBackLive) els.btnBackLive.hidden = true;
      scheduleFit();
      requestAnimationFrame(() => {
        scheduleFit();
        try {
          redrawAll();
        } catch (_) {}
      });
    });
  }
  if (els.btnRotateTipNo) {
    els.btnRotateTipNo.addEventListener("click", () => {
      hideRotateTip();
      setForceLandscapeUi(false);
      setLiveCast(true);
    });
  }
  if (els.rotateTipModal) {
    els.rotateTipModal.querySelectorAll("[data-close-rotate-tip]").forEach((el) => {
      el.addEventListener("click", () => {
        // 点遮罩视为「否」：回直播投屏
        hideRotateTip();
        setForceLandscapeUi(false);
        setLiveCast(true);
      });
    });
  }
  els.btnAddPerson.addEventListener("click", () => {
    const i = draft.people.length;
    draft.people.push({
      id: uid(),
      name: `人员${i + 1}`,
      probability: 0,
      color: PALETTE[i % PALETTE.length],
    });
    ensureProbSum100(draft.people, "even");
    renderPeopleEditor();
  });
  els.btnAddPrize.addEventListener("click", () => {
    const i = draft.prizes.length;
    draft.prizes.push({
      id: uid(),
      name: `奖品${i + 1}`,
      probability: 0,
      color: PALETTE[i % PALETTE.length],
      stock: 1,
    });
    ensureProbSum100(draft.prizes, "even");
    renderPrizeEditor();
  });
  els.btnEvenPeople.addEventListener("click", () => {
    ensureProbSum100(draft.people, "even");
    renderPeopleEditor();
  });
  els.btnEvenPrize.addEventListener("click", () => {
    ensureProbSum100(draft.prizes, "even");
    renderPrizeEditor();
  });
  els.btnDownloadPeopleTpl.addEventListener("click", downloadPeopleTemplate);
  els.btnDownloadPrizeTpl.addEventListener("click", downloadPrizeTemplate);
  els.btnSave.addEventListener("click", commitSettings);
  els.btnReset.addEventListener("click", resetDefaults);
  els.btnCloseResult.addEventListener("click", hideResult);
  els.btnCloseHistory.addEventListener("click", hideHistory);
  els.btnCloseStock.addEventListener("click", hideStock);
  els.btnClearHistory.addEventListener("click", () => {
    if (!confirm("确定清空全部中奖记录？")) return;
    history = [];
    saveHistory();
    openHistory();
  });
  els.btnExportHistory.addEventListener("click", exportHistory);
  els.peopleExcelInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importPeople(file);
    e.target.value = "";
  });
  els.prizeExcelInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importPrizes(file);
    e.target.value = "";
  });

  document.querySelectorAll(".settings-tabs .tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  els.settingsPanel.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeSettings);
  });
  els.resultModal.querySelectorAll("[data-close-result]").forEach((el) => {
    el.addEventListener("click", hideResult);
  });
  els.historyModal.querySelectorAll("[data-close-history]").forEach((el) => {
    el.addEventListener("click", hideHistory);
  });
  els.stockModal.querySelectorAll("[data-close-stock]").forEach((el) => {
    el.addEventListener("click", hideStock);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (els.rotateTipModal && els.rotateTipModal.classList.contains("open")) hideRotateTip();
    else if (els.resultModal.classList.contains("open")) hideResult();
    else if (els.stockModal.classList.contains("open")) hideStock();
    else if (els.historyModal.classList.contains("open")) hideHistory();
    else if (els.settingsPanel.classList.contains("open")) closeSettings();
  });

  // 关闭浏览器窗口/标签时，若有中奖记录则拦截并提醒
  window.addEventListener("beforeunload", (e) => {
    if (!history.length) return;
    e.preventDefault();
    e.returnValue = "请记得导出中奖记录";
    return "请记得导出中奖记录";
  });

  function renderDecor(dataUrl) {
    if (!els.decorPreview || !els.decorFrame) return;
    if (dataUrl) {
      els.decorPreview.src = dataUrl;
      els.decorPreview.hidden = false;
      els.decorFrame.classList.add("has-image");
      els.decorFrame.title = "点击更换图片";
    } else {
      els.decorPreview.removeAttribute("src");
      els.decorPreview.hidden = true;
      els.decorFrame.classList.remove("has-image");
      els.decorFrame.title = "点击上传图片";
    }
  }

  function loadDecor() {
    try {
      return localStorage.getItem(DECOR_KEY) || DEFAULT_DECOR_SRC;
    } catch {
      return DEFAULT_DECOR_SRC;
    }
  }

  function saveDecor(dataUrl) {
    try {
      if (dataUrl) localStorage.setItem(DECOR_KEY, dataUrl);
      else localStorage.removeItem(DECOR_KEY);
    } catch (err) {
      console.warn(err);
      alert("图片过大，浏览器无法保存，请换一张更小的图试试");
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const maxW = 720;
          const maxH = 1280;
          let { width, height } = img;
          const scale = Math.min(1, maxW / width, maxH / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  els.decorFrame.addEventListener("click", () => {
    els.decorInput.click();
  });

  els.decorInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      saveDecor(dataUrl);
      renderDecor(dataUrl);
    } catch (err) {
      console.error(err);
      alert("图片上传失败，请重试");
    }
  });

  if (els.chkDesignate && els.inputDesignate) {
    els.chkDesignate.addEventListener("change", () => {
      const on = els.chkDesignate.checked;
      els.inputDesignate.disabled = !on;
      if (on) els.inputDesignate.focus();
      else els.inputDesignate.value = "";
    });
  }

  function isLiveCast() {
    return document.documentElement.classList.contains("live-cast");
  }

  function isPortraitViewport() {
    try {
      if (window.matchMedia) {
        return window.matchMedia("(orientation: portrait)").matches;
      }
    } catch (_) {}
    return window.innerHeight >= window.innerWidth;
  }

  function showRotateTip() {
    if (!els.rotateTipModal) return;
    els.rotateTipModal.classList.add("open");
    els.rotateTipModal.setAttribute("aria-hidden", "false");
  }

  function hideRotateTip() {
    if (!els.rotateTipModal) return;
    els.rotateTipModal.classList.remove("open");
    els.rotateTipModal.setAttribute("aria-hidden", "true");
  }

  function setForceLandscapeUi(on) {
    document.documentElement.classList.toggle("force-landscape-ui", !!on);
  }

  /** 退出投屏后竖屏询问是否旋转；普通模式不再显示底部「返回直播投屏」 */
  function syncPortraitNormalUi(exitedLive) {
    if (els.btnBackLive) els.btnBackLive.hidden = true;
    const portrait = isPortraitViewport();
    if (!portrait || isLiveCast()) {
      setForceLandscapeUi(false);
      hideRotateTip();
      return;
    }
    if (exitedLive) {
      setForceLandscapeUi(false);
      showRotateTip();
    }
  }

  function setLiveCast(on, persist) {
    const wasLive = isLiveCast();
    document.documentElement.classList.toggle("live-cast", !!on);
    if (on) setForceLandscapeUi(false);
    if (els.btnLiveMode) {
      els.btnLiveMode.setAttribute("aria-pressed", on ? "true" : "false");
      els.btnLiveMode.textContent = on ? "退出投屏" : "直播投屏";
    }
    if (persist !== false) {
      try {
        localStorage.setItem(LIVE_CAST_KEY, on ? "1" : "0");
      } catch (_) {}
    }
    syncPortraitNormalUi(wasLive && !on);
    scheduleFit();
    requestAnimationFrame(() => {
      scheduleFit();
      try {
        redrawAll();
      } catch (_) {}
    });
  }

  function initLiveCast() {
    let on = false;
    try {
      const params = new URLSearchParams(location.search);
      if (params.get("live") === "1" || params.get("live") === "true") on = true;
      else if (params.get("live") === "0" || params.get("live") === "false") on = false;
      else on = localStorage.getItem(LIVE_CAST_KEY) === "1";
    } catch (_) {
      on = false;
    }
    setLiveCast(on, false);
  }

  function fitStageBoard() {
    const board = document.getElementById("stageBoard");
    const scaler = board && board.parentElement;
    if (!board || !scaler) return;
    if (isLiveCast()) {
      board.style.width = "";
      board.style.height = "";
      board.style.transform = "";
      board.style.left = "";
      board.style.top = "";
      return;
    }
    const bw = 1660;
    const bh = 900;
    board.style.width = `${bw}px`;
    board.style.height = `${bh}px`;
    const sw = Math.max(scaler.clientWidth, 1);
    const sh = Math.max(scaler.clientHeight, 1);
    const scale = Math.min(sw / bw, sh / bh);
    const scaledH = bh * scale;
    // 左边距 = 上下边距，多余空间留给右侧
    const edge = Math.max((sh - scaledH) / 2, 0);
    board.style.transform = `scale(${scale})`;
    board.style.left = `${edge}px`;
    board.style.top = `${edge}px`;
  }

  let fitRaf = 0;
  const scheduleFit = () => {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(fitStageBoard);
  };
  window.addEventListener("resize", () => {
    syncPortraitNormalUi(false);
    scheduleFit();
  });
  window.addEventListener("orientationchange", () => {
    syncPortraitNormalUi(false);
    setTimeout(() => {
      syncPortraitNormalUi(false);
      scheduleFit();
    }, 250);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }

  applyTitle();
  redrawAll();
  renderDecor(loadDecor());
  initLiveCast();
  syncPortraitNormalUi(false);
  scheduleFit();
})();
