import { axiosInstance } from './axiosInstance';
import type { User } from '../types/auth';
import type { FarmNodeType, TreeNode } from '../data/smartFarm';

export type { FarmNodeType };

/** 서버(smart_farm_nodes)가 돌려주는 트리 항목 */
export interface FarmNode {
  id: number;
  parent_id: number | null;
  node_type: FarmNodeType;
  label: string;
  sort_order: number;
}

export interface FarmNodeDetail extends FarmNode {
  area: string;
  content: string | null;
  created_at: string;
  modified_at: string | null;
}

/**
 * 편집 권한: 지금은 누구나 편집 가능.
 * 관리자·매니저만 허용하려면 아래를 `user?.role === 'admin' || user?.role === 'manager'` 로 바꾸고
 * server/index.ts 의 canEditSmartFarm 도 함께 바꾼다.
 */
export function canEditSmartFarm(user: User | null): boolean {
  void user;
  return true;
}

/** 서버 항목을 화면 트리 형식(문자열 id)으로 */
export const toTreeNode = (n: FarmNode): TreeNode => ({
  ...n,
  id: String(n.id),
  parent_id: n.parent_id == null ? null : String(n.parent_id),
});

export const getFarmNodes = async (area: string): Promise<FarmNode[]> => {
  const { data } = await axiosInstance.get<FarmNode[]>(`/smart-farm/${area}/nodes`);
  return data;
};

export const getFarmNode = async (id: number): Promise<FarmNodeDetail> => {
  const { data } = await axiosInstance.get<FarmNodeDetail>(`/smart-farm/nodes/${id}`);
  return data;
};

export const createFarmNode = async (
  area: string,
  payload: { parent_id: number | null; node_type: FarmNodeType; label: string },
): Promise<FarmNode> => {
  const { data } = await axiosInstance.post<FarmNode>(`/smart-farm/${area}/nodes`, payload);
  return data;
};

export const updateFarmNode = async (id: number, payload: { label?: string; content?: string }): Promise<void> => {
  await axiosInstance.patch(`/smart-farm/nodes/${id}`, payload);
};

export const deleteFarmNode = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/smart-farm/nodes/${id}`);
};

/** axios 오류에서 서버 메시지 꺼내기 */
export function errorMessage(err: unknown, fallback = '처리 중 오류가 발생했습니다.'): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg || fallback;
}
