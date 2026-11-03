import { state, runtime, $, $$, e, ea, icon, brand, slugify, uid, FENCE, allLessons, findLesson, publishedLessons, findChapter, studentSource, progressOf, isDark, currentStreak, wordCount, blockCount, formatTime, persist, scheduleSave, applyTheme } from './data.js';
import { parseFrontmatter, serializeLesson, safeHTML, mathHTML, protectMath, inlineHTML, basicMarkdown, parseQuiz, renderQuiz, renderCustomBlock, renderMarkdown } from './markdown.js';

/* =========================================================
   APP HELPERS
   ========================================================= */
const lessonTitle = (lesson,preview=false) => parseFrontmatter(preview ? lesson.body : studentSource(lesson)).meta.title || lesson.title || 'Untitled lesson';
const lessonMeta = (lesson,preview=false) => ({...lesson.frontmatter,...parseFrontmatter(preview ? lesson.body : studentSource(lesson)).meta});
const durationOf = lesson => Math.max(1,parseInt(lessonMeta(lesson).duration,10) || 5);

function toast(message, type='checkCircle') {
  clearTimeout(runtime.toastTimer);
  $('#toast-host').innerHTML = `<div class="toast">${icon(type)}<span>${e(message)}</span></div>`;
  runtime.toastTimer = setTimeout(() => { $('#toast-host').innerHTML = ''; },2500);
}

function navigate(route) {
  closePopover();
  $$('dialog[open]').forEach(dialog => dialog.close());
  if (location.hash === route) renderApp();
  else location.hash = route;
}

