import { Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';

/** http(s) 주소만 허용 */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * GitHub 파일 화면 주소를 실제 파일 주소로 바꾼다.
 *   https://github.com/<user>/<repo>/blob/<branch>/<path>  →  https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path>
 * GitHub Pages 주소(https://<user>.github.io/...)는 그대로 쓴다.
 */
export function normalizeMediaUrl(raw: string): string | null {
  const url = safeUrl(raw);
  if (!url) return null;
  const m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3].replace(/\?.*$/, '')}`;
  return url;
}

export function isYoutubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//.test(url);
}

/** mp4·webm 등 영상 파일 (<video> 태그) */
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: el => safeUrl(el.getAttribute('src')),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'video[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata', playsinline: 'true' })];
  },
});

/** 편집기와 읽기 화면이 같은 규칙으로 HTML 을 해석하도록 한 곳에서 만든다 */
export function createExtensions(editable: boolean) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      code: false,
      link: {
        openOnClick: !editable,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
      },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ inline: false, allowBase64: false }),
    Youtube.configure({ nocookie: true, controls: true, width: 640, height: 360 }),
    Video,
    ...(editable ? [Placeholder.configure({ placeholder: '내용을 입력하세요. 위 도구 모음으로 글자 서식, 이미지, 영상을 넣을 수 있습니다.' })] : []),
  ];
}
