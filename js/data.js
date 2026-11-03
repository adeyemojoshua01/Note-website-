export const STORAGE_KEY = 'edunotes.v1';
export const FENCE = '```';
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const escapeNode = document.createElement('div');
export const e = value => { escapeNode.textContent = String(value ?? ''); return escapeNode.innerHTML; };
export const ea = value => e(value).replace(/"/g, '&#34;').replace(/'/g, '&#39;');
export const uid = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
export const localDate = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
export const slugify = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';

let state;
let storageUnavailable = false;

// --- PASTE YOUR makeSeed() FUNCTION HERE ---
export function makeSeed() {
  const now = new Date().toISOString();
  const mathContent = String.raw`An equation is a little like a balanced scale...`;
  const scienceContent = String.raw`From the tallest tree to the smallest ant...`;
  const writingContent = `A good paragraph is a little journey...`;
  
  const catalogs = [
    { id:'mathematics', title:'Mathematics', icon:'math', color:'#2563EB', description:'Find the patterns.', chapters:[
      ['Foundations of algebra', [['Solving Linear Equations','math-linear',6]]]
    ]},
    // ... Paste the rest of the catalogs, specifics, and return object from your original app.js
  ];
  // (Use your exact makeSeed function here)
}
// --------------------------------------------

try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (stored && Array.isArray(stored.courses)) {
    state = stored;
    state.progress ||= {}; state.bookmarks ||= []; state.myNotes ||= {};
    state.ui = { role:'student',theme:'system',studioSplit:.51,device:'mobile',name:'Alex Morgan',streak:{count:0,lastDate:null},lastLesson:'math-linear',...state.ui };
    for (const course of state.courses) for (const chapter of course.chapters || []) for (const lesson of chapter.lessons || []) {
      if (lesson.status === 'published' && !lesson.publishedBody) lesson.publishedBody = lesson.body;
    }
  } else state = makeSeed();
} catch { state = makeSeed(); }

export { state };

export const runtime = { homeFilter:'all',learningFilter:'all',searchIndex:0,treeOpen:{},chapterOpen:{},treeHidden:false,previewOpen:false,activeLesson:null,readerCleanup:null,saveTimer:null,toastTimer:null,previewReady:false,dragId:null,notesLesson:null,quizRegistry:{},lastFocus:null };
export const allLessons = () => state.courses.flatMap(course => [...(course.chapters || [])].sort((a,b)=>a.order-b.order).flatMap(chapter => [...(chapter.lessons || [])].sort((a,b)=>a.order-b.order).map(lesson => ({course,chapter,lesson}))));
export const findLesson = id => allLessons().find(x => x.lesson.id === id);
export const publishedLessons = () => allLessons().filter(x => x.lesson.status === 'published');
export const findChapter = id => state.courses.flatMap(course => course.chapters.map(chapter => ({course,chapter}))).find(x => x.chapter.id === id);
export const studentSource = lesson => lesson.publishedBody || lesson.body;
export const progressOf = id => state.progress[id] || {status:'new',percent:0};
export const isDark = () => state.ui.theme === 'dark' || (state.ui.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
export const currentStreak = () => {
  const now=new Date(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
  return [localDate(now),localDate(yesterday)].includes(state.ui.streak.lastDate)?state.ui.streak.count:0;
};
export const wordCount = text => parseFrontmatter(text).content.replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`$|>]/g,' ').trim().split(/\s+/).filter(Boolean).length;
export const blockCount = text => (parseFrontmatter(text).content.match(/^```\w*/gm) || []).length / 2;
export const formatTime = date => new Date(date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

export function persist(showFeedback=false) {
  clearTimeout(runtime.saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    storageUnavailable = false;
    const status = $('#studio-save-status');
    if (status) status.innerHTML = `${icon('cloud')} Saved <span class="save-time">${e(formatTime(Date.now()))}</span>`;
    return true;
  } catch {
    storageUnavailable = true;
    return false;
  }
}
export function scheduleSave() {
  clearTimeout(runtime.saveTimer);
  runtime.saveTimer = setTimeout(() => persist(),500);
}
export function applyTheme() {
  document.documentElement.dataset.theme = isDark() ? 'dark' : 'light';
  $('meta[name="theme-color"]').content = isDark() ? '#0B1220' : '#F6F8FB';
  const frame = $('#preview-frame');
  if (frame?.contentDocument?.documentElement) frame.contentDocument.documentElement.dataset.theme = document.documentElement.dataset.theme;
}
