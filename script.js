/* ═══════════════════════════════════════════════════════════
   Mia World · 交互脚本
   - Loader（Boxes 网格 · Preparing for Future → Start）
   - 主题切换
   - Floating Dock 磁吸放大 + 当前区块高亮（Aceternity）
   - BlurFade 入场
   - Draggable Cards · Hero 右栏（Aceternity）
   - 3D Card Effect · hover tilt（Aceternity）
   - 3D Card Effect · Photography 摄影作品（Aceternity）
   - Expandable Card 开合（Aceternity）
   - Book Slider 3D 翻页透视（Artspace）
   - Container Scroll · 03/04/06 章节包裹（Aceternity）
   - 3D Marquee · 内容墙 & 生活碎片（Aceternity）
   - FAQ / Timeline Drawer / Lightbox / 键盘
═══════════════════════════════════════════════════════════ */

'use strict';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const isTouch = () => matchMedia('(hover: none)').matches;

/* ─────────────────────────────────────────
   0. Loader · Aceternity Boxes 网格 + START 拼字
   - 全屏覆盖；hover 网格 → 随机变色
   - 加载完成后：文字变成用彩色方块拼出的 START
   - 点击 START 后淡出，进入个人页面
─────────────────────────────────────────── */
(function initLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  const boxesRoots = loader.querySelectorAll('.loader__boxes');
  const hintEl = document.getElementById('loader-hint');
  const startBtn = document.getElementById('loader-start');
  const pixelsEl = document.getElementById('loader-pixels');

  const COLORS = [
    'rgb(125, 211, 252)', 'rgb(249, 168, 212)', 'rgb(134, 239, 172)',
    'rgb(253, 224, 71)',  'rgb(252, 165, 165)', 'rgb(216, 180, 254)',
    'rgb(147, 197, 253)', 'rgb(165, 180, 252)', 'rgb(196, 181, 253)'
  ];
  const rand = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  // 加载期间禁止背景滚动
  document.body.style.overflow = 'hidden';

  /* ---- 1. 生成 Boxes 网格（40 列 × 20 行）· 两个容器都填充 ---- */
  const COLS = 40, ROWS = 20;
  function buildGrid(root) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < COLS; i++) {
      const col = document.createElement('div');
      col.className = 'loader__col';
      for (let j = 0; j < ROWS; j++) {
        const cell = document.createElement('div');
        cell.className = 'loader__cell';
        if (i % 2 === 0 && j % 2 === 0) cell.classList.add('has-plus');
        col.appendChild(cell);
      }
      frag.appendChild(col);
    }
    root.appendChild(frag);
  }
  boxesRoots.forEach(buildGrid);

  /* ---- 2. hover / 触摸 → 单格随机变色（两个网格都监听）---- */
  const paintCell = (target) => {
    const cell = target.closest && target.closest('.loader__cell');
    if (!cell) return;
    cell.style.setProperty('--rand', rand());
    cell.style.backgroundColor = rand();
  };
  boxesRoots.forEach((root) => {
    root.addEventListener('mouseover', (e) => paintCell(e.target));
    root.addEventListener('touchstart', (e) => paintCell(e.target), { passive: true });
  });

  /* ---- 3. START 5×5 像素字模 ---- */
  const LETTERS = {
    S: ['01110', '10000', '01110', '00001', '01110'],
    T: ['11111', '00100', '00100', '00100', '00100'],
    A: ['01110', '10001', '11111', '10001', '10001'],
    R: ['11110', '10001', '11110', '10010', '10001'],
  };
  const WORD = ['S', 'T', 'A', 'R', 'T'];
  const PAT_ROWS = 5;
  const PAT_COLS = WORD.length * 5 + (WORD.length - 1); // 5 letters × 5 + 4 gaps = 29

  // 先构建 5 行 × 29 列的暗色像素点阵（初始不亮）
  const pixels = [];
  for (let r = 0; r < PAT_ROWS; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'loader__pixel-row';
    const rowArr = [];
    for (let c = 0; c < PAT_COLS; c++) {
      const p = document.createElement('div');
      p.className = 'loader__pixel';
      rowEl.appendChild(p);
      rowArr.push(p);
    }
    pixels.push(rowArr);
    pixelsEl.appendChild(rowEl);
  }

  // 逐字母、逐格 stagger 点亮，视觉上像"方块拼出" START
  function lightStart() {
    WORD.forEach((letter, wordIdx) => {
      const startCol = wordIdx * 6; // 5 列字宽 + 1 列间距
      const glyph = LETTERS[letter];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (glyph[r][c] !== '1') continue;
          const px = pixels[r][startCol + c];
          const color = rand();
          const delay = wordIdx * 140 + (r * 5 + c) * 14;
          setTimeout(() => {
            px.style.setProperty('--lit', color);
            px.classList.add('is-lit');
          }, delay);
        }
      }
    });
  }

  /* ---- 4. 加载完成流程 ---- */
  function onReady() {
    // 稍等一小段，让 "Preparing for Future" 有存在感
    setTimeout(() => {
      hintEl.hidden = true;
      startBtn.hidden = false;
      lightStart();
    }, 900);
  }

  function hideLoader() {
    loader.classList.add('is-hiding');
    document.body.style.overflow = '';
    // 一次性移除，释放 DOM
    setTimeout(() => loader.remove(), 750);
  }

  startBtn.addEventListener('click', hideLoader);

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady, { once: true });
  }
})();

