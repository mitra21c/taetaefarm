// 스마트 팜 화면 설정 (관수 자동화 / 양액기 자동화)

/**
 * 좌측 트리와 내용을 어디서 가져올지
 *   'file' : public/projects/과제 리스트.txt 와 각 과제의 html.txt (지금 사용, 파일만 고치면 반영)
 *   'db'   : 서버 smart_farm_nodes 테이블 (화면에서 내용 편집 가능, DB 연결 필요)
 */
export const SMART_FARM_SOURCE: 'file' | 'db' = 'file';

export type FarmNodeType = 'folder' | 'page';

/** 좌측 트리 항목 (folder: 묶음, page: 내용이 있는 항목) */
export interface TreeNode {
  id: string;
  parent_id: string | null;
  node_type: FarmNodeType;
  label: string;
  sort_order: number;
  /** 화면에서 이름 변경·삭제를 막을 항목 (DB 모드의 '소개', '프로젝트') */
  locked?: boolean;
}

export interface SmartFarmArea {
  title: string;
  introLabel: string;
  /** 과제 리스트 파일 (public 폴더 기준). 없으면 소개 항목만 표시 */
  listFile?: string;
  /** 다른 사이트(블로그 등)를 보여 줄 때 그 사이트가 그려지는 너비(px) */
  frameWidth?: number;
}

export const SMART_FARM: Record<string, SmartFarmArea> = {
  irrigation: { title: '관수 자동화', introLabel: '관수 자동화 소개', listFile: 'projects/과제 리스트.txt' },
  nutrient: { title: '양액기 자동화', introLabel: '양액기 자동화 소개' },
};
