(() => {
  const STORAGE_KEY = "lucky-wheel-config-v3";
  const HISTORY_KEY = "lucky-wheel-history-v3";
  const DECOR_KEY = "lucky-wheel-decor-v1";

  const PALETTE = [
    "#7BC8A4",
    "#7EB6E0",
    "#F0A8C0",
    "#8DD4C8",
    "#9BB8F0",
    "#F5C4A8",
    "#A8D98A",
    "#B8A8E8",
    "#F2B8B0",
    "#6EC9C0",
    "#8CC8E8",
    "#E8B8D0",
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
    btnSettings: document.getElementById("btnSettings"),
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
  };

  const peopleCtx = els.peopleCanvas.getContext("2d");
  const prizeCtx = els.prizeCanvas.getContext("2d");

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
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const mid = (start + end) / 2;
        ctx.save();
        ctx.rotate(mid);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(13, Math.min(20, radius / 11))}px "Noto Sans SC", sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 4;
        ctx.fillText(labelFn(item), radius - 20, 5);
        ctx.restore();
        start = end;
      });
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#f0c14b";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fillStyle = "#fffaf0";
    ctx.fill();
    ctx.restore();
  }

  function redrawAll() {
    drawWheel(
      peopleCtx,
      els.peopleCanvas,
      config.people,
      peopleRotation,
      "暂无人员",
      (p) => truncateLabel(p.name, 8)
    );
    drawWheel(
      prizeCtx,
      els.prizeCanvas,
      availablePrizes(),
      prizeRotation,
      "奖品已抽完",
      (p) =>
        p.stock === null
          ? truncateLabel(p.name, 8)
          : truncateLabel(`${p.name}×${p.stock}`, 9)
    );
    renderStockPanel();
    updateButtons();
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
        drawWheel(
          peopleCtx,
          els.peopleCanvas,
          config.people,
          peopleRotation,
          "暂无人员",
          (p) => truncateLabel(p.name, 8)
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

    animateSpin({
      getRotation: () => prizeRotation,
      setRotation: (v) => {
        prizeRotation = v;
      },
      draw: () =>
        drawWheel(
          prizeCtx,
          els.prizeCanvas,
          availablePrizes(),
          prizeRotation,
          "奖品已抽完",
          (p) =>
            p.stock === null
              ? truncateLabel(p.name, 8)
              : truncateLabel(`${p.name}×${p.stock}`, 9)
        ),
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
        const left =
          prize && prize.stock !== null ? `（剩余 ${prize.stock}）` : "";
        els.lastPrize.textContent = designated
          ? `${designated} → ${winner.name}${left}`
          : `奖品：${winner.name}${left}`;
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

  function exportHistory() {
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
      XLSX.writeFile(book, `${filename}.xlsx`);
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
      alert("人员导入失败");
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
      alert("奖品导入失败");
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
  els.btnSpinPrize.addEventListener("click", spinPrize);
  els.btnSettings.addEventListener("click", openSettings);
  els.btnHistory.addEventListener("click", openHistory);
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
  els.btnSave.addEventListener("click", commitSettings);
  els.btnReset.addEventListener("click", resetDefaults);
  els.btnCloseResult.addEventListener("click", hideResult);
  els.btnCloseHistory.addEventListener("click", hideHistory);
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

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (els.resultModal.classList.contains("open")) hideResult();
    else if (els.historyModal.classList.contains("open")) hideHistory();
    else if (els.settingsPanel.classList.contains("open")) closeSettings();
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
      return localStorage.getItem(DECOR_KEY) || "";
    } catch {
      return "";
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

  function fitStageBoard() {
    const board = document.getElementById("stageBoard");
    const scaler = board && board.parentElement;
    if (!board || !scaler) return;
    const bw = 1500;
    const bh = 860;
    board.style.width = `${bw}px`;
    board.style.height = `${bh}px`;
    board.style.transform = "none";
    board.style.margin = "0";
    const pad = 4;
    const sw = Math.max(scaler.clientWidth - pad, 1);
    const sh = Math.max(scaler.clientHeight - pad, 1);
    // 可放大也可缩小，尽量铺满可用区域
    const scale = Math.min(sw / bw, sh / bh);
    board.style.transform = `scale(${scale})`;
    board.style.margin = `${((bh * scale) - bh) / 2}px ${((bw * scale) - bw) / 2}px`;
  }

  let fitRaf = 0;
  const scheduleFit = () => {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(fitStageBoard);
  };
  window.addEventListener("resize", scheduleFit);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }

  applyTitle();
  redrawAll();
  renderDecor(loadDecor());
  scheduleFit();
})();