/* ─────────────────────────────────────────
   1. 主题切换
───────────────────────────────────────── */
(function initTheme() {
  const KEY = 'mia-theme';
  const root = document.documentElement;
  const btn  = $('#btn-theme');
  const stored = localStorage.getItem(KEY);
  applyTheme(stored === 'dark');

  btn?.addEventListener('click', () => {
    const isDark = !root.classList.contains('dark');
    applyTheme(isDark);
    localStorage.setItem(KEY, isDark ? 'dark' : 'light');
  });

  function applyTheme(isDark) {
    root.classList.toggle('dark', isDark);
    if (btn) btn.textContent = isDark ? '☾ Theme' : '☀ Theme';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0a0a0a' : '#ffffff');
  }
})();

/* ─────────────────────────────────────────
   2. Floating Dock · 磁吸放大 + 当前区块高亮
───────────────────────────────────────── */
(function initFdock() {
  const dock = $('#fdock');
  if (!dock) return;
  const items = $$('.fdock__item', dock);

  // 磁吸放大（桌面端）
  if (!isTouch()) {
    dock.addEventListener('mousemove', (e) => {
      items.forEach(it => {
        const rect = it.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const dx = Math.abs(e.clientX - cx);
        const t  = Math.max(0, 1 - dx / 140);
        const s  = 1 + t * 0.28;
        it.style.transform = `scale(${s.toFixed(3)})`;
      });
    });
    dock.addEventListener('mouseleave', () => {
      items.forEach(it => (it.style.transform = ''));
    });
  }

  // 当前区块高亮
  const navLinks = $$('.fdock__item[data-nav]', dock);
  const map = new Map(navLinks.map(a => [a.dataset.nav, a]));
  const sections = ['hero','about','experience','portfolio','faq','wall','life','photos','updates']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) {
        navLinks.forEach(a => a.removeAttribute('data-active'));
        const target = map.get(visible[0].target.id);
        if (target) target.setAttribute('data-active', 'true');
      }
    }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    sections.forEach(s => io.observe(s));
  }
})();

/* ─────────────────────────────────────────
   3. BlurFade
───────────────────────────────────────── */
(function initBlurFade() {
  const els = $$('.blur-fade');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { rootMargin: '-40px 0px -40px 0px', threshold: 0.02 });
  els.forEach(el => io.observe(el));
})();

