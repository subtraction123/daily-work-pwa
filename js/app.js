/* ========== Daily Work App ========== */

// ---- State ----
let moduleData = null;
let currentModule = null;
let currentArticle = null;
let currentInspTab = 'text';
let currentFullInspTab = 'text';
let inspFilter = 'all';
let calendarDate = new Date();

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  updateStatusBar();
  setGreeting();
  await loadModules();
  renderSidebar();
  renderCalendar();
  loadPlans();
  loadInspirations();
  updateStats();
});

// ---- Status Bar & Header ----
function updateStatusBar() {
  const now = new Date();
  document.getElementById('statusTime').textContent = 
    now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  
  const days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  document.getElementById('headerDate').textContent = 
    `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${days[now.getDay()]}`;
}

function setGreeting() {
  const h = new Date().getHours();
  let g = '早上好';
  if (h >= 12 && h < 18) g = '下午好';
  else if (h >= 18) g = '晚上好';
  document.getElementById('greetingText').textContent = g;
}

// ---- Data Loading ----
async function loadModules() {
  try {
    const res = await fetch('./data/modules.json');
    moduleData = await res.json();
  } catch(e) {
    console.error('Failed to load modules:', e);
    moduleData = { modules: {} };
  }
}

// ---- Navigation ----
let navHistory = ['home'];

function navigateTo(screen, pushHistory = true) {
  // Save scroll position
  const mainContent = document.getElementById('mainContent');
  
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  
  // Show target
  const target = document.getElementById('screen-' + screen);
  if (target) target.classList.add('active');
  
  // Scroll to top
  mainContent.scrollTop = 0;
  
  // Update bottom nav
  document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.bottom-nav .nav-btn[data-screen="${screen}"]`);
  if (navBtn) navBtn.classList.add('active');
  
  // Track history
  if (pushHistory) navHistory.push(screen);
  
  // Render content based on screen
  if (screen === 'home') renderHome();
  if (screen === 'inspiration') renderFullInspirations();
  
  currentScreen = screen;
}

let currentScreen = 'home';

function goBack() {
  if (navHistory.length <= 1) return;
  navHistory.pop(); // Remove current
  const prev = navHistory[navHistory.length - 1];
  navigateTo(prev, false);
}

function renderHome() {
  updateStats();
  setGreeting();
  updateStatusBar();
}

// ---- Calendar ----
function renderCalendar() {
  const container = document.getElementById('calendarDays');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  
  document.getElementById('calendarMonth').textContent = `${year}年${month+1}月`;
  
  // First day of month and last day
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month+1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();
  
  const today = new Date();
  let html = '';
  
  // Previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="calendar-day other-month">${prevLastDate - i}</div>`;
  }
  
  // Current month
  for (let d = 1; d <= lastDate; d++) {
    const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
    const cls = ['calendar-day'];
    if (isToday) cls.push('today');
    if (hasPlanForDate(year, month+1, d)) cls.push('has-plan');
    html += `<div class="${cls.join(' ')}" onclick="selectDate(${year},${month+1},${d})">${d}</div>`;
  }
  
  // Next month
  const remaining = 42 - (firstDay + lastDate);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-day other-month">${i}</div>`;
  }
  
  container.innerHTML = html;
}

function changeMonth(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta);
  renderCalendar();
}

function selectDate(y, m, d) {
  calendarDate = new Date(y, m-1, d);
  renderCalendar();
}

function hasPlanForDate(y, m, d) {
  const plans = getPlans();
  const key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return plans.some(p => p.date === key && !p.done);
}

// ---- Daily Plan (LocalStorage) ----
function getPlans() {
  try {
    return JSON.parse(localStorage.getItem('dw_plans') || '[]');
  } catch { return []; }
}

function savePlans(plans) {
  localStorage.setItem('dw_plans', JSON.stringify(plans));
}

