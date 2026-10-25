/* ══════════════════════════════════════════════
   穿越朝代大冒险 · 游戏逻辑
   (想看懂代码的少年,从这里开始读起 👀)
   ══════════════════════════════════════════════ */

/* ── 朝代资料:主题色 / 宝物 / 一句话介绍 ── */
const DYNASTIES = [
  { name: "夏商周", years: "约前2070–前221", colors: ["#4e342e", "#8d6e63"], treasure: "青铜方鼎", emoji: "🏺", intro: "中国最早的三个王朝,青铜时代的礼乐世界" },
  { name: "秦",     years: "前221–前207",     colors: ["#26221e", "#5f574a"], treasure: "兵马俑",   emoji: "🗿", intro: "第一个大一统王朝,书同文、车同轨" },
  { name: "汉",     years: "前202–220",       colors: ["#7b1009", "#c05a3a"], treasure: "丝路驼铃", emoji: "🐫", intro: "丝绸之路连通东西,汉字汉语由此得名" },
  { name: "三国",   years: "220–280",         colors: ["#1d3a24", "#4c8c4a"], treasure: "青龙偃月刀", emoji: "⚔️", intro: "魏蜀吴三分天下,英雄辈出的时代" },
  { name: "唐",     years: "618–907",         colors: ["#b3541a", "#f0a12e"], treasure: "唐诗万卷", emoji: "📜", intro: "万国来朝的盛世,诗歌的黄金时代" },
  { name: "宋",     years: "960–1279",        colors: ["#004d40", "#26a69a"], treasure: "上河图卷", emoji: "🖼️", intro: "活字印刷与《清明上河图》的繁华年代" },
  { name: "元",     years: "1271–1368",       colors: ["#0d2c6b", "#3f7fd0"], treasure: "蒙古骏马", emoji: "🐎", intro: "疆域空前辽阔,横跨欧亚大陆" },
  { name: "明清",   years: "1368–1912",       colors: ["#283593", "#7e57c2"], treasure: "郑和宝船", emoji: "⛵", intro: "紫禁城、郑和下西洋与四大名著" }
];

const QUESTION_TIME = 20;   // 每题限时(秒)
const LEVEL_QUESTIONS = 3;  // 每关题数
const MAX_HEARTS = 3;       // 每关心数

/* ════════ 小工具 ════════ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; }
}

/* ════════ 题库包(外挂题库,规范见 PACK-SPEC.md) ════════
   核心题库(questions.js)+ 所有已挂载的包合并成总题池;
   想加新知识:生成包文件放进 packs/,index.html 加一行 script 即可 */
const PACKS = window.QUESTION_PACKS || [];
const ALL_QUESTIONS = QUESTIONS.concat(...PACKS.map(p => p.questions));

/* ════════ 音效引擎(Web Audio,零音频文件) ════════ */
const Sound = {
  ctx: null,
  enabled: load("dq_sound", true),
  bgmTimer: null,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },

  // 播放一个音符:freq=频率, dur=时长秒, type=波形, vol=音量, delay=延迟秒
  tone(freq, dur = 0.15, type = "sine", vol = 0.18, delay = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  click()   { this.tone(620, 0.07, "triangle", 0.12); },
  correct() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, "sine", 0.16, i * 0.09)); },
  wrong()   { this.tone(180, 0.3, "square", 0.1); this.tone(140, 0.35, "square", 0.08, 0.12); },
  fanfare() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.22, "triangle", 0.16, i * 0.13));
  },
  fail()    { [330, 262, 196].forEach((f, i) => this.tone(f, 0.3, "sawtooth", 0.07, i * 0.18)); },

  // 轻柔的五声音阶背景音乐(宫商角徵羽)
  startBGM() {
    if (!this.enabled || this.bgmTimer) return;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00];
    this.bgmTimer = setInterval(() => {
      const f = notes[Math.floor(Math.random() * notes.length)];
      this.tone(f, 1.4, "sine", 0.028);
      if (Math.random() < 0.35) this.tone(f / 2, 1.8, "sine", 0.02, 0.3);
    }, 950);
  },
  stopBGM() {
    clearInterval(this.bgmTimer);
    this.bgmTimer = null;
  },
  toggle() {
    this.enabled = !this.enabled;
    save("dq_sound", this.enabled);
    if (this.enabled) { this.startBGM(); this.click(); }
    else this.stopBGM();
    $("#sound-toggle").textContent = this.enabled ? "🔊" : "🔇";
  }
};

