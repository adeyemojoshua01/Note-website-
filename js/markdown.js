import { e, ea, FENCE, slugify, runtime, progressOf, state, scheduleSave } from './data.js';
import { icon } from './icons.js';

export function parseFrontmatter(raw) {
  const normalized = String(raw || '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^\uFEFF?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { meta: {}, content: normalized };
  const meta = {};
  let listKey = null;
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([\w-]+):\s*(.*)$/);
    if (field) {
      const key = field[1];
      let value = field[2].trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        try { value = JSON.parse(value); } catch { value = value.slice(1, -1).split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean); }
      } else if (value.startsWith('"')) {
        try { value = JSON.parse(value); } catch { value = value.replace(/^"|"$/g, ''); }
      } else { value = value.replace(/^'|'$/g, ''); }
      meta[key] = value;
      listKey = value === '' ? key : null;
    } else if (listKey && /^\s+-\s/.test(line)) {
      if (!Array.isArray(meta[listKey])) meta[listKey] = [];
      meta[listKey].push(line.replace(/^\s+-\s*/, '').replace(/^['"]|['"]$/g, ''));
    }
  }
  return { meta, content: normalized.slice(match[0].length).replace(/^\n/, '') };
}

export function serializeLesson(meta, content) {
  const fields = Object.entries(meta).map(([key, value]) => {
    const output = Array.isArray(value) ? JSON.stringify(value) : (/[\n:#"']/.test(String(value)) ? JSON.stringify(String(value)) : String(value));
    return `${key}: ${output}`;
  });
  return `---\n${fields.join('\n')}\n---\n\n${content}`;
}

export function safeHTML(html) {
  if (window.DOMPurify) return DOMPurify.sanitize(html, {
    ALLOWED_TAGS:['a','blockquote','br','code','del','div','em','h1','h2','h3','h4','h5','h6','hr','img','input','li','ol','p','pre','span','strong','table','thead','tbody','td','th','tr','ul'],
    ALLOWED_ATTR:['href','src','alt','title','class','type','checked','disabled','role','aria-label','data-latex','data-display','data-edunotes-block'],
    ALLOW_DATA_ATTR:false
  });
  return html; // Fallback
}

export function mathHTML(latex, display=false) {
  const tag = display ? 'div' : 'span';
  return `<${tag} class="${display ? 'math-display' : 'math-inline'}" data-latex="${ea(latex.trim())}" data-display="${display}" role="math" aria-label="${ea(latex.trim())}">${e(latex.trim())}</${tag}>`;
}

export function protectMath(source) {
  return source.split(/(`[^`\n]*`)/g).map((part,index) => index % 2 ? part : part.replace(/\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g, (_,display,inline) => display ? '\n\n' + mathHTML(display,true) + '\n\n' : mathHTML(inline,false))).join('');
}

export function inlineHTML(text) {
  const source = protectMath(String(text || ''));
  return safeHTML(window.marked ? marked.parseInline(source) : '');
}

export function basicMarkdown(text) {
  const source = protectMath(String(text || ''));
  return safeHTML(window.marked ? marked.parse(source,{gfm:true}) : '');
}

export function parseQuiz(raw) {
  // (Paste your parseQuiz function here)
}

export function renderQuiz(raw, context) {
  // (Paste your renderQuiz function here)
}

export function renderCustomBlock(type, raw, context) {
  // (Paste your renderCustomBlock function here)
}

export function renderMarkdown(source, context) {
  // (Paste your renderMarkdown function here)
}