/* ─────────────────────────────────────────
   4. Aceternity · Draggable Cards（Hero 右栏 · 生活碎片图卡）
   - 每张卡片可鼠标 / 触屏拖拽
   - 拖动时按水平速度轻微 tilt
   - 释放后回弹到基准 rotation（位置保留）
───────────────────────────────────────── */
(function initDraggableCards() {
  const container = $('#draggable-cards');
  if (!container) return;
  const cards = $$('.draggable-card', container);
  if (!cards.length) return;

  cards.forEach((card) => {
    const baseRot = parseFloat(card.dataset.rot || '0');
    const initX = card.dataset.initX || '0%';
    const initY = card.dataset.initY || '0%';
    // 以像素为单位的当前拖拽偏移（相对于初始 CSS 位置）
    let dx = 0, dy = 0;
    let dragging = false;
    let ptrStartX = 0, ptrStartY = 0;
    let originDx = 0, originDy = 0;
    let lastPtrX = 0, lastMoveTime = 0;
    let velX = 0;
    let topZ = 20;

    function paint(rot) {
      // 关键顺序：先 translate(-50%,-50%) 让卡片中心对齐 (top:50%, left:50%)
      // 再叠加：初始偏移(init-x, init-y) + 拖拽偏移(dx, dy) + 旋转
      card.style.transform =
        `translate(-50%, -50%) ` +
        `translate(${initX}, ${initY}) ` +
        `translate(${dx}px, ${dy}px) ` +
        `rotate(${rot}deg)`;
    }

    function onDown(e) {
      const pt = e.touches ? e.touches[0] : e;
      dragging = true;
      ptrStartX = pt.clientX;
      ptrStartY = pt.clientY;
      originDx = dx;
      originDy = dy;
      lastPtrX = pt.clientX;
      lastMoveTime = performance.now();
      velX = 0;
      // 提升到最上层
      topZ += 1;
      card.style.zIndex = String(topZ);
      card.classList.add('is-dragging');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
      window.addEventListener('touchcancel', onUp);
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      dx = originDx + (pt.clientX - ptrStartX);
      dy = originDy + (pt.clientY - ptrStartY);
      // 计算水平方向瞬时速度（决定 tilt 大小）
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveTime);
      velX = ((pt.clientX - lastPtrX) / dt) * 16; // px/frame
      lastPtrX = pt.clientX;
      lastMoveTime = now;
      const dragRot = baseRot + clamp(velX * 0.6, -12, 12);
      paint(dragRot);
      if (e.cancelable) e.preventDefault();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      card.classList.remove('is-dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
      // 回弹 rotation（位置保留），弹性缓动
      card.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)';
      paint(baseRot);
      const clear = () => {
        card.style.transition = '';
        card.removeEventListener('transitionend', clear);
      };
      card.addEventListener('transitionend', clear);
    }

    card.addEventListener('mousedown', onDown);
    card.addEventListener('touchstart', onDown, { passive: false });
    // 阻止 <img> 原生拖拽（避免出现幽灵图）
    $$('img', card).forEach(img => {
      img.addEventListener('dragstart', (e) => e.preventDefault());
    });
  });
})();