/* ════════ 存档 ════════ */
const progress = load("dq_progress", { unlocked: 0, stars: {} }); // stars: {朝代名: 星数}
const versusRec = load("dq_versus", { p1: 0, p2: 0 });
const savedNames = load("dq_names", { p1: "诺一", p2: "艺家" });

/* ════════ v1.4:家庭玩家花名册 / 成绩记录 ════════ */
const AVATARS = ["🥷", "🎶", "👑", "🐉", "🦊", "🐼", "🦉", "🐯", "🧚", "🤴", "👸", "🐶", "🐰", "🐧"];

let roster = load("dq_roster", null);
if (!roster || !roster.length) {
  roster = [
    { id: 1, name: savedNames.p1 || "诺一", avatar: "🥷" },
    { id: 2, name: savedNames.p2 || "艺家", avatar: "🎶" },
  ];
  save("dq_roster", roster);
  if (versusRec.p1 !== undefined) {   // 旧 p1/p2 键战绩迁移到名字键
    const vr = {};
    vr[roster[0].name] = versusRec.p1 || 0;
    vr[roster[1].name] = versusRec.p2 || 0;
    save("dq_versus", vr);
    Object.keys(versusRec).forEach(k => delete versusRec[k]);
    Object.assign(versusRec, vr);
  }
}
let currentPid = load("dq_current", roster[0].id);
if (!roster.some(p => p.id === currentPid)) currentPid = roster[0].id;

const records = load("dq_records", []);  
const removedPlayers = new Set(load("dq_removed", []));   // 已删除玩家墓碑(防同步复活)   // [{p, ava, ym(YYYY-MM), kind, label, stars}]

function me() { return roster.find(p => p.id === currentPid) || roster[0]; }
function nowYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addRecord(kind, label, stars) {
  records.unshift({ p: me().name, ava: me().avatar, ym: nowYM(), kind, label, stars: stars || null });
  if (records.length > 200) records.length = 200;
  save("dq_records", records);
}

/* ════════ 运行状态 ════════ */
let mode = "single";          // single | versus
let quiz = null;              // 当前对局状态

/* ════════ 屏幕切换 ════════ */
function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id).classList.add("active");
  if (id === "screen-title") CloudSync.pull();   // 回主页时拉取家人最新数据
}

function openOverlay(html) {
  $("#overlay-card").innerHTML = html;
  $("#overlay").classList.remove("hidden");
}
function closeOverlay() {
  $("#overlay").classList.add("hidden");
}

/* ════════ 撒花 ════════ */
function confetti(n = 30) {
  const layer = $("#confetti-layer");
  const pieces = ["✨", "🎉", "⭐", "💎", "🧧", "🎊", "🏮"];
  for (let i = 0; i < n; i++) {
    const sp = document.createElement("span");
    sp.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    sp.style.left = Math.random() * 100 + "vw";
    sp.style.fontSize = (16 + Math.random() * 22) + "px";
    sp.style.animationDuration = (1.4 + Math.random() * 1.6) + "s";
    sp.style.animationDelay = (Math.random() * 0.5) + "s";
    layer.appendChild(sp);
    setTimeout(() => sp.remove(), 3600);
  }
}

/* ════════ 标题屏 ════════ */
$("#btn-single").addEventListener("click", () => {
  Sound.click(); Sound.startBGM();
  mode = "single";
  startMap();   // v1.4:以当前玩家直接进地图
});

$("#btn-versus").addEventListener("click", () => {
  Sound.click(); Sound.startBGM();
  mode = "versus";
  renderVsPickers();
  showScreen("screen-chars");
});

$("#btn-honor").addEventListener("click", () => {
  Sound.click();
  CloudSync.pull();            // 打开荣誉榜先拉家人最新数据(拉完自动刷新本屏)
  CloudSync.schedulePush();    // 并把本机独有的数据(如新建玩家)回传,双向收敛
  renderHonor();
  showScreen("screen-honor");
});

$("#player-chip").addEventListener("click", () => {
  Sound.click();
  CloudSync.pull();            // 打开花名册先拉取
  CloudSync.schedulePush();    // 并回传本机独有数据
  renderRoster();
  showScreen("screen-player");
});

