/* ═══════════════════════════════════════════════════════════
   Mia World · Supabase 骨架版 · 交互脚本
   - 顶栏 scroll shadow / 章节高亮
   - 能力矩阵 Tab
   - 作品集 Tab
   - FAQ 分类过滤 + 手风琴
   - 内容墙 分类过滤 + 点赞
   - Timeline 侧边抽屉
   - 灯箱（图片放大 / 视频播放 / 上下张切换 / 下载）
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   0. 通用工具
───────────────────────────────────────── */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ─────────────────────────────────────────
   1. 顶栏 · 滚动时加阴影 & 章节高亮
───────────────────────────────────────── */
(function initTopbar() {
  const topbar = $('#topbar');
  if (!topbar) return;

  const onScroll = () => {
    topbar.classList.toggle('topbar--scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // 章节高亮
  const sections = ['#capabilities', '#portfolio', '#faq', '#wall', '#updates']
    .map(id => document.querySelector(id))
    .filter(Boolean);
  const links = $$('.topnav__link');

  const setActive = (hash) => {
    links.forEach(a => {
      a.classList.toggle('topnav__link--active', a.getAttribute('href') === hash);
    });
  };

  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      // 找出可见度最高、距离顶部最近的一个 section
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive('#' + visible[0].target.id);
    }, {
      rootMargin: '-30% 0px -55% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    sections.forEach(s => io.observe(s));
  }
})();

/* 给 topbar 加一个 scrolled 样式（延续 border 视觉） */
(function injectTopbarScrolledStyle() {
  const css = `
    .topbar--scrolled { background: rgba(10,10,10,0.9) !important; }
    .topnav__link--active { color: var(--text) !important; background: var(--bg-hover) !important; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ─────────────────────────────────────────
   2. 能力矩阵 Tab（01 · About Me）
───────────────────────────────────────── */
(function initFeatureTabs() {
  const cards = $$('.feature-card');
  const panels = $$('.fdetail-panel');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.feature;
      cards.forEach(c => c.classList.toggle('active', c === card));
      panels.forEach(p => p.classList.toggle('active', p.dataset.feature === key));
    });
  });
})();

/* ─────────────────────────────────────────
   3. 作品集 Tab（02 · Portfolio）
───────────────────────────────────────── */
(function initEntryTabs() {
  const cards = $$('.entry-card');
  const panels = $$('.entry-panel');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.entry;
      cards.forEach(c => c.classList.toggle('active', c === card));
      panels.forEach(p => p.classList.toggle('active', p.dataset.entry === key));
      // 切换 tab 时把详情区滚到视口内（避免右侧内容一屏都在下面）
      const detail = card.closest('.split-layout')?.querySelector('.entry-detail');
      if (detail && window.innerWidth <= 1024) {
        detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

/* ─────────────────────────────────────────
   4. FAQ 分类过滤 + 手风琴（03 · FAQ）
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
        item.open   = false;              // 切换分类时先全部收起
        if (match && !firstShown) firstShown = item;
      });
      // 默认展开分类中的第一个
      if (firstShown) firstShown.open = true;
    });
  });
})();

/* ─────────────────────────────────────────
   5. 内容墙 分类过滤 + 点赞（04 · Wall）
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

  // 点赞
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
   6. 侧边抽屉 · Timeline
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

['#btn-open-drawer', '#btn-open-drawer-2'].forEach(sel => {
  const el = $(sel);
  if (el) el.addEventListener('click', openDrawer);
});

if (drawer) {
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
  });
}

/* ─────────────────────────────────────────
   7. 灯箱：图片放大 / 视频播放 / 切换 / 下载
   - 缩略图作用域：msg-card / entry-panel / 全局
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
  if (!lbList.length) return;
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

  lightboxDownload.href = src;
  lightboxDownload.setAttribute('download', fileNameFromSrc(src));

  const multi = lbList.length > 1;
  lightboxPrev.style.display = multi ? '' : 'none';
  lightboxNext.style.display = multi ? '' : 'none';
  lightboxCounter.textContent = multi ? `${lbIndex + 1} / ${lbList.length}` : '';
}

function openLightbox(item) {
  lbType = (item.dataset.mediaType === 'video') ? 'video' : 'image';
  // 作用域优先：卡片 -> 面板 -> 全局
  const scope = item.closest('.msg-card, .entry-panel') || document;
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
  lightboxStage.innerHTML = '';   // 清空以停止视频
  document.body.style.overflow = '';
}

function stepLightbox(delta) {
  if (!lbList.length) return;
  lbIndex = (lbIndex + delta + lbList.length) % lbList.length;
  renderLightbox();
}

// 事件委托：所有 .media-item 点击 -> 打开灯箱
document.addEventListener('click', (e) => {
  const item = e.target.closest('.media-item');
  if (item) {
    e.preventDefault();
    openLightbox(item);
    return;
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
$$('.user img, .msg-card__author img, .site-footer__brand .logo__mark').forEach(el => {
  el.style.cursor = 'zoom-in';
});
const userAvatar = $('.user img');
if (userAvatar) {
  userAvatar.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    lbType = 'image';
    lbList = [userAvatar.getAttribute('src')];
    lbIndex = 0;
    renderLightbox();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });
}

/* ─────────────────────────────────────────
   8. 键盘：Esc 关闭 / ←→ 灯箱切换
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