function loadPlans() {
  const plans = getPlans();
  const today = getTodayKey();
  const todayPlans = plans.filter(p => p.date === today);
  renderPlans(todayPlans);
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function renderPlans(todayPlans) {
  const container = document.getElementById('planList');
  if (todayPlans.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-text">还没有今日计划，快来添加吧 ✨</div></div>';
    document.getElementById('planCount').textContent = '0项';
    return;
  }
  
  container.innerHTML = todayPlans.map((p, i) => `
    <div class="plan-item ${p.done ? 'done' : ''}" data-index="${i}">
      <div class="plan-checkbox ${p.done ? 'checked' : ''}" onclick="togglePlan(${i})"></div>
      <span class="plan-text">${escapeHtml(p.text)}</span>
      <button class="plan-delete" onclick="deletePlan(${i})">×</button>
    </div>
  `).join('');
  
  document.getElementById('planCount').textContent = `${todayPlans.length}项`;
}

function addPlan() {
  const input = document.getElementById('planInput');
  const text = input.value.trim();
  if (!text) return;
  
  const plans = getPlans();
  const today = getTodayKey();
  plans.unshift({ date: today, text, done: false, time: new Date().toISOString() });
  savePlans(plans);
  
  input.value = '';
  loadPlans();
  updateStats();
  showToast('计划已添加 ✓');
}

function togglePlan(index) {
  const plans = getPlans();
  const today = getTodayKey();
  const todayPlans = plans.filter(p => p.date === today);
  if (index >= todayPlans.length) return;
  
  todayPlans[index].done = !todayPlans[index].done;
  
  // Merge back
  const otherPlans = plans.filter(p => p.date !== today);
  savePlans([...otherPlans, ...todayPlans]);
  loadPlans();
  updateStats();
}

function deletePlan(index) {
  const plans = getPlans();
  const today = getTodayKey();
  const todayPlans = plans.filter(p => p.date === today);
  if (index >= todayPlans.length) return;
  
  todayPlans.splice(index, 1);
  const otherPlans = plans.filter(p => p.date !== today);
  savePlans([...otherPlans, ...todayPlans]);
  loadPlans();
  updateStats();
}

// Plan input - Enter key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement === document.getElementById('planInput')) {
    addPlan();
  }
});

// ---- Inspiration (LocalStorage) ----
function getInspirations() {
  try {
    return JSON.parse(localStorage.getItem('dw_inspirations') || '[]');
  } catch { return []; }
}

function saveInspirations(items) {
  localStorage.setItem('dw_inspirations', JSON.stringify(items));
}

function loadInspirations() {
  // Just update count
  const items = getInspirations();
  document.getElementById('statInspirations').textContent = items.length;
}

function switchInspTab(type, btn) {
  currentInspTab = type;
  document.querySelectorAll('#screen-home .inspiration-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  
  document.getElementById('inspTextArea').style.display = type === 'text' ? '' : 'none';
  document.getElementById('inspVoiceArea').style.display = type === 'voice' ? '' : 'none';
  document.getElementById('inspUrlArea').style.display = type === 'url' ? '' : 'none';
}

function switchFullInspTab(type, btn) {
  currentFullInspTab = type;
  document.querySelectorAll('#screen-inspiration .inspiration-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  
  document.getElementById('fullInspTextArea').style.display = type === 'text' ? '' : 'none';
  document.getElementById('fullInspVoiceArea').style.display = type === 'voice' ? '' : 'none';
  document.getElementById('fullInspUrlArea').style.display = type === 'url' ? '' : 'none';
}

// Character count for inspiration textarea
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('inspTextInput');
  if (textarea) {
    textarea.addEventListener('input', () => {
      document.getElementById('inspCharCount').textContent = `${textarea.value.length}/500`;
    });
  }
});

