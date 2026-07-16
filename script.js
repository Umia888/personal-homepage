// ─────────────────────────────────────────
// 精确尺寸计算：把 hero 锁定为"整数像素" 21:9 画幅
// aspect-ratio + 100vw + max-height 的自适应布局会产生浮点尺寸，
// 亚像素渲染下四周边缘每帧微微浮动 → 视觉上就是"越靠近四周越明显的抖动"
// 通过 JS 在 resize 时算出整数像素并写入 CSS 变量彻底消除
// ─────────────────────────────────────────
const NAV_H = 52; // 与 CSS --nav-h 保持一致

function fitHero() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxH = vh - NAV_H * 2;
  const dpr = window.devicePixelRatio || 1;

  let heroW, heroH;
  // 判断视口是"高瘦"还是"矮扁"（相对 21:9 而言）
  if (vw * 9 <= maxH * 21) {
    // 视口更瘦，按宽度算：宽度 = 100vw，高度 = 宽 × 9/21
    heroW = vw;
    heroH = vw * 9 / 21;
  } else {
    // 视口更宽，按高度算：高度 = maxH，宽度 = 高 × 21/9
    heroH = maxH;
    heroW = maxH * 21 / 9;
  }

  // 关键：把 CSS 像素对齐到设备物理像素的整数倍（消除亚像素舍入抖动）
  heroW = Math.floor(heroW * dpr) / dpr;
  heroH = Math.floor(heroH * dpr) / dpr;

  const root = document.documentElement;
  root.style.setProperty('--hero-w', heroW + 'px');
  root.style.setProperty('--hero-h', heroH + 'px');
}

fitHero();
window.addEventListener('resize', fitHero);

// ─────────────────────────────────────────
// 视频将要结束时（差 100ms）触发回调，无痕切换
// 视频真正结束时主动 pause 并回退极短一段，
// 避免部分浏览器在末帧解码时反复重绘导致画面抖动
// ─────────────────────────────────────────
function freezeAtEnd(video) {
  try {
    video.pause();
    if (Number.isFinite(video.duration) && video.duration > 0) {
      // 回退 0.04s 定位到一个稳定的关键帧附近，避免恰好停在异常末帧
      video.currentTime = Math.max(0, video.duration - 0.04);
    }
  } catch (_) { /* 忽略 seek 权限异常 */ }
}

function onVideoNearEnd(video, hero, cb) {
  // 用 hero--ended 类作为幂等标志（而非一次性闭包），
  // 这样视频被重播（replay）时，播放结束后仍能重新触发回调。
  let hasEnded = false;
  
  video.addEventListener('ended', () => {
    if (!hasEnded && !hero.classList.contains('hero--ended')) {
      hasEnded = true;
      cb();
    }
    freezeAtEnd(video);
  });
  
  // 视频重播时重置标志
  video.addEventListener('play', () => {
    if (video.currentTime < video.duration - 0.1) {
      hasEnded = false;
    }
  });
}

// ─────────────────────────────────────────
// 各页视频：结束后显示叠层 / 引导层
// ─────────────────────────────────────────
const hero1  = document.getElementById('hero-1');
const video1 = document.getElementById('video-1');
onVideoNearEnd(video1, hero1, () => hero1.classList.add('hero--ended'));

const hero2  = document.getElementById('hero-2');
const video2 = document.getElementById('video-2');
onVideoNearEnd(video2, hero2, () => hero2.classList.add('hero--ended'));

const hero3  = document.getElementById('hero-3');
const video3 = document.getElementById('video-3');
onVideoNearEnd(video3, hero3, () => hero3.classList.add('hero--ended'));

const hero4  = document.getElementById('hero-4');
const video4 = document.getElementById('video-4');
onVideoNearEnd(video4, hero4, () => hero4.classList.add('hero--ended'));

// ─────────────────────────────────────────
// 全局导航：激活态更新（Contact 单独标识）
// ─────────────────────────────────────────
function updateNavActive(pageId, isContact = false) {
  document.querySelectorAll('.gnav__link').forEach(l => {
    const isContactLink = !!l.dataset.contact;
    const match = isContact
      ? isContactLink
      : (l.dataset.to === pageId && !isContactLink);
    l.classList.toggle('active', match);
  });
}

