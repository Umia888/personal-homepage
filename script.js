/* ═══════════════════════════════════════════════════════════
   Mia World · 交互脚本
   - 主题切换
   - Floating Dock 磁吸放大 + 当前区块高亮（Aceternity）
   - BlurFade 入场
   - ASCII Art 生成（avatar.png → canvas 采样 → pre 字符）
   - 3D Card Effect · hover tilt（Aceternity）
   - Expandable Card 开合（Aceternity）
   - Draggable Card 拖拽（Aceternity）
   - Book Slider 3D 翻页透视（Artspace）
   - FAQ / Wall / Drawer / Lightbox
═══════════════════════════════════════════════════════════ */

'use strict';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const isTouch = () => matchMedia('(hover: none)').matches;

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
  const sections = ['hero','about','experience','portfolio','faq','wall','updates']
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
   4. ASCII Art（avatar.png → 字符墙）
───────────────────────────────────────── */
(function initAscii() {
  const target = $('#ascii-art');
  if (!target) return;

  const CHARS = ' .`\',:;-~+*=%#$@';
  const cols = 90;

  const img = new Image();
  img.src = 'avatar.png';
  img.decoding = 'async';

  img.onload = () => {
    const aspect = img.width / img.height;
    // 字符长宽比约 0.5 → 行数 = cols / aspect * 0.5
    const rows = Math.max(20, Math.round(cols / aspect * 0.5));
    const cv = document.createElement('canvas');
    cv.width = cols; cv.height = rows;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cols, rows);
    let data;
    try { data = ctx.getImageData(0, 0, cols, rows).data; }
    catch (_) { return; }

    let out = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        // 亮度（Rec.601）
        let bright = 0.299 * r + 0.587 * g + 0.114 * b;
        // 透明像素当作背景
        if (a < 30) bright = 255;
        // 亮 → 稀疏；暗 → 密集
        const idx = Math.floor(((255 - bright) / 255) * (CHARS.length - 1));
        out += CHARS[clamp(idx, 0, CHARS.length - 1)];
      }
      out += '\n';
    }
    target.textContent = out;
  };
  img.onerror = () => { target.textContent = ''; };
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
   6. Aceternity · Expandable Card
───────────────────────────────────────── */
(function initExpandable() {
  const cards = $$('.exp-card');
  const modal = $('#exp-modal');
  const body  = $('#exp-modal-body');
  if (!cards.length || !modal || !body) return;

  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // 若正在 tilting，恢复默认再打开
      card.classList.remove('is-tilting');
      card.style.transform = '';
      openExp(card.dataset.key);
    });
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

    // 先显示，双 rAF 触发过渡
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // 初始化 modal 内的 book slider（如仍有）+ moving cards（点点生图）
    requestAnimationFrame(() => {
      $$('.book-track', modal).forEach(track => {
        setupBookTrack(track);
        updateBookTrack(track);
      });
      $$('.moving-cards-wrap', modal).forEach(setupMovingCards);
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
  return $$('.media-item', scopeEl)
    .filter(i => (i.dataset.mediaType === 'video' ? 'video' : 'image') === type)
    .map(i => i.dataset.mediaSrc);
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
  const scope = item.closest('.exp-modal, .marquee-wrap, .msg-card') || document;
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

/* 头像点击 → 灯箱 */
const heroAvatar = $('.hero__avatar');
const heroAvatarImg = heroAvatar?.querySelector('img');
if (heroAvatar && heroAvatarImg) {
  heroAvatar.addEventListener('click', (e) => {
    // 让它继续跳到 #about，但也可选择放大
    // 这里选择：按住 Alt/Shift 时才放大；普通点击跳链接
    if (!(e.altKey || e.shiftKey)) return;
    e.preventDefault();
    lbType = 'image';
    lbList = [heroAvatarImg.getAttribute('src')];
    lbIndex = 0;
    renderLightbox();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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