function saveInspiration() {
  const tab = currentInspTab;
  let content = '';
  
  if (tab === 'text') {
    content = document.getElementById('inspTextInput').value.trim();
    if (!content) { showToast('请输入内容'); return; }
    document.getElementById('inspTextInput').value = '';
    document.getElementById('inspCharCount').textContent = '0/500';
  } else if (tab === 'voice') {
    content = '[语音记录] ' + (document.getElementById('voiceStatus').textContent || '录音');
    document.getElementById('voiceStatus').textContent = '';
  } else if (tab === 'url') {
    content = document.getElementById('inspUrlInput').value.trim();
    if (!content) { showToast('请输入网址'); return; }
    document.getElementById('inspUrlInput').value = '';
  }
  
  const items = getInspirations();
  items.unshift({
    type: tab,
    content,
    time: new Date().toISOString()
  });
  saveInspirations(items);
  loadInspirations();
  updateStats();
  showToast('灵感已保存 💡');
}

function saveFullInspiration() {
  const tab = currentFullInspTab;
  let content = '';
  
  if (tab === 'text') {
    content = document.getElementById('fullInspTextInput').value.trim();
    if (!content) { showToast('请输入内容'); return; }
    document.getElementById('fullInspTextInput').value = '';
  } else if (tab === 'voice') {
    content = '[语音记录] ' + (document.getElementById('fullVoiceStatus').textContent || '录音');
    document.getElementById('fullVoiceStatus').textContent = '';
  } else if (tab === 'url') {
    content = document.getElementById('fullInspUrlInput').value.trim();
    if (!content) { showToast('请输入网址'); return; }
    document.getElementById('fullInspUrlInput').value = '';
  }
  
  const items = getInspirations();
  items.unshift({ type: tab, content, time: new Date().toISOString() });
  saveInspirations(items);
  loadInspirations();
  updateStats();
  renderFullInspirations();
  showToast('灵感已保存 💡');
}

function deleteInspiration(index) {
  const items = getInspirations();
  items.splice(index, 1);
  saveInspirations(items);
  loadInspirations();
  updateStats();
  renderFullInspirations();
  showToast('已删除');
}

function filterInspirations(type, btn) {
  inspFilter = type;
  document.querySelectorAll('.inspiration-filter .filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderFullInspirations();
}

function renderFullInspirations() {
  const container = document.getElementById('fullInspList');
  let items = getInspirations();
  
  if (inspFilter !== 'all') {
    items = items.filter(i => i.type === inspFilter);
  }
  
  document.getElementById('inspTotalCount').textContent = `共 ${items.length} 条`;
  
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">还没有灵感记录</div></div>';
    return;
  }
  
  container.innerHTML = items.map((item, i) => {
    const date = new Date(item.time);
    const timeStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    const typeClass = 'type-' + item.type;
    const typeLabel = { text: '文字', voice: '语音', url: '网址' }[item.type];
    
    let displayContent = item.content;
    if (item.type === 'url') {
      displayContent = `<a href="${escapeHtml(item.content)}" target="_blank" style="color:var(--brand);word-break:break-all">${escapeHtml(item.content)}</a>`;
    } else {
      displayContent = escapeHtml(item.content);
    }
    
    return `
      <div class="inspiration-item">
        <button class="inspiration-delete" onclick="deleteInspiration(${i})">×</button>
        <span class="inspiration-type ${typeClass}">${typeLabel}</span>
        <div class="inspiration-time">${timeStr}</div>
        <div class="inspiration-body">${displayContent}</div>
      </div>
    `;
  }).join('');
}

// ---- Sidebar Nav ----
function renderSidebar() {
  if (!moduleData) return;
  
  const modules = moduleData.modules;
  const container = document.getElementById('sidebarNav');
  
  const entries = Object.entries(modules);
  container.innerHTML = entries.map(([key, mod]) => {
    // Short 2-char label for sidebar
    const labelMap = {
      'digital-news': '数字',
      'industry-analysis': '行业',
      'ai-learning': '智能',
      'english-learning': '英语',
      'finance-learning': '理财',
      'tech-infra': '技术',
      'biz-insight': '业务',
      'overseas-vision': '海外',
      'project-management': '项目'
    };
    const label = labelMap[key] || mod.title.substring(0, 2);
    
    return `
      <button class="sidebar-nav-item" onclick="openModule('${key}')" aria-label="${mod.title}">
        <span class="ind" style="background:${mod.color}"></span>
        <span class="label">${label}</span>
      </button>
    `;
  }).join('');
}