// ─────────────────────────────────────────
// 页面跳转
//   replay=true  : 重置并重播视频（用于 Explore Now → About）
//   autoplay=false: 不自动播放（用于 Contact，需手动 seek 到最后一帧）
// ─────────────────────────────────────────
function navigateTo(targetPageId, { replay = false, contact = false, autoplay = true } = {}) {
  const target = document.getElementById(targetPageId);
  if (!target) return;

  // 切换页面时关闭联系方式小窗，避免其残留状态影响后续热区点击
  if (typeof closeContactPopup === 'function') closeContactPopup();

  document.querySelectorAll('.page--active').forEach(p => p.classList.remove('page--active'));
  target.classList.add('page--active');
  updateNavActive(targetPageId, contact);

  const hero = target.querySelector('.hero');
  const vid  = target.querySelector('video');
  if (!vid || !hero) return;

  if (targetPageId === 'page-1') {
    // 通过导航回到 Home：直接进入结束态，叠层 / 热区立即可用（不重播、不需等视频）
    hero.classList.add('hero--ended');
    try { vid.pause(); } catch (_) {}
  } else if (replay) {
    // 重置并重播（叠层重新触发）
    hero.classList.remove('hero--ended');
    try { vid.currentTime = 0; } catch (_) {}
    vid.play().catch(() => {});
  } else if (autoplay && !hero.classList.contains('hero--ended')) {
    // 首次进入才播放；已看完的保持最后一帧 + 叠层
    vid.play().catch(() => {});
  }
}

// ─────────────────────────────────────────
// Contact：切到 Blog 最后一帧 + 电脑区域弹出联系方式小窗
// ─────────────────────────────────────────
const contactPopup = document.getElementById('contact-popup');

function openContactPopup() {
  contactPopup.classList.add('open');
  contactPopup.setAttribute('aria-hidden', 'false');
}
function closeContactPopup() {
  contactPopup.classList.remove('open');
  contactPopup.setAttribute('aria-hidden', 'true');
}

contactPopup.addEventListener('click', (e) => {
  if (e.target.closest('[data-contact-close]')) closeContactPopup();
});

// 点击弹窗外部区域关闭（点到导航 Contact 本身不算）
document.addEventListener('click', (e) => {
  if (!contactPopup.classList.contains('open')) return;
  if (e.target.closest('#contact-popup')) return;
  if (e.target.closest('[data-contact]')) return;
  closeContactPopup();
});

// ─────────────────────────────────────────
// 全局导航栏点击
// ─────────────────────────────────────────
const globalNav = document.getElementById('global-nav');

globalNav.addEventListener('click', (e) => {
  const link = e.target.closest('[data-to]');
  if (!link) return;
  e.preventDefault();
  if (link.dataset.contact) {
    // 任意页面点击 Contact：在顶栏下方弹出/收起联系方式小窗，不切换页面
    if (contactPopup.classList.contains('open')) closeContactPopup();
    else openContactPopup();
  } else {
    navigateTo(link.dataset.to);
  }
});

// 顶栏三横线：点击收起 / 展开导航栏
const gnavToggle = document.querySelector('.gnav__toggle');
if (gnavToggle) {
  gnavToggle.addEventListener('click', () => {
    globalNav.classList.toggle('global-nav--collapsed');
  });
}

// ─────────────────────────────────────────
// 首页内部热区点击：Explore Now（content-area）→ 重播 About 视频
// ─────────────────────────────────────────
hero1.addEventListener('click', (e) => {
  const hotzone = e.target.closest('[data-to]');
  if (!hotzone) return;
  e.preventDefault();
  const replay = hotzone.classList.contains('content-area'); // Explore Now → 重播 About
  navigateTo(hotzone.dataset.to, { replay });
});

// ─────────────────────────────────────────
// Gallery 弹窗交互
// ─────────────────────────────────────────
const galleryModal = document.getElementById('gallery-modal');

function showGalleryItem(key) {
  document.querySelectorAll('.gm-item').forEach(item => {
    item.classList.toggle('active', item.dataset.gallery === key);
  });
  document.querySelectorAll('.gm-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.gallery === key);
  });
}

function openGallery(key) {
  showGalleryItem(key);
  galleryModal.classList.add('open');
  galleryModal.setAttribute('aria-hidden', 'false');
}

function closeGallery() {
  galleryModal.classList.remove('open');
  galleryModal.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('.marker').forEach(marker => {
  marker.addEventListener('click', () => openGallery(marker.dataset.gallery));
});

galleryModal.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) {
    closeGallery();
    return;
  }
  const item = e.target.closest('.gm-item');
  if (item) showGalleryItem(item.dataset.gallery);
});

// ─────────────────────────────────────────
// Blog 文章弹窗交互
// ─────────────────────────────────────────
const blogModal   = document.getElementById('blog-modal');
const blogTrigger = document.getElementById('blog-trigger');