function ring(percent) {
  return `<svg class="progress-ring" viewBox="0 0 34 34" role="img" aria-label="${Math.round(percent)} percent complete" style="--progress:${Math.max(0,Math.min(100,percent))/100}"><circle class="ring-track" cx="17" cy="17" r="14.5" fill="none" stroke-width="3"/><circle class="ring-fill" cx="17" cy="17" r="14.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function subjectChip(course) {
  return `<span class="subject-chip subject-${ea(course.subject)}">${icon(course.icon || 'book')} ${e(course.title)}</span>`;
}

function learningStatus(status) {
  return `<span class="lesson-status ${ea(status)}" role="img" aria-label="${status === 'complete' ? 'Completed' : status === 'in-progress' ? 'In progress' : 'Not started'}">${icon(status === 'complete' ? 'checkCircle' : status === 'in-progress' ? 'progress' : 'circle')}</span>`;
}

/* =========================================================
   RENDER: STUDENT LESSON VIEW
   ========================================================= */
function hydrateMath(root) {
  $$('[data-latex]',root).forEach(node=>{
    if (!window.katex || node.dataset.rendered === 'true') return;
    try {
      katex.render(node.dataset.latex,node,{displayMode:node.dataset.display==='true',throwOnError:false,trust:false,strict:'ignore',output:'htmlAndMathml'});
      node.dataset.rendered='true';
    } catch { node.textContent=node.dataset.latex; }
  });
}

function completeButton(lessonId, preview=false) {
  const complete = !preview && progressOf(lessonId).status === 'complete';
  return `<button class="btn toc-complete mark-complete ${complete ? 'is-complete' : ''}" data-action="complete" data-lesson="${ea(lessonId)}" ${complete ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${icon(complete ? 'checkCircle' : 'check','sm')} ${complete ? 'Lesson completed' : 'Mark complete'}</button>`;
}

function renderLesson(lesson, preview=false) {
  const found = findLesson(lesson.id);
  if (!found) return '';
  const {course,chapter} = found;
  const meta = lessonMeta(lesson,preview);
  const instance = (preview?'preview':'reader')+'-'+lesson.id;
  const context = {instance,lessonId:lesson.id,preview,quizIndex:0};
  Object.keys(runtime.quizRegistry).filter(key=>key.startsWith(instance+'-quiz-')).forEach(key=>delete runtime.quizRegistry[key]);
  const rendered = renderMarkdown(parseFrontmatter(preview ? lesson.body : studentSource(lesson)).content,context);
  const siblings = publishedLessons().filter(x=>x.course.id === course.id);
  const current = siblings.findIndex(x=>x.lesson.id === lesson.id);
  const previous = current > 0 ? siblings[current-1].lesson : null;
  const next = current >= 0 && current < siblings.length-1 ? siblings[current+1].lesson : null;
  const bookmarked = !preview && state.bookmarks.includes(lesson.id);
  const completed = !preview && progressOf(lesson.id).status === 'complete';
  
  return `<article class="reader-page" data-lesson="${ea(lesson.id)}" data-preview="${preview}" data-instance="${ea(instance)}">
    <div class="reading-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
    <nav class="breadcrumbs" aria-label="Lesson breadcrumb"><button data-action="route" data-route="#/subject/${ea(course.id)}">${e(course.title)}</button>${icon('chevron')}<button data-action="route" data-route="#/subject/${ea(course.id)}">${e(chapter.title)}</button>${icon('chevron')}<span>Lesson ${lesson.order+1}</span></nav>
    <header class="lesson-header"><div class="lesson-header-top"><h1>${e(meta.title || lesson.title)}</h1><div class="lesson-header-actions"><button class="icon-btn bookmark-control ${bookmarked?'active':''}" data-action="bookmark" data-lesson="${ea(lesson.id)}" aria-label="${bookmarked?'Remove bookmark':'Bookmark lesson'}" aria-pressed="${bookmarked}" title="Bookmark lesson">${icon(bookmarked?'bookmarkFilled':'bookmark')}</button><button class="icon-btn" data-action="notes" data-lesson="${ea(lesson.id)}" aria-label="Open my notes" title="My notes">${icon('note')}</button></div></div>
      <div class="lesson-meta"><span>${icon('clock')} ${Math.max(1,parseInt(meta.duration,10)||5)} min read</span><span>Grade ${e(meta.grade || 8)}</span><span class="difficulty">${icon('leaf')} ${e(meta.difficulty || 'Easy')}</span><span class="complete-label" ${completed?'':'hidden'}>${icon('checkCircle')} Completed</span></div>
    </header>
    <div class="reader-layout"><div class="lesson-body" id="${ea(instance)}-body" tabindex="-1">${rendered.html}</div>
      <aside class="lesson-toc" aria-label="On this page"><div class="toc-label">ON THIS PAGE</div><nav class="toc-links">${rendered.headings.map((heading,i)=>`<button class="toc-link ${i===0?'active':''}" data-action="scroll-section" data-section="${ea(heading.id)}">${e(heading.title)}</button>`).join('')}</nav>${completeButton(lesson.id,preview)}</aside>
    </div>
    <div class="mobile-reader-actions">${completeButton(lesson.id,preview)}</div>
    <footer class="reader-footer">${previous?`<button class="lesson-nav previous" data-action="route" data-route="#/lesson/${ea(previous.id)}">${icon('arrowLeft')}<span><small>Previous lesson</small><strong>${e(lessonTitle(previous))}</strong></span></button>`:''}${next?`<button class="lesson-nav next" data-action="route" data-route="#/lesson/${ea(next.id)}"><span><small>Next lesson</small><strong>${e(lessonTitle(next))}</strong></span>${icon('arrow')}</button>`:''}</footer>
  </article>`;
}

/* =========================================================
   RENDER: STUDIO (The Markdown Editor)
   ========================================================= */
const currentStudio = () => findLesson(runtime.activeLesson);

function studioStatus(lesson) {
  if (!lesson) return {label:'No lesson selected',published:false};
  if (lesson.status==='draft') return {label:'Draft',published:false};
  if (lesson.body!==lesson.publishedBody) return {label:'Unpublished changes',published:false};
  return {label:'Published v'+(lesson.version||1),published:true};
}

function metadataChips(lesson,course) {
  const meta=lessonMeta(lesson,true);
  const tags=Array.isArray(meta.tags)?meta.tags:String(meta.tags||'').split(',').filter(Boolean);
  return `<button class="meta-chip subject-chip subject-${ea(course.subject)}" data-action="edit-meta" data-key="subject">${icon(course.icon||'book')} ${e(course.title)}</button>
    <button class="meta-chip" data-action="edit-meta" data-key="grade">Grade ${e(meta.grade||8)}</button>
    <button class="meta-chip" data-action="edit-meta" data-key="difficulty">${icon('leaf')} ${e(meta.difficulty||'Easy')}</button>
    <button class="meta-chip" data-action="edit-meta" data-key="duration">${icon('clock')} ${e(meta.duration||5)} min</button>`;
}

function courseTreeHTML() {
  const selected=currentStudio();
  return state.courses.map(course=>{
    const open=runtime.treeOpen[course.id] ?? selected?.course.id===course.id;
    return `<div class="tree-course subject-${ea(course.subject)}"><button class="tree-course-toggle" data-action="tree-course" data-course="${ea(course.id)}" aria-expanded="${open}">${icon(open?'down':'chevron')}${icon(course.icon||'book')}<span>${e(course.title)}</span></button><div ${open?'':'hidden'}>
      ${[...course.chapters].sort((a,b)=>a.order-b.order).map(chapter=>{
        const chapterOpen=runtime.treeOpen[chapter.id] ?? selected?.chapter.id===chapter.id;
        return `<div class="tree-chapter"><div class="tree-chapter-heading"><button class="tree-chapter-toggle" data-action="tree-chapter" data-chapter="${ea(chapter.id)}" aria-expanded="${chapterOpen}">${icon(chapterOpen?'down':'chevron')}<span>${e(chapter.title)}</span></button></div>
          <div ${chapterOpen?'':'hidden'}>${[...chapter.lessons].sort((a,b)=>a.order-b.order).map(lesson=>`<div class="tree-lesson ${lesson.id===runtime.activeLesson?'active':''}" data-lesson="${ea(lesson.id)}" data-chapter="${ea(chapter.id)}"><button class="tree-lesson-link" data-action="route" data-route="#/studio/${ea(lesson.id)}" ${lesson.id===runtime.activeLesson?'aria-current="page"':''}><span class="status-dot ${lesson.status==='draft'||lesson.body!==lesson.publishedBody?'draft':''}"></span><span>${e(lessonTitle(lesson,true))}</span></button></div>`).join('')}<button class="tree-new-lesson" data-action="new-lesson" data-chapter="${ea(chapter.id)}">${icon('plus','sm')} Add lesson</button></div>
        </div>`;
      }).join('')}
      <div class="tree-course-actions"><button data-action="new-chapter" data-course="${ea(course.id)}">${icon('plus','sm')} New chapter</button></div>
    </div></div>`;
  }).join('');
}

function studioHTML(lesson) {
  const found=lesson?findLesson(lesson.id):null;
  const status=studioStatus(lesson);
  const device=state.ui.device||'mobile';
  return `<div class="studio-shell"><header class="studio-topbar"><button class="studio-library" data-action="route" data-route="#/library">${icon('arrowLeft','sm')}${brand(true)}<span>Library</span></button><span class="topbar-divider"></span><span class="studio-chapter-label" id="studio-chapter-label">Chapter: <strong>${e(found?.chapter.title || 'Your next idea')}</strong></span>${lesson?`<button class="studio-status ${status.published?'published':''}" id="studio-status" data-action="status-menu"><span class="status-dot"></span><span>${e(status.label)}</span>${icon('down','sm')}</button>`:''}<div class="studio-topbar-actions"><button class="icon-btn studio-theme" data-action="theme">${icon(isDark()?'sun':'moon')}</button><div class="role-switch"><button data-action="student">${icon('book')} Student</button><button class="active" data-action="studio">${icon('edit')} Studio</button></div></div></header>
    <div class="studio-main"><aside class="studio-tree" id="studio-tree"><div class="tree-heading"><h2 class="eyebrow">COURSE OUTLINE</h2></div><div class="tree-scroll" id="course-tree-content">${courseTreeHTML()}</div></aside>
    <div class="studio-workspace" id="studio-workspace" style="--studio-split:${Number(state.ui.studioSplit)||.51}">${lesson?`
      <section class="editor-pane" aria-label="Lesson editor"><div class="editor-heading"><div class="editor-heading-label"><span class="eyebrow">YOUR NEXT GREAT LESSON</span></div><label class="sr-only" for="lesson-title-input">Lesson title</label><input class="lesson-title-input" id="lesson-title-input" type="text" value="${ea(lessonTitle(lesson,true))}" placeholder="Give your lesson a title"><div class="metadata-chips" id="metadata-chips">${metadataChips(lesson,found.course)}</div></div>
        <!-- THIS IS WHERE YOU EDIT MARKDOWN NOTES -->
        <label class="sr-only" for="markdown-editor">Raw lesson markdown and frontmatter</label>
        <textarea class="editor-textarea" id="markdown-editor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-describedby="validation-bar" placeholder="A new idea starts here..."></textarea>
      </section><div class="split-handle" id="split-handle" role="separator" tabindex="0"></div>
      <section class="preview-pane" aria-label="Live student page preview"><div class="preview-toolbar"><span class="preview-label"><span class="status-dot"></span> LIVE PREVIEW</span></div><div class="preview-viewport"><div class="device-frame" id="device-frame" data-device="${device}"><div class="device-chrome"><i></i><i></i><i></i><span>edunotes / your lesson</span></div><iframe id="preview-frame" title="Exact student-facing lesson preview"></iframe></div></div></section>
    `:`<section class="editor-pane" style="flex:1"><div class="empty-state">${icon('edit')}<h2>A fresh page, endless possibilities.</h2><p>Choose a lesson from the outline, or create a chapter to begin.</p></div></section>`}</div></div>
    <footer class="studio-footer"><span class="studio-wordcount" id="studio-wordcount">${lesson?wordCount(lesson.body):0} words</span><span class="studio-save-status" id="studio-save-status">${icon('cloud')} Saved locally</span><div class="studio-footer-actions"><button class="btn" data-action="save-draft" ${lesson?'':'disabled'}>Save draft</button><button class="btn btn-primary" data-action="publish" ${lesson?'':'disabled'}>${icon('send','sm')} Publish lesson</button></div></footer>
  </div>`;
}

function initializeStudio(lesson) {
  if (!lesson) return;
  const editor=$('#markdown-editor');
  if(!editor) return;
  
  editor.value=lesson.body;
  editor.addEventListener('input',()=>updateStudioFromRaw(editor.value));
  
  const titleInput = $('#lesson-title-input');
  if(titleInput) {
    titleInput.addEventListener('input',event=>{
      const parsed=parseFrontmatter(editor.value);
      parsed.meta.title=event.target.value;
      editor.value=serializeLesson(parsed.meta,parsed.content);
      updateStudioFromRaw(editor.value);
    });
  }
  
  const frame=$('#preview-frame');
  runtime.previewReady=false;
  if (frame) {
    frame.addEventListener('load',()=>{runtime.previewReady=true;renderPreview();});
    frame.src = 'studio/editor.html';
  }
}

function updateStudioFromRaw(raw) {
  const found=currentStudio();
  if(!found) return;
  const lesson=found.lesson;
  lesson.body=raw;
  const parsed=parseFrontmatter(raw);
  lesson.title=parsed.meta.title || 'Untitled lesson';
  lesson.frontmatter={...lesson.frontmatter,...parsed.meta};
  lesson.updatedAt=new Date().toISOString();
  
  renderPreview();
  const status=$('#studio-save-status');
  if(status) status.innerHTML=`${icon('clock')} Saving...`;
  scheduleSave();
}

function renderPreview() {
  const frame=$('#preview-frame');
  const found=currentStudio();
  if (!frame || !found || !runtime.previewReady) return;
  const root=frame.contentDocument?.getElementById('preview-root');
  if (!root) return;
  
  if (frame.contentDocument && !frame.contentDocument.getElementById('app-styles')) {
    const style = frame.contentDocument.createElement('style');
    style.id = 'app-styles';
    style.textContent = Array.from(document.styleSheets).map(sheet => {
      try { return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); } catch(e) { return ''; }
    }).join('\n');
    frame.contentDocument.head.appendChild(style);
    frame.contentDocument.documentElement.dataset.theme = document.documentElement.dataset.theme;
  }

  root.innerHTML=renderLesson(found.lesson,true);
}

/* =========================================================
   UI RENDERERS (Library / Sidebar)
   ========================================================= */
function sidebarHTML(view,subjectId) {
  const name=state.ui.name || 'Alex Morgan';
  return `<aside class="sidebar"><button class="brand" data-action="route" data-route="#/library">${brand()}</button>
    <nav class="sidebar-nav"><p class="nav-label">YOUR WORKSPACE</p>
      <button class="nav-item ${['library','subject','lesson'].includes(view)?'active':''}" data-action="route" data-route="#/library">${icon('library')} Library</button>
    </nav>
    <nav class="subject-nav" aria-label="Subjects"><p class="nav-label">YOUR SUBJECTS</p>${state.courses.map(course=>`<button class="nav-item subject-${ea(course.subject)} ${subjectId===course.id?'active':''}" data-action="route" data-route="#/subject/${ea(course.id)}">${icon(course.icon || 'book')} ${e(course.title)}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><button class="profile-button" data-action="profile"><span class="avatar">AM</span><span><span class="profile-name">${e(name)}</span></span></button></div>
  </aside>`;
}

function topbarHTML(view,subjectId) {
  const course=state.courses.find(course=>course.id===subjectId);
  return `<header class="topbar"><div class="topbar-breadcrumb">${view==='lesson'?`<button class="reader-brand" data-action="route" data-route="#/library">${brand()}</button>`:`${icon('book')}<span class="slash">/</span><span>${e(view)}</span>`}</div>
    <div class="header-actions"><div class="role-switch" aria-label="Switch learning role"><button class="active" data-action="student">${icon('book')} Student</button><button data-action="studio">${icon('edit')} Studio</button></div></div>
  </header>`;
}

function libraryHTML() {
  return `<div class="content"><section class="welcome"><h1>Welcome back</h1></section>
    <div class="subject-grid">${state.courses.map(c=>`<button class="subject-card subject-${ea(c.subject)}" data-action="route" data-route="#/subject/${ea(c.id)}"><h3>${e(c.title)}</h3></button>`).join('')}</div>
  </div>`;
}

function subjectHTML(id) {
  const course=state.courses.find(item=>item.id===id);
  return `<div class="content subject-${ea(course.subject)}"><h1>${e(course.title)}</h1></div>`;
}
function missingHTML(msg){ return `<div class="content"><p>${e(msg)}</p></div>`; }

/* =========================================================
   ROUTER & EVENTS
   ========================================================= */
function renderApp() {
  $$('dialog[open]').forEach(dialog=>dialog.close());
  const route=location.hash && location.hash!=='#main'?location.hash:'#/library';
  const [path]=route.replace(/^#\/?/,'').split('?');
  let [view,id]=path.split('/');
  
  if(view==='studio') {
    document.body.classList.add('studio-active');
    const found=findLesson(id) || allLessons()[0];
    runtime.activeLesson=found?.lesson.id || null;
    $('#app').innerHTML=studioHTML(found?.lesson);
    initializeStudio(found?.lesson);
  } else {
    document.body.classList.remove('studio-active');
    const found=view==='lesson'?findLesson(id):null;
    let content = view==='library'?libraryHTML() : view==='subject'?subjectHTML(id) : view==='lesson'?renderLesson(found.lesson) : missingHTML('Not found');
    $('#app').innerHTML=`${sidebarHTML(view, id)}<div class="workspace">${topbarHTML(view, id)}<main id="main">${content}</main></div>`;
  }
  applyTheme();
}

function handleGlobalClick(event) {
  const control=event.target.closest('[data-action]');
  if(!control) return;
  const action=control.dataset.action;
  if(action==='route') navigate(control.dataset.route);
  else if(action==='student') navigate('#/library');
  else if(action==='studio') navigate('#/studio/'+runtime.activeLesson);
  else if(action==='theme') { state.ui.theme=isDark()?'light':'dark'; applyTheme(); }
}

function boot() {
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('hashchange', renderApp);
  renderApp();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
