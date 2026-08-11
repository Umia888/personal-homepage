/* ═══════════════════════════════════════════════════════════
   Mia World · 交互脚本
   - 主题切换（system → localStorage 覆盖）
   - BlurFade（IntersectionObserver 一次性 in-view）
   - Book Slider（作品集画廊 3D 翻页透视）
   - 作品集 Tab
   - FAQ 分类过滤 + 手风琴
   - 内容墙 分类过滤 + 点赞
   - Dock 底部导航当前区块高亮
   - Drawer（Timeline）
   - Lightbox
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   0. 工具
───────────────────────────────────────── */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ─────────────────────────────────────────
   1. 主题切换（浅色默认 / 深色可切换）
───────────────────────────────────────── */
(function initTheme() {
  const KEY = 'mia-theme';
  const root = document.documentElement;
  const btn  = $('#btn-theme');
  const sun  = btn?.querySelector('.icon-sun');
  const moon = btn?.querySelector('.icon-moon');

  const stored = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const startDark = stored ? stored === 'dark' : false; // 默认浅色（贴合 magicui）

  applyTheme(startDark);

  btn?.addEventListener('click', () => {
    const isDark = !root.classList.contains('dark');
    applyTheme(isDark);
    localStorage.setItem(KEY, isDark ? 'dark' : 'light');
  });

  function applyTheme(isDark) {
    root.classList.toggle('dark', isDark);
    if (sun && moon) {
      sun.style.display  = isDark ? 'none' : '';
      moon.style.display = isDark ? '' : 'none';
    }
    // 更新 theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0a0a0a' : '#ffffff');
  }
})();

/* ─────────────────────────────────────────
   2. BlurFade 入场动画
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
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '-40px 0px -40px 0px', threshold: 0.02 });

  els.forEach(el => io.observe(el));
})();

/* ─────────────────────────────────────────
   3. 作品集 Tab
───────────────────────────────────────── */
(function initEntryTabs() {
  const tabs   = $$('.entry-tabs button');
  const panels = $$('.entry-panel');
  if (!tabs.length) return;

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.entry;
      tabs.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.dataset.entry === key));

      // 面板切换后：新 book-track 重置到起始位并强制刷新 3D transform
      requestAnimationFrame(() => {
        $$('.entry-panel.active .book-track').forEach(track => {
          track.scrollLeft = 0;
          updateBookTrack(track);
        });
      });
    });
  });
})();