$("#btn-help").addEventListener("click", () => { Sound.click(); $("#help-panel").classList.remove("hidden"); });
$("#btn-help-close").addEventListener("click", () => { Sound.click(); $("#help-panel").classList.add("hidden"); });

$("#sound-toggle").addEventListener("click", () => Sound.toggle());

/* ════════ 对战选人屏(v1.4:花名册选人) ════════ */
let vsSel = { p1: null, p2: null };

function renderVsPickers() {
  if (vsSel.p1 === null || !roster.some(p => p.id === vsSel.p1)) vsSel.p1 = currentPid;
  const other = roster.find(p => p.id !== vsSel.p1);
  if (vsSel.p2 === null || !roster.some(p => p.id === vsSel.p2) || vsSel.p2 === vsSel.p1) {
    vsSel.p2 = other ? other.id : vsSel.p1;
  }
  ["p1", "p2"].forEach(side => {
    const box = $("#roster-vs-" + side);
    box.innerHTML = "";
    roster.forEach(p => {
      const chip = document.createElement("button");
      chip.className = "rm-chip" + (vsSel[side] === p.id ? ` sel-${side}` : "");
      chip.textContent = `${p.avatar} ${p.name}`;
      chip.addEventListener("click", () => {
        Sound.click();
        vsSel[side] = p.id;
        if (vsSel.p1 === vsSel.p2) {
          const alt = roster.find(x => x.id !== p.id);
          if (alt) vsSel[side === "p1" ? "p2" : "p1"] = alt.id;
        }
        renderVsPickers();
      });
      box.appendChild(chip);
    });
    const sel = roster.find(p => p.id === vsSel[side]);
    $("#vs-label-" + side).textContent = `${sel.avatar} ${side === "p1" ? "甲方" : "乙方"}`;
  });
}

$("#btn-start-versus").addEventListener("click", () => {
  Sound.click();
  startVersus();
});

/* 通用返回按钮 */
$$(".btn-back").forEach(btn =>
  btn.addEventListener("click", () => {
    Sound.click();
    if (quiz) stopTimer();
    showScreen(btn.dataset.back);
  })
);

/* ════════ 地图屏 ════════ */
function startMap() {
  const p = me();
  $("#map-avatar").textContent = p.avatar;
  $("#map-name").textContent = p.name;
  renderMap();
  showScreen("screen-map");
}

function renderMap() {
  const track = $("#map-track");
  track.innerHTML = "";

  DYNASTIES.forEach((d, i) => {
    const done = progress.stars[d.name] > 0;
    const current = !done && i === progress.unlocked;
    const locked = i > progress.unlocked;

    const node = document.createElement("div");
    node.className = "map-node" + (done ? " done" : "") + (current ? " current" : "") + (locked ? " locked" : "");
    node.innerHTML = `
      <div class="dot">${locked ? "🔒" : d.emoji}</div>
      <div class="nm">${d.name}</div>
      <div class="stars">${done ? "⭐".repeat(progress.stars[d.name]) : (current ? "下一站 →" : "")}</div>`;
    if (!locked) {
      node.querySelector(".dot").addEventListener("click", () => { Sound.click(); startLevel(i); });
    }
    track.appendChild(node);

    if (i < DYNASTIES.length - 1) {
      const link = document.createElement("div");
      link.className = "map-link" + (progress.stars[DYNASTIES[i].name] > 0 ? " done" : "");
      track.appendChild(link);
    }
  });

  // 宝物收集条
  const strip = $("#treasure-strip");
  strip.innerHTML = DYNASTIES.map(d =>
    `<div class="slot ${progress.stars[d.name] > 0 ? "got" : ""}" title="${d.treasure}">${progress.stars[d.name] > 0 ? d.emoji : "·"}</div>`
  ).join("");

  // 题库包角标:让孩子看得见「游戏在变厚」
  const icons = PACKS.map(p => p.icon).join(" ");
  $("#pack-badge").innerHTML = PACKS.length
    ? `📦 弹药 <b>${ALL_QUESTIONS.length}</b> 题 ${icons}`
    : `📦 题库 <b>${ALL_QUESTIONS.length}</b> 题`;

  // 滚动到当前节点 + 滑动提示箭头
  const scroller = $(".map-scroll");
  const hint = $("#scroll-hint");
  const updateHint = () => {
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 60;
    hint.classList.toggle("hidden", atEnd);
  };
  scroller.onscroll = updateHint;
  setTimeout(() => {
    const cur = track.querySelector(".current") || track.lastElementChild;
    cur && cur.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setTimeout(updateHint, 600);
  }, 80);
}