function openBlog() {
  blogModal.classList.add('open');
  blogModal.setAttribute('aria-hidden', 'false');
}
function closeBlog() {
  blogModal.classList.remove('open');
  blogModal.setAttribute('aria-hidden', 'true');
}

blogTrigger.addEventListener('click', openBlog);
blogModal.addEventListener('click', (e) => {
  if (e.target.closest('[data-blog-close]')) closeBlog();
});

// ─────────────────────────────────────────
// 媒体灯箱：缩略图点击 → 放大/播放
// 视频「上一集/下一集」、图片「上一张/下一张」，各自列表循环
// Blog 与 Gallery 列表按作用域独立
// ─────────────────────────────────────────
const lightbox         = document.getElementById('lightbox');
const lightboxStage    = document.getElementById('lightbox-stage');
const lightboxPrev     = document.getElementById('lightbox-prev');
const lightboxNext     = document.getElementById('lightbox-next');
const lightboxDownload = document.getElementById('lightbox-download');
const lightboxCounter  = document.getElementById('lightbox-counter');

const allMediaItems = [...document.querySelectorAll('.media-item')];
let currentList = [];
let currentType = 'image';
let currentIndex = 0;

function buildMediaList(scopeEl, type) {
  return [...scopeEl.querySelectorAll('.media-item')]
    .filter(i => (i.dataset.mediaType === 'video' ? 'video' : 'image') === type)
    .map(i => i.dataset.mediaSrc);
}

function fileNameFromSrc(src) {
  try { return decodeURIComponent(src.split('/').pop()); }
  catch (_) { return src.split('/').pop(); }
}

function renderLightbox() {
  const list = currentList;
  if (!list || list.length === 0) return;
  const src = list[currentIndex];

  lightboxStage.innerHTML = '';
  if (currentType === 'video') {
    const v = document.createElement('video');
    v.src = src;
    v.controls = true;      // 暂停 / 进度 / 音量
    v.playsInline = true;
    v.muted = false;        // 放大观看带声音
    lightboxStage.appendChild(v);
    v.play().catch(() => {});  // 用户手势上下文中播放，允许有声
  } else {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    lightboxStage.appendChild(img);
  }

  lightboxDownload.href = src;
  lightboxDownload.setAttribute('download', fileNameFromSrc(src));

  const multi = list.length > 1;
  lightboxPrev.style.display = multi ? '' : 'none';
  lightboxNext.style.display = multi ? '' : 'none';
  lightboxCounter.textContent = multi ? `${currentIndex + 1} / ${list.length}` : '';
}

function openLightbox(item) {
  currentType = (item.dataset.mediaType === 'video') ? 'video' : 'image';
  const scope = item.closest('.blog-body, .gm-panel') || document;
  currentList = buildMediaList(scope, currentType);
  currentIndex = Math.max(0, currentList.indexOf(item.dataset.mediaSrc));
  renderLightbox();
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxStage.innerHTML = '';   // 清空以停止视频
}

function stepLightbox(delta) {
  const list = currentList;
  if (!list || list.length === 0) return;
  currentIndex = (currentIndex + delta + list.length) % list.length;
  renderLightbox();
}

allMediaItems.forEach(item => {
  item.addEventListener('click', () => openLightbox(item));
});

lightboxPrev.addEventListener('click', () => stepLightbox(-1));
lightboxNext.addEventListener('click', () => stepLightbox(1));

lightbox.addEventListener('click', (e) => {
  if (e.target.closest('[data-lightbox-close]')) closeLightbox();
});

// ─────────────────────────────────────────
// Blog 头像点击 → 放大观看（单张）
// ─────────────────────────────────────────
const blogAvatar = document.querySelector('.blog-author__avatar');
if (blogAvatar) {
  blogAvatar.style.cursor = 'zoom-in';
  blogAvatar.addEventListener('click', () => {
    currentType = 'image';
    currentList = [blogAvatar.getAttribute('src')];
    currentIndex = 0;
    renderLightbox();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  });
}

// ─────────────────────────────────────────
// 键盘：灯箱优先（Esc 关闭 / ←→ 切换）；否则 Esc 关闭其他弹窗
// ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (lightbox.classList.contains('open')) {
    if (e.key === 'Escape')          closeLightbox();
    else if (e.key === 'ArrowLeft')  stepLightbox(-1);
    else if (e.key === 'ArrowRight') stepLightbox(1);
    return;
  }
  if (e.key === 'Escape') {
    if (blogModal.classList.contains('open'))    closeBlog();
    if (galleryModal.classList.contains('open')) closeGallery();
    if (contactPopup.classList.contains('open')) closeContactPopup();
  }
});