/* ─────────────────────────────────────────
   5. Aceternity · 3D Card Effect（tilt）
───────────────────────────────────────── */
(function init3dTilt() {
  if (isTouch()) return;
  const cards = $$('.tilt');
  if (!cards.length) return;

  cards.forEach(card => {
    let raf = 0;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;   // 0..1
      const y = (e.clientY - rect.top)  / rect.height;  // 0..1
      const rotateX = (0.5 - y) * 14;   // -7 .. 7
      const rotateY = (x - 0.5) * 14;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.classList.add('is-tilting');
        card.style.transform =
          `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      });
    });
    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      card.classList.remove('is-tilting');
      card.style.transform = '';
    });
  });
})();

/* ─────────────────────────────────────────
   5.5 Aceternity · 3D Card Effect（Photography 摄影作品）
   - .card3d-container 追踪鼠标 → 给 .card3d-body 设置 --r3d-x/--r3d-y
   - 内部 .card3d-item 按 data-tz 设置 --tz，hover 时拉开层次
─────────────────────────────────────────── */
(function init3dCards() {
  const cards = $$('.card3d-container');
  if (!cards.length) return;

  // 先给内部 item 写入 --tz 变量（CSS 里会在 hover 时读取）
  cards.forEach(container => {
    $$('.card3d-item', container).forEach(item => {
      const tz = item.dataset.tz;
      if (tz) item.style.setProperty('--tz', `${parseFloat(tz)}px`);
    });
  });

  // 触屏设备不做鼠标追踪
  if (isTouch()) return;

  const ROT_MAX = 10; // 最大旋转角度
  cards.forEach(container => {
    const body = container.querySelector('.card3d-body');
    if (!body) return;
    let raf = 0;

    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;   // 0..1
      const y = (e.clientY - rect.top)  / rect.height;  // 0..1
      const rotateX = (0.5 - y) * ROT_MAX * 2;   // -ROT_MAX .. ROT_MAX
      const rotateY = (x - 0.5) * ROT_MAX * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        body.style.setProperty('--r3d-x', `${rotateX.toFixed(2)}deg`);
        body.style.setProperty('--r3d-y', `${rotateY.toFixed(2)}deg`);
      });
    });

    container.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      body.style.setProperty('--r3d-x', '0deg');
      body.style.setProperty('--r3d-y', '0deg');
    });
  });
})();

/* ─────────────────────────────────────────
   6. Aceternity · Expandable Card + Blog article Modal
   （小卡片模仿 magicui blog-card，展开后是 blog article 布局：
    大标题 + cover + 左正文 + 右 aside(author/TOC)）
───────────────────────────────────────── */
(function initExpandable() {
  // 触发源：blog-card 内的 button（有 data-key）
  const cards = $$('.blog-card__link[data-key]');
  const modal = $('#exp-modal');
  const body  = $('#exp-modal-body');
  if (!cards.length || !modal || !body) return;

  cards.forEach(card => {
    card.addEventListener('click', () => openExp(card.dataset.key));
  });

  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-exp-close]')) closeExp();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeExp();
  });

  function openExp(key) {
    const tpl = document.getElementById('exp-tpl-' + key);
    if (!tpl) return;
    body.innerHTML = '';
    body.appendChild(tpl.content.cloneNode(true));

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // 初始化 modal 内的 book-slider（若有）+ moving-cards + TOC
    requestAnimationFrame(() => {
      $$('.book-track', modal).forEach(track => {
        setupBookTrack(track);
        updateBookTrack(track);
      });
      $$('.moving-cards-wrap', modal).forEach(setupMovingCards);
      setupBlogToc(modal);
    });
  }

  function closeExp() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // 清空内容（在过渡结束后）
    setTimeout(() => { body.innerHTML = ''; }, 320);
  }
})();

/* ─────────────────────────────────────────
   7. Artspace · Book Slider · 3D 翻页透视
───────────────────────────────────────── */
function updateBookTrack(track) {
  if (!track) return;
  const trackRect = track.getBoundingClientRect();
  if (trackRect.width === 0) return;
  const centerX = trackRect.left + trackRect.width / 2;
  const pages = track.querySelectorAll('.book-page');
  pages.forEach(page => {
    const r = page.getBoundingClientRect();
    const pageCenter = r.left + r.width / 2;
    const dist = (pageCenter - centerX) / (trackRect.width / 2);
    const d = clamp(dist, -1.4, 1.4);
    const rotateY = -d * 20;
    const translateZ = -Math.abs(d) * 30;
    const scale = 1 - Math.min(Math.abs(d) * 0.08, 0.14);
    const opacity = 1 - Math.min(Math.abs(d) * 0.15, 0.35);
    page.style.transform =
      `perspective(1400px) rotateY(${rotateY.toFixed(2)}deg) translateZ(${translateZ.toFixed(2)}px) scale(${scale.toFixed(3)})`;
    page.style.opacity = String(opacity);
    page.style.zIndex = String(100 - Math.round(Math.abs(d) * 100));
  });
}

function setupBookTrack(track) {
  if (track._setup) return;
  track._setup = true;
  const scheduled = { v: false };
  const req = () => {
    if (scheduled.v) return;
    scheduled.v = true;
    requestAnimationFrame(() => { updateBookTrack(track); scheduled.v = false; });
  };
  track.addEventListener('scroll', req, { passive: true });
  track.querySelectorAll('img').forEach(img => {
    if (img.complete) return;
    img.addEventListener('load', req, { once: true });
    img.addEventListener('error', req, { once: true });
  });
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      track.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('resize', req, { passive: true });
}

(function initInitialBookTracks() {
  const tracks = $$('.book-track');
  tracks.forEach(t => { setupBookTrack(t); updateBookTrack(t); });
})();

/* ─────────────────────────────────────────
   7.5 Aceternity · Infinite Moving Cards
   - 把 track 内容克隆一份，形成无缝循环
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   6.5 Blog Article TOC · 点击滚动到 heading + 当前段高亮
   （在 modal 内工作：modal 是滚动容器 overflow-y auto）
───────────────────────────────────────── */
function setupBlogToc(scope) {
  const links = scope.querySelectorAll('.blog-toc a[data-scroll-to]');
  const modal = scope.querySelector('.exp-modal__card') || scope;
  if (!links.length) return;

  // 点击：滚动 modal 内容到对应 heading
  links.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.scrollTo;
      const target = scope.querySelector('#' + CSS.escape(id));
      if (!target) return;
      // exp-modal 本身是 scroll 容器，所以 scroll 到 heading 相对 modal 顶部
      const container = document.getElementById('exp-modal');
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      const y = container.scrollTop + (tRect.top - cRect.top) - 24;
      container.scrollTo({ top: y, behavior: 'smooth' });
      links.forEach(l => l.removeAttribute('data-active'));
      a.setAttribute('data-active', 'true');
    });
  });

  // 滚动时自动高亮当前段
  const container = document.getElementById('exp-modal');
  if (!container) return;
  const headings = Array.from(links).map(a => {
    const id = a.dataset.scrollTo;
    return { id, el: scope.querySelector('#' + CSS.escape(id)), link: a };
  }).filter(h => h.el);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const cTop = container.getBoundingClientRect().top;
      let current = headings[0];
      for (const h of headings) {
        const t = h.el.getBoundingClientRect().top - cTop;
        if (t <= 120) current = h;
      }
      headings.forEach(h => h.link.removeAttribute('data-active'));
      if (current) current.link.setAttribute('data-active', 'true');
    });
  }
  container.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function setupMovingCards(wrap) {
  if (!wrap || wrap._mcInit) return;
  const track = wrap.querySelector('.moving-cards-track');
  if (!track) return;
  // 克隆当前所有子节点一份追加到末尾
  const nodes = Array.from(track.children);
  nodes.forEach(n => {
    const c = n.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    track.appendChild(c);
  });
  wrap._mcInit = true;
}
(function initMovingCardsOnLoad() {
  $$('.moving-cards-wrap').forEach(setupMovingCards);
})();

/* ─────────────────────────────────────────
   7.6 Aceternity · Container Scroll Animation
   - 包裹 03/04/06 三个 section 的 wrapper 有 3D 展开效果
   - 顶部进入视口 → 摆正；离开视口 → 保持原样
───────────────────────────────────────── */
(function initContainerScroll() {
  const el = document.getElementById('cs-content');
  if (!el) return;

  // 参数：进度从 0 → 1
  // rect.top 从 winH 变到 winH*0.15 时 progress 从 0 → 1
  const ROT_MAX = 20;       // deg
  const SCALE_MIN = 0.90;
  const Y_MAX = 40;         // px

  let ticking = false;
  function update() {
    ticking = false;
    const rect = el.getBoundingClientRect();
    const winH = window.innerHeight;
    const start = winH;
    const end   = winH * 0.15;
    let p = 1 - (rect.top - end) / (start - end);
    p = Math.max(0, Math.min(1, p));
    // easing (ease-out cubic)
    const eased = 1 - Math.pow(1 - p, 3);
    const rot   = (1 - eased) * ROT_MAX;
    const scale = SCALE_MIN + eased * (1 - SCALE_MIN);
    const y     = (1 - eased) * Y_MAX;
    el.style.setProperty('--cs-rot',   rot.toFixed(2) + 'deg');
    el.style.setProperty('--cs-scale', scale.toFixed(3));
    el.style.setProperty('--cs-y',     y.toFixed(1) + 'px');
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update(); // 初次触发
})();

/* ─────────────────────────────────────────
   8. Aceternity · 3D Marquee
   （纯 CSS 动画驱动；仅暴露"视口外暂停动画"优化）
───────────────────────────────────────── */
(function initMarquee() {
  const wrap = document.querySelector('.marquee-wrap');
  if (!wrap) return;
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      wrap.querySelectorAll('.marquee-col').forEach(col => {
        col.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
      });
    });
  }, { threshold: 0 });
  io.observe(wrap);
})();

/* ─────────────────────────────────────────
   9. FAQ 分类过滤
───────────────────────────────────────── */
(function initFAQ() {
  const filters = $$('.faq-filters button');
  const items   = $$('.faq-item');
  if (!filters.length) return;
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.faq;
      filters.forEach(b => b.classList.toggle('active', b === btn));
      let firstShown = null;
      items.forEach(item => {
        const match = item.dataset.faq === key;
        item.hidden = !match;
        item.open   = false;
        if (match && !firstShown) firstShown = item;
      });
      if (firstShown) firstShown.open = true;
    });
  });
})();

/* ─────────────────────────────────────────
   10. Timeline 抽屉
───────────────────────────────────────── */
const drawer = $('#drawer');
function openDrawer()  {
  if (!drawer) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  if (!drawer) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
$('#btn-open-drawer')?.addEventListener('click', openDrawer);
if (drawer) {
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
  });
}

/* ─────────────────────────────────────────
   12. Lightbox
───────────────────────────────────────── */
const lightbox         = $('#lightbox');
const lightboxStage    = $('#lightbox-stage');
const lightboxPrev     = $('#lightbox-prev');
const lightboxNext     = $('#lightbox-next');
const lightboxDownload = $('#lightbox-download');
const lightboxCounter  = $('#lightbox-counter');

let lbList  = [];
let lbType  = 'image';
let lbIndex = 0;

function buildMediaList(scopeEl, type) {
  const srcs = $$('.media-item', scopeEl)
    .filter(i => (i.dataset.mediaType === 'video' ? 'video' : 'image') === type)
    .map(i => i.dataset.mediaSrc);
  // 同一 scope 内同 src 去重（例如摄影 3D 卡里图 + 放大按钮共享 src）
  return Array.from(new Set(srcs));
}
function fileNameFromSrc(src) {
  try { return decodeURIComponent(src.split('/').pop()); }
  catch (_) { return src.split('/').pop(); }
}
function renderLightbox() {
  if (!lbList.length || !lightboxStage) return;
  const src = lbList[lbIndex];
  lightboxStage.innerHTML = '';
  if (lbType === 'video') {
    const v = document.createElement('video');
    v.src = src; v.controls = true; v.playsInline = true;
    lightboxStage.appendChild(v);
    v.play().catch(() => {});
  } else {
    const img = document.createElement('img');
    img.src = src; img.alt = '';
    lightboxStage.appendChild(img);
  }
  if (lightboxDownload) {
    lightboxDownload.href = src;
    lightboxDownload.setAttribute('download', fileNameFromSrc(src));
  }
  const multi = lbList.length > 1;
  if (lightboxPrev) lightboxPrev.style.display = multi ? '' : 'none';
  if (lightboxNext) lightboxNext.style.display = multi ? '' : 'none';
  if (lightboxCounter) lightboxCounter.textContent = multi ? `${lbIndex + 1} / ${lbList.length}` : '';
}
function openLightbox(item) {
  lbType = (item.dataset.mediaType === 'video') ? 'video' : 'image';
  const scope = item.closest('.exp-modal, .marquee-wrap, .msg-card, .cards3d-grid') || document;
  lbList = buildMediaList(scope, lbType);
  lbIndex = Math.max(0, lbList.indexOf(item.dataset.mediaSrc));
  renderLightbox();
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxStage.innerHTML = '';
  document.body.style.overflow = '';
}
function stepLightbox(delta) {
  if (!lbList.length) return;
  lbIndex = (lbIndex + delta + lbList.length) % lbList.length;
  renderLightbox();
}

// 事件委托：只在真正 click（非拖动）时触发
document.addEventListener('click', (e) => {
  const item = e.target.closest('.media-item');
  if (item) {
    e.preventDefault();
    openLightbox(item);
  }
});
if (lightboxPrev) lightboxPrev.addEventListener('click', () => stepLightbox(-1));
if (lightboxNext) lightboxNext.addEventListener('click', () => stepLightbox(1));
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target.closest('[data-lightbox-close]')) closeLightbox();
  });
}

/* ─────────────────────────────────────────
   13. 键盘
───────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (lightbox && lightbox.classList.contains('open')) {
    if (e.key === 'Escape')          closeLightbox();
    else if (e.key === 'ArrowLeft')  stepLightbox(-1);
    else if (e.key === 'ArrowRight') stepLightbox(1);
    return;
  }
  if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
    closeDrawer();
  }
});