/* ════════ 答题引擎 ════════ */
let timer = null;

function pickQuestions(dynastyName, count) {
  const pool = shuffle(ALL_QUESTIONS.filter(q => q.dynasty === dynastyName));
  return pool.slice(0, count);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

/* ── 单人闯关:某一关开始 ── */
function startLevel(dynIdx) {
  const d = DYNASTIES[dynIdx];
  quiz = {
    kind: "single",
    dynIdx,
    qs: pickQuestions(d.name, LEVEL_QUESTIONS),
    qIdx: 0,
    hearts: MAX_HEARTS,
    timeLeft: QUESTION_TIME,
    locked: false
  };
  showScreen("screen-quiz");
  applyDynastyTheme(d);
  openOverlay(`
    <div class="ov-emoji">${d.emoji}</div>
    <div class="ov-title">第 ${dynIdx + 1} 站 · ${d.name}</div>
    <div class="ov-sub">${d.years}</div>
    <p style="margin-top:10px;font-size:15px;color:#6b5a40">${d.intro}</p>
    <p style="margin-top:14px;font-size:15px">答对 3 题可获得宝物「<b>${d.treasure}</b>」</p>
    <div class="ov-actions"><button class="btn btn-gold" id="ov-go">时空之门,开!</button></div>
  `);
  $("#ov-go").addEventListener("click", () => { Sound.click(); closeOverlay(); renderQuestion(); });
}

function applyDynastyTheme(d) {
  const screen = $("#screen-quiz");
  screen.style.background = `linear-gradient(170deg, ${d.colors[0]}, ${d.colors[1]})`;
  $("#dyn-badge").textContent = `${d.name} · ${d.years}`;
}

function renderQuestion() {
  const q = quiz.qs[quiz.qIdx];
  const d = DYNASTIES[quiz.dynIdx];
  $("#q-count").textContent = `${quiz.qIdx + 1} / ${quiz.qs.length}`;
  $("#hearts").textContent = quiz.kind === "single" ? "❤️".repeat(quiz.hearts) + "🖤".repeat(MAX_HEARTS - quiz.hearts) : "";

  // 对战信息条
  if (quiz.kind === "versus") {
    $("#versus-bar").classList.remove("hidden");
    $("#hearts").textContent = "";
    renderVersusBar();
  } else {
    $("#versus-bar").classList.add("hidden");
  }

  $("#q-level").textContent = q.level === 1 ? "🌱 小学" : "🌟 进阶";
  $("#q-text").textContent = q.q;

  // 选项打乱顺序
  const opts = shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer })));
  const letters = ["A", "B", "C", "D"];
  const box = $("#options");
  box.innerHTML = "";
  opts.forEach((o, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.dataset.correct = o.correct;
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span><span>${o.text}</span>`;
    btn.addEventListener("click", () => answer(btn, o.correct));
    box.appendChild(btn);
  });

  // 重新触发题目卡入场动画
  const card = $(".q-card");
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "";

  startTimer();
}

function renderVersusBar() {
  const p = quiz.turn; // "p1" | "p2"
  $("#vs-p1").classList.toggle("active", p === "p1");
  $("#vs-p2").classList.toggle("active", p === "p2");
  $("#vs-p1 .vs-nm").textContent = quiz.p1.name;
  $("#vs-p2 .vs-nm").textContent = quiz.p2.name;
  $("#vs-p1 .vs-ava").textContent = quiz.p1.avatar;
  $("#vs-p2 .vs-ava").textContent = quiz.p2.avatar;
  $("#vs-p1 .vs-score").textContent = quiz.p1.score;
  $("#vs-p2 .vs-score").textContent = quiz.p2.score;
  $("#vs-turn").textContent = `轮到 ${quiz[p].name} 了`;
}

function startTimer() {
  stopTimer();
  quiz.timeLeft = QUESTION_TIME;
  quiz.locked = false;
  const bar = $("#timer-bar");
  bar.classList.remove("danger");
  bar.style.width = "100%";
  const t0 = Date.now();
  timer = setInterval(() => {
    const elapsed = (Date.now() - t0) / 1000;
    quiz.timeLeft = Math.max(0, QUESTION_TIME - elapsed);
    bar.style.width = (quiz.timeLeft / QUESTION_TIME * 100) + "%";
    if (quiz.timeLeft <= 5) bar.classList.add("danger");
    if (quiz.timeLeft <= 0) answer(null, false, true); // 超时
  }, 100);
}

/* ── 玩家作答 ── */
function answer(btn, correct, timeout = false) {
  if (quiz.locked) return;
  quiz.locked = true;
  stopTimer();

  const q = quiz.qs[quiz.qIdx];
  const d = DYNASTIES[quiz.dynIdx];

  // 高亮正确/错误选项
  $$("#options .option").forEach(el => {
    if (el.dataset.correct === "true") el.classList.add("correct");
    else if (el === btn) el.classList.add("wrong");
    else el.classList.add("dim");
  });

  let pts = 0;
  if (correct) {
    Sound.correct();
    confetti(14);
    if (quiz.kind === "versus") {
      pts = 10 + Math.ceil((Number.isFinite(quiz.timeLeft) ? quiz.timeLeft : 0) / 4); // 答对 10 分 + 速度加分(最多 5);防御 timeLeft 未初始化
      quiz[quiz.turn].score += pts;
      renderVersusBar();
    }
  } else {
    Sound.wrong();
    if (quiz.kind === "single") quiz.hearts--;
    $("#hearts").textContent = "❤️".repeat(quiz.hearts) + "🖤".repeat(MAX_HEARTS - quiz.hearts);
  }

  const titleGood = quiz.kind === "versus" ? `${quiz[quiz.turn].name} 答对了!` : "答对了!";
  const titleBad = quiz.kind === "versus" ? (timeout ? `${quiz[quiz.turn].name} 超时啦!` : `${quiz[quiz.turn].name} 答错了~`) : (timeout ? "超时啦!" : "答错了~");

  setTimeout(() => {
    openOverlay(`
      <div class="ov-emoji">${correct ? "🎉" : (timeout ? "⏰" : "💫")}</div>
      <div class="ov-title ${correct ? "good" : "bad"}">${correct ? titleGood : titleBad}</div>
      ${correct && quiz.kind === "versus" ? `<div class="ov-pts">+${pts} 分!</div>` : ""}
      ${!correct ? `<div class="ov-sub">正确答案:${q.options[q.answer]}</div>` : ""}
      <div class="ov-fact"><b>你知道吗?</b><br>${q.fact}</div>
      <div class="ov-actions">
        <button class="btn ${correct ? "btn-gold" : "btn-red"}" id="ov-next">${nextLabel()}</button>
      </div>
    `);
    $("#ov-next").addEventListener("click", nextStep);
  }, correct ? 750 : 950);
}

function nextLabel() {
  if (quiz.kind === "versus") {
    return quiz.qIdx >= quiz.qs.length - 1 ? "看结果" : "下一位 →";
  }
  if (quiz.hearts <= 0) return "再试一次";
  return quiz.qIdx >= quiz.qs.length - 1 ? "领取宝物!" : "下一题 →";
}

/* ── 单题结束后的走向 ── */
function nextStep() {
  Sound.click();

  if (quiz.kind === "versus") {
    if (quiz.qIdx >= quiz.qs.length - 1) return endVersus();
    quiz.qIdx++;
    quiz.turn = quiz.turn === "p1" ? "p2" : "p1";
    closeOverlay();
    renderQuestion();
    return;
  }

  // 单人模式
  if (quiz.hearts <= 0) {
    // 失败:重玩本关
    closeOverlay();
    failLevel();
    return;
  }
  if (quiz.qIdx >= quiz.qs.length - 1) {
    closeOverlay();
    completeLevel();
    return;
  }
  quiz.qIdx++;
  closeOverlay();
  renderQuestion();
}

/* ── 单人通关 ── */
function completeLevel() {
  const d = DYNASTIES[quiz.dynIdx];
  const stars = Math.max(1, quiz.hearts);
  progress.stars[d.name] = Math.max(progress.stars[d.name] || 0, stars);
  if (quiz.dynIdx === progress.unlocked) progress.unlocked = Math.min(DYNASTIES.length - 1, quiz.dynIdx + 1);
  save("dq_progress", progress);
  addRecord("level", `${d.name} 通关`, stars);
  CloudSync.schedulePush();   // 云同步:通关进度上传

  Sound.fanfare();
  confetti(46);

  const isLast = progress.unlocked === DYNASTIES.length - 1 && quiz.dynIdx === DYNASTIES.length - 1;
  openOverlay(`
    <div class="ov-title good">🎉 ${d.name} · 通关!</div>
    <div class="ov-treasure">${d.emoji}</div>
    <div class="ov-sub">获得传世宝物「${d.treasure}」</div>
    <div style="font-size:22px;margin:8px 0 2px">${"⭐".repeat(stars)}${"✩".repeat(3 - stars)}</div>
    <div class="ov-fact"><b>朝代小知识</b><br>${d.intro}</div>
    <div class="ov-actions">
      <button class="btn btn-gold" id="ov-nextmap">${quiz.dynIdx < DYNASTIES.length - 1 ? "继续冒险 →" : "回地图"}</button>
    </div>
  `);
  $("#ov-nextmap").addEventListener("click", () => {
    Sound.click();
    closeOverlay();
    if (isLast && DYNASTIES.every(x => progress.stars[x.name] > 0)) return showFinal();
    renderMap();
    showScreen("screen-map");
  });
}

/* ── 单人失败 ── */
function failLevel() {
  Sound.fail();
  const d = DYNASTIES[quiz.dynIdx];
  openOverlay(`
    <div class="ov-emoji">🌪️</div>
    <div class="ov-title bad">时空乱流!</div>
    <p style="margin:8px 0 4px;font-size:15px">心用完了,被困在「${d.name}」…</p>
    <p style="font-size:15px;color:#6b5a40">别灰心,再看一遍题目,你一定行!</p>
    <div class="ov-actions">
      <button class="btn btn-red" id="ov-retry">🔁 重闯此关</button>
      <button class="btn btn-plain" style="color:#fff" id="ov-map1">回地图</button>
    </div>
  `);
  $("#ov-retry").addEventListener("click", () => { Sound.click(); closeOverlay(); startLevel(quiz.dynIdx); });
  $("#ov-map1").addEventListener("click", () => { Sound.click(); closeOverlay(); renderMap(); showScreen("screen-map"); });
}

/* ── 全通关结局 ── */
function showFinal() {
  $("#final-treasures").innerHTML = DYNASTIES.map(d => `<span>${d.emoji}</span>`).join("");
  addRecord("final", "八朝代全通关 · 时空探险大师", 3);
  showScreen("screen-final");
  Sound.fanfare();
  setTimeout(() => confetti(60), 300);
}

/* ════════ 双人对战 ════════ */
function startVersus() {
  const P1 = roster.find(p => p.id === vsSel.p1) || roster[0];
  const P2 = roster.find(p => p.id === vsSel.p2) || roster[1] || roster[0];
  const easy = shuffle(ALL_QUESTIONS.filter(q => q.level === 1)).slice(0, 3);
  const hard = shuffle(ALL_QUESTIONS.filter(q => q.level === 2)).slice(0, 3);
  const qs = shuffle([...easy, ...hard]);

  quiz = {
    kind: "versus",
    qs,
    qIdx: 0,
    turn: "p1",
    dynIdx: 0,
    p1: { name: P1.name, avatar: P1.avatar, score: 0 },
    p2: { name: P2.name, avatar: P2.avatar, score: 0 },
    locked: false
  };

  showScreen("screen-quiz");
  applyDynastyTheme({ colors: ["#4a2a6e", "#8c4a8c"], name: "时空竞技场", years: "双人 · 各 3 题" });
  openOverlay(`
    <div class="ov-emoji">⚔️</div>
    <div class="ov-title">双人对战开始!</div>
    <p style="margin:10px 0;font-size:16px">🥷 <b>${quiz.p1.name}</b> VS <b>${quiz.p2.name}</b> 🎶</p>
    <p style="font-size:14.5px;color:#6b5a40;line-height:1.8">共 6 题,轮流作答<br>答对 +10 分,手快还有最多 +5 分<br>答错不扣分,但要给对方送分机会哦!</p>
    <div class="ov-actions"><button class="btn btn-red" id="ov-vs">开战!</button></div>
  `);
  $("#ov-vs").addEventListener("click", () => { Sound.click(); closeOverlay(); renderQuestion(); });
}

function endVersus() {
  const { p1, p2 } = quiz;
  const winner = p1.score === p2.score ? null : (p1.score > p2.score ? p1 : p2);

  if (winner) versusRec[winner.name] = (versusRec[winner.name] || 0) + 1;
  save("dq_versus", versusRec);

  // 成绩记录记在胜者名下(临时切换当前玩家身份)
  if (winner) {
    const winnerPid = roster.find(p => p.name === winner.name)?.id;
    if (winnerPid !== undefined && winnerPid !== null) {
      const prev = currentPid;
      currentPid = winnerPid;
      addRecord("versus", `对战 ${p1.name} ${p1.score} : ${p2.score} ${p2.name}`, null);
      currentPid = prev;
    }
  }
  CloudSync.schedulePush();   // 云同步:对战战绩上传

  $("#vr-emoji").textContent = winner ? "🏆" : "🤝";
  $("#vr-title").textContent = winner ? `${winner.name} 获胜!` : "平局,势均力敌!";
  if (winner) { Sound.fanfare(); confetti(50); } else Sound.correct();

  $("#vr-scores").innerHTML = `
    <div class="vr-player">
      <div class="vr-ava">${p1.avatar}</div>
      <div class="vr-name">${p1.name}</div>
      <div class="vr-pts">${p1.score}</div>
    </div>
    <div class="vr-vs">VS</div>
    <div class="vr-player">
      <div class="vr-ava">${p2.avatar}</div>
      <div class="vr-name">${p2.name}</div>
      <div class="vr-pts">${p2.score}</div>
    </div>`;
  $("#vr-history").textContent = `历史战绩:${roster.map(p => `${p.name} ${versusRec[p.name] || 0} 胜`).join(" · ")}`;

  showScreen("screen-versus-result");
}

$("#btn-vr-again").addEventListener("click", () => { Sound.click(); startVersus(); });

/* ════════ v1.4:花名册与荣誉榜 ════════ */
let pickedAvatar = AVATARS[0];

function updatePlayerChip() {
  const p = me();
  $("#player-chip").textContent = `${p.avatar} ${p.name} ▾`;
}

function renderRoster() {
  updatePlayerChip();
  const grid = $("#roster-grid");
  grid.innerHTML = "";
  roster.forEach(p => {
    const stars = records.filter(r => r.p === p.name && r.stars).reduce((s, r) => s + r.stars, 0);
    const wins = versusRec[p.name] || 0;
    const rounds = records.filter(r => r.p === p.name).length;
    const card = document.createElement("div");
    card.className = "roster-card" + (p.id === currentPid ? " current" : "");
    card.innerHTML = `
      ${roster.length > 1 ? `<button class="r-del" title="移除玩家">✕</button>` : ""}
      <div class="r-avatar">${p.avatar}</div>
      <div class="r-name">${p.name}</div>
      <div class="r-tag">${p.id === currentPid ? "▶ 当前探险家" : "点击上场"}</div>
      <div class="r-tag">⭐${stars} · 🏅${rounds} 轮 · 🏆${wins}</div>`;
    card.addEventListener("click", e => {
      if (e.target.classList.contains("r-del")) return;
      Sound.click();
      currentPid = p.id;
      save("dq_current", currentPid);
      renderRoster();
    });
    card.querySelector(".r-del")?.addEventListener("click", e => {
      e.stopPropagation();
      openOverlay(`
        <div class="ov-emoji">👋</div>
        <div class="ov-title bad">移除「${p.name}」?</div>
        <p style="margin:8px 0;font-size:14.5px">TA 的成绩记录会保留在荣誉榜,但玩家卡将删除</p>
        <div class="ov-actions">
          <button class="btn btn-red" id="ov-del-yes">移除</button>
          <button class="btn btn-plain" style="color:#fff" id="ov-del-no">取消</button>
        </div>`);
      $("#ov-del-yes").addEventListener("click", () => {
        Sound.click();
        roster = roster.filter(x => x.id !== p.id);
        if (currentPid === p.id) { currentPid = roster[0].id; save("dq_current", currentPid); }
        save("dq_roster", roster);
        removedPlayers.add(p.name);
        save("dq_removed", [...removedPlayers]);
        CloudSync.schedulePush();   // 删人即同步(墓碑防复活)
        closeOverlay();
        renderRoster();
      });
      $("#ov-del-no").addEventListener("click", () => { Sound.click(); closeOverlay(); });
    });
    grid.appendChild(card);
  });
  renderAvatarPick();
}

function renderAvatarPick() {
  const box = $("#avatar-pick");
  box.innerHTML = "";
  AVATARS.forEach(a => {
    const b = document.createElement("button");
    b.textContent = a;
    if (a === pickedAvatar) b.classList.add("sel");
    b.addEventListener("click", () => { Sound.click(); pickedAvatar = a; renderAvatarPick(); });
    box.appendChild(b);
  });
}

$("#btn-add-player").addEventListener("click", () => {
  const name = ($("#new-player-name").value.trim() || "").slice(0, 6);
  if (!name) return Sound.wrong();
  if (roster.some(p => p.name === name)) { Sound.wrong(); $("#new-player-name").value = ""; return; }
  Sound.correct();
  roster.push({ id: Date.now(), name, avatar: pickedAvatar });
  removedPlayers.delete(name);
  save("dq_removed", [...removedPlayers]);
  save("dq_roster", roster);
  CloudSync.schedulePush();   // 加人即上传,其他设备可见
  $("#new-player-name").value = "";
  renderRoster();
});

function renderHonor() {
  updatePlayerChip();
  const sum = $("#honor-summary");
  sum.innerHTML = "";
  roster.forEach(p => {
    const stars = records.filter(r => r.p === p.name && r.stars).reduce((s, r) => s + r.stars, 0);
    const rounds = records.filter(r => r.p === p.name).length;
    const wins = versusRec[p.name] || 0;
    const card = document.createElement("div");
    card.className = "honor-card";
    card.innerHTML = `
      <div class="h-ava">${p.avatar}</div>
      <div class="h-name">${p.name}</div>
      <div class="h-stat">累计 <b>${stars}</b> ⭐ · 完成 <b>${rounds}</b> 轮<br>对战 <b>${wins}</b> 胜</div>`;
    sum.appendChild(card);
  });
  $("#honor-sub").textContent = `共 ${records.length} 条成绩 · 按时间倒序`;
  const tl = $("#honor-timeline");
  tl.innerHTML = "";
  if (!records.length) {
    tl.innerHTML = `<div class="tl-item"><span class="tl-text">还没有成绩,去闯一关吧!</span></div>`;
    return;
  }
  records.forEach(r => {
    const div = document.createElement("div");
    div.className = "tl-item";
    const star = r.stars ? `<span class="tl-star">${"⭐".repeat(r.stars)}</span>` : "";
    const kindIcon = r.kind === "versus" ? "⚔️" : r.kind === "final" ? "👑" : "🏅";
    div.innerHTML = `<span class="tl-ym">${r.ym}</span><span class="tl-ava">${r.ava || "👤"}</span>
      <span class="tl-text"><b>${r.p}</b> ${kindIcon} ${r.label}</span>${star}`;
    tl.appendChild(div);
  });
}

/* ════════ 启动 ════════ */
// 首次点击页面任意处,激活音频(浏览器规定:必须有操作才能出声)
document.addEventListener("pointerdown", function once() {
  Sound.ensure();
  if (Sound.enabled) Sound.startBGM();
  document.removeEventListener("pointerdown", once);
});

$("#sound-toggle").textContent = Sound.enabled ? "🔊" : "🔇";
updatePlayerChip();

/* ════════ 云同步初始化(家庭数据集:花名册/成绩/闯关进度/对战战绩) ════════ */
CloudSync.init({
  game: "dynasty",
  collect: () => ({
    roster,
    removed: [...removedPlayers],
    records,
    progress,
    versus: versusRec,
  }),
  apply: s => {
    removedPlayers.clear();
    (s.removed || []).forEach(x => removedPlayers.add(x));
    save("dq_removed", [...removedPlayers]);
    roster = (s.roster || roster).filter(x => !removedPlayers.has(x.name));
    save("dq_roster", roster);
    records.length = 0; records.push(...(s.records || [])); save("dq_records", records);
    Object.keys(progress).forEach(k => delete progress[k]);
    Object.assign(progress, s.progress || {});
    save("dq_progress", progress);
    Object.keys(versusRec).forEach(k => delete versusRec[k]);
    Object.assign(versusRec, s.versus || {});
    save("dq_versus", versusRec);
    if (roster.length && !roster.some(p => p.id === currentPid)) {
      currentPid = roster[0].id; save("dq_current", currentPid);
    }
    updatePlayerChip();
  },
  render: () => {
    const id = document.querySelector(".screen.active")?.id;
    if (id === "screen-map") renderMap();
    if (id === "screen-honor") renderHonor();
    if (id === "screen-player") renderRoster();
  },
});