/* ─────────────────────────────────────────
   4. Artspace Book Slider · 3D 翻页透视
───────────────────────────────────────── */
function updateBookTrack(track) {
  if (!track) return;
  const trackRect = track.getBoundingClientRect();
  const centerX = trackRect.left + trackRect.width / 2;
  const pages = track.querySelectorAll('.book-page');

  pages.forEach(page => {
    const r = page.getBoundingClientRect();
    const pageCenter = r.left + r.width / 2;
    // 相对容器中心的归一化距离（可能超出 [-1,1]）
    const dist = (pageCenter - centerX) / (trackRect.width / 2);
    const d = clamp(dist, -1.4, 1.4);

    const rotateY   = -d * 22;                    // 度
    const translateZ= -Math.abs(d) * 30;          // px（近大远小）
    const scale     = 1 - Math.min(Math.abs(d) * 0.08, 0.14);
    const opacity   = 1 - Math.min(Math.abs(d) * 0.15, 0.35);

    page.style.transform = `perspective(1400px) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
    page.style.opacity   = String(opacity);
    page.style.zIndex    = String(100 - Math.round(Math.abs(d) * 100));
  });
}

(function initBookSliders() {
  const tracks = $$('.book-track');
  if (!tracks.length) return;

  // 触发时机：DOM 加载完、字体加载、resize、scroll、图片加载
  const scheduled = new WeakMap();
  const request = (track) => {
    if (scheduled.get(track)) return;
    scheduled.set(track, true);
    requestAnimationFrame(() => {
      updateBookTrack(track);
      scheduled.set(track, false);
    });
  };

  tracks.forEach(track => {
    track.addEventListener('scroll', () => request(track), { passive: true });
    // 图片加载完成后重算
    track.querySelectorAll('img').forEach(img => {
      if (img.complete) return;
      img.addEventListener('load',  () => request(track), { once: true });
      img.addEventListener('error', () => request(track), { once: true });
    });
    // 初始
    request(track);
  });

  window.addEventListener('resize', () => tracks.forEach(request), { passive: true });
  window.addEventListener('load',   () => tracks.forEach(t => updateBookTrack(t)));

  // 鼠标滚轮竖向 → 转横向（增强翻书感）
  tracks.forEach(track => {
    track.addEventListener('wheel', (e) => {
      // 仅当竖向滚动比横向明显时转换
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  });
})();

/* ─────────────────────────────────────────
   5. FAQ 分类过滤（保留原逻辑）
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
   6. 内容墙分类 + 点赞
───────────────────────────────────────── */
(function initWall() {
  const tabs  = $$('.wall-tabs button');
  const cards = $$('.wall-grid .msg-card');
  if (!tabs.length) return;

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.wall;
      tabs.forEach(b => b.classList.toggle('active', b === btn));
      cards.forEach(c => {
        const show = (key === 'all') || (c.dataset.wall === key);
        c.style.display = show ? '' : 'none';
      });
    });
  });

  $$('.wall-grid .like').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const num = btn.querySelector('span');
      const liked = btn.classList.toggle('liked');
      const cur = parseInt(num?.textContent || '0', 10) || 0;
      if (num) num.textContent = String(liked ? cur + 1 : Math.max(0, cur - 1));
    });
  });
})();

/* ─────────────────────────────────────────
   7. Dock 当前区块高亮
───────────────────────────────────────── */
(function initDockActive() {
  const dockLinks = $$('.dock a[data-nav]');
  if (!dockLinks.length) return;
  const map = new Map(dockLinks.map(a => [a.dataset.nav, a]));

  const sections = ['hero', 'about', 'experience', 'portfolio', 'faq', 'wall', 'updates']
    .map(id => ({ id, el: document.getElementById(id) }))
    .filter(s => s.el);

  if (!('IntersectionObserver' in window)) return;

  const setActive = (id) => {
    dockLinks.forEach(a => a.removeAttribute('data-active'));
    const target = map.get(id);
    if (target) target.setAttribute('data-active', 'true');
  };

  const io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible[0]) setActive(visible[0].target.id);
  }, {
    rootMargin: '-40% 0px -50% 0px',
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });
  sections.forEach(s => io.observe(s.el));
})();

/* ─────────────────────────────────────────
   8. 侧边抽屉 · Timeline
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
   9. 灯箱：图片放大 / 视频播放 / 切换 / 下载
───────────────────────────────────────── */
const lightbox         = $('#lightbox');
const lightboxStage    = $('#lightbox-stage');
const lightboxPrev     = $('#lightbox-prev');
const lightboxNext     = $('#lightbox-next');
const lightboxDownload = $('#lightbox-download');
const lightboxCounter  = $('#lightbox-counter');

let lbList   = [];
let lbType   = 'image';
let lbIndex  = 0;

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
    v.src = src;
    v.controls = true;
    v.playsInline = true;
    v.muted = false;
    lightboxStage.appendChild(v);
    v.play().catch(() => {});
  } else {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
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
  // 作用域优先：作品集面板 / 内容墙卡片 / 全局
  const scope = item.closest('.entry-panel, .msg-card') || document;
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

// 事件委托：所有 .media-item 点击
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

/* 头像点击 → 放大 */
const heroAvatarImg = $('.hero__avatar img');
if (heroAvatarImg) {
  heroAvatarImg.parentElement?.addEventListener('click', (e) => {
    // 只在真正点击头像时打开灯箱（不阻断 <a href="#about">）
    if (!e.target.closest('img')) return;
    e.preventDefault();
    e.stopPropagation();
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
   10. 键盘：Esc 关闭 / ←→ 灯箱切换
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