// ---- Module Detail ----
function openModule(key) {
  if (!moduleData) return;
  const mod = moduleData.modules[key];
  if (!mod) return;
  
  currentModule = key;
  
  document.getElementById('moduleDetailName').textContent = mod.title;
  document.getElementById('moduleDetailSub').textContent = mod.desc;
  
  // Special: English module shows audio player first
  let listHtml = '';
  
  if (key === 'english-learning') {
    listHtml = `
      <div class="audio-player" style="margin-bottom:16px">
        <button class="audio-play-btn" id="audioPlayBtn" onclick="toggleBBCAudio()">▶</button>
        <div class="audio-info">
          <div class="audio-title">BBC World News - 今日听力</div>
          <div class="audio-source">每日更新 · 练习英语听力</div>
          <div class="audio-progress"><div class="audio-progress-bar" id="audioProgress"></div></div>
        </div>
      </div>
    `;
  }
  
  listHtml += mod.articles.map(a => `
    <div class="article-card" onclick="openArticle('${key}', '${a.id}')">
      <span class="article-source ${getSourceClass(key)}">${a.source}</span>
      <div class="article-title">${a.title}</div>
      <div class="article-summary">${a.summary}</div>
      <div class="article-meta">
        <span>📅 ${a.time}</span>
        <span>👆 点击查看详情</span>
      </div>
    </div>
  `).join('');
  
  document.getElementById('articleList').innerHTML = listHtml;
  
  navigateTo('module');
}

function getSourceClass(key) {
  const map = {
    'digital-news': 'digital',
    'industry-analysis': 'industry',
    'ai-learning': 'ai',
    'english-learning': 'english',
    'finance-learning': 'finance',
    'tech-infra': 'tech',
    'biz-insight': 'biz',
    'overseas-vision': 'overseas',
    'project-management': 'pm'
  };
  return map[key] || '';
}

function openArticle(moduleKey, articleId) {
  if (!moduleData) return;
  const mod = moduleData.modules[moduleKey];
  if (!mod) return;
  const article = mod.articles.find(a => a.id === articleId);
  if (!article) return;
  
  currentArticle = article;
  
  document.getElementById('articleDetailTitle').textContent = article.title;
  document.getElementById('articleDetailMeta').textContent = `${article.source} · ${article.time}`;
  
  // Render content as markdown-like HTML
  const content = article.content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\*\*(.+)\*\*$/gm, '<p><strong>$1</strong></p>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\|(.+)\|/g, (match) => {
      if (match.includes('---')) return '';
      return match;
    })
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '<p>')
    .replace(/(?<!>)$/gm, '</p>')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // If English module, add vocabulary section
  let extraHtml = '';
  if (moduleKey === 'english-learning') {
    extraHtml = `
      <div class="audio-player" style="margin-bottom:16px">
        <button class="audio-play-btn" id="articleAudioBtn" onclick="toggleBBCAudio()">▶</button>
        <div class="audio-info">
          <div class="audio-title">播放 BBC 听力</div>
          <div class="audio-source">${article.source}</div>
          <div class="audio-progress"><div class="audio-progress-bar" id="articleAudioProgress"></div></div>
        </div>
      </div>
    `;
  }
  
  document.getElementById('articleDetailContent').innerHTML = extraHtml + `<div style="white-space: pre-wrap;font-size:14px;line-height:1.8">${article.content}</div>`;
  
  navigateTo('article');
}

// ---- Stats ----
function updateStats() {
  const plans = getPlans().filter(p => p.date === getTodayKey());
  document.getElementById('statTasks').textContent = plans.length;
  document.getElementById('statInspirations').textContent = getInspirations().length;
}

// ---- Toast ----
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.animation = 'none';
  toast.offsetHeight; // reflow
  toast.style.animation = 'toastIn 0.3s ease, toastOut 0.3s ease 2s forwards';
  setTimeout(() => { toast.style.display = 'none'; }, 2300);
}

// ---- Utilities ----
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
