// public/projects/과제 리스트.txt 를 읽어 좌측 트리를 만들고, 각 과제의 html.txt 를 화면용 HTML 로 바꾼다.
//
// 과제 리스트.txt 형식 (들여쓰기로 단계 구분, 앞의 '-', '└' 표시는 무시)
//   - 관수 자동화 소개
//   - 프로젝트
//         └ 2027 년도
//             └ 전남 장성 앞밭 : ./2027/전남 장성 앞밭/html.txt
//             └ 테스트
//   ' : ' 뒤에 상세 내용 파일(html.txt) 경로나 http(s) 주소(블로그 등)를 적는다. 경로는 리스트 파일 기준.
//   하위 항목이 있으면 폴더, 없으면 내용 페이지. 상세 파일이 없으면 화면에 '작업 중' 으로 표시한다.

import type { TreeNode } from './smartFarm';

export interface FileNode extends TreeNode {
  /** 상세 내용 파일(html.txt)의 주소 */
  file?: string;
  /** 다른 사이트를 그대로 보여 줄 주소 */
  url?: string;
}

/** public 폴더 안 파일의 전체 주소 (예: 'etc/menu.txt') */
export const publicUrl = (path: string) =>
  new URL(encodeURI(`${import.meta.env.BASE_URL}${path}`), window.location.origin).toString();

/** 텍스트 파일 읽기. 없는 파일이면 오류 */
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-cache' });
  // 개발 서버는 없는 파일에도 index.html 을 돌려주므로 HTML 문서면 '없음' 으로 본다
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.includes('text/html')) throw new Error(`파일을 찾을 수 없습니다: ${decodeURI(url)}`);
  return res.text();
}

const MARKERS = /^[\s\-–—*•└├│ㄴ┗┣]+/;

export function parseProjectList(text: string, listUrl: string): FileNode[] {
  const nodes: FileNode[] = [];
  const stack: { indent: number; node: FileNode }[] = [];
  const usedIds = new Set<string>();
  const order = new Map<string | null, number>();

  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const expanded = raw.replace(/\t/g, '    ');
    const indent = expanded.length - expanded.trimStart().length;
    let body = expanded.trimStart().replace(MARKERS, '').trim();
    if (!body) continue;

    // "이름 : 경로" (이름 안의 ':' 는 그대로 두고, 마지막 ' : ' 뒤가 경로/주소)
    let target: string | undefined;
    const m = body.match(/^(.*?)\s+:\s+(\S.*)$/) ?? body.match(/^(.*?)\s*:\s*((?:\.{0,2}\/|https?:\/\/)\S.*)$/);
    if (m) {
      body = m[1].trim();
      target = m[2].trim();
    }

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : null;

    const base = parent ? `${parent.id}/${body}` : body;
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base} (${n})`;
    usedIds.add(id);

    const parentId = parent ? parent.id : null;
    const sort = order.get(parentId) ?? 0;
    order.set(parentId, sort + 1);

    const node: FileNode = { id, parent_id: parentId, node_type: 'page', label: body, sort_order: sort };
    if (target) {
      if (/^https?:\/\//i.test(target)) node.url = target;
      else node.file = new URL(encodeURI(target), listUrl).toString();
    }
    if (parent) parent.node_type = 'folder';
    nodes.push(node);
    stack.push({ indent, node });
  }
  return nodes;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const BLOCK_TAGS = /<(p|div|h[1-6]|ul|ol|li|table|section|article|figure|blockquote|pre|br|hr)\b/i;

/**
 * html.txt 내용을 화면용 HTML 로.
 * - 문단 태그(<p>, <div>, <h1> …)를 쓴 파일은 그대로 사용
 * - 아니면 한 줄씩: 태그로 시작하는 줄은 그대로, 주소만 있는 줄은 링크, 나머지 글은 문단(<p>)
 * - 스크립트·이벤트 속성(onclick 등)·javascript: 주소는 지우고, 상대 경로 이미지·링크는 html.txt 위치 기준으로 바꾼다
 */
export function htmlFromText(text: string, fileUrl: string): string {
  const src = text.replace(/^\uFEFF/, '');
  const html = BLOCK_TAGS.test(src)
    ? src
    : src.split(/\r?\n/).map(line => {
        const t = line.trim();
        if (!t) return '';
        if (t.startsWith('<')) return t;
        if (/^https?:\/\/\S+$/i.test(t)) {
          return `<p><a href="${escapeHtml(t)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t)}</a></p>`;
        }
        return `<p>${escapeHtml(t)}</p>`;
      }).join('\n');
  return sanitize(html, fileUrl);
}

function sanitize(html: string, baseUrl: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.querySelectorAll('script, object, embed, base, meta, link').forEach(el => el.remove());
  doc.body.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) { el.removeAttribute(attr.name); continue; }
      if (name === 'src' || name === 'href') {
        const value = attr.value.trim();
        if (/^\s*(javascript|vbscript|data):/i.test(value) && !(name === 'src' && /^data:image\//i.test(value))) {
          el.removeAttribute(attr.name);
          continue;
        }
        try {
          el.setAttribute(attr.name, new URL(value, baseUrl).toString());
        } catch {
          el.removeAttribute(attr.name);
        }
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    if (el.tagName === 'IFRAME') {
      el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    }
  });
  return doc.body.innerHTML;
}
