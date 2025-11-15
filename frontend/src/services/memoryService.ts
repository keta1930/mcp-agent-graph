// src/services/memoryService.ts
import api from './api';
import {
  AddMemoryRequest,
  UpdateMemoryRequest,
  ImportMemoryRequest,
  GetMemoriesMetadataResponse,
  GetMemoriesResponse,
  MemoryResponse,
  BatchDeleteResponse
} from '../types/memory';

/**
 * 获取所有记忆元数据
 * @returns 所有记忆的元数据列表
 */
export const getMemories = async (): Promise<GetMemoriesMetadataResponse> => {
  const response = await api.get('/memory');
  return response.data;
};

/**
 * 获取特定owner的完整记忆
 * @param ownerType - owner类型 (user 或 agent)
 * @param ownerId - owner的ID
 * @returns 完整的记忆数据
 */
export const getOwnerMemories = async (
  ownerType: string,
  ownerId: string
): Promise<GetMemoriesResponse> => {
  const response = await api.post('/memory/detail', {
    owner_type: ownerType,
    owner_id: ownerId
  });
  return response.data;
};

/**
 * 添加记忆条目
 * @param ownerType - owner类型 (user 或 agent)
 * @param ownerId - owner的ID
 * @param category - 记忆分类
 * @param request - 添加请求数据
 * @returns 操作结果
 */
export const addMemoryItem = async (
  ownerType: string,
  ownerId: string,
  category: string,
  request: AddMemoryRequest
): Promise<MemoryResponse> => {
  const response = await api.post('/memory/add', {
    owner_type: ownerType,
    owner_id: ownerId,
    category: category,
    content: request.content
  });
  return response.data;
};

/**
 * 更新记忆条目
 * @param ownerType - owner类型 (user 或 agent)
 * @param ownerId - owner的ID
 * @param category - 记忆分类
 * @param itemId - 记忆条目ID
 * @param request - 更新请求数据
 * @returns 操作结果
 */
export const updateMemoryItem = async (
  ownerType: string,
  ownerId: string,
  category: string,
  itemId: string,
  request: UpdateMemoryRequest
): Promise<MemoryResponse> => {
  const response = await api.put('/memory/update', {
    owner_type: ownerType,
    owner_id: ownerId,
    category: category,
    item_id: itemId,
    content: request.content
  });
  return response.data;
};

/**
 * 批量删除记忆条目
 * @param ownerType - owner类型 (user 或 agent)
 * @param ownerId - owner的ID
 * @param category - 记忆分类
 * @param itemIds - 要删除的记忆条目ID列表
 * @returns 批量删除结果
 */
export const batchDeleteItems = async (
  ownerType: string,
  ownerId: string,
  category: string,
  itemIds: string[]
): Promise<BatchDeleteResponse> => {
  const response = await api.delete('/memory/items', {
    data: {
      owner_type: ownerType,
      owner_id: ownerId,
      category: category,
      item_ids: itemIds
    }
  });
  return response.data;
};

/**
 * 批量删除分类
 * @param ownerType - owner类型 (user 或 agent)
 * @param ownerId - owner的ID
 * @param categories - 要删除的分类列表
 * @returns 批量删除结果
 */
export const batchDeleteCategories = async (
  ownerType: string,
  ownerId: string,
  categories: string[]
): Promise<BatchDeleteResponse> => {
  const response = await api.delete('/memory/categories', {
    data: {
      owner_type: ownerType,
      owner_id: ownerId,
      categories: categories
    }
  });
  return response.data;
};

/**
 * 导出记忆
 * @param ownerType - owner类型 (user 或 agent)
 * @param ownerId - owner的ID
 * @param format - 导出格式 (json, txt, markdown, yaml)
 * @returns 导出的文件Blob
 */
export const exportMemories = async (
  ownerType: string,
  ownerId: string,
  format: 'json' | 'txt' | 'markdown' | 'yaml'
): Promise<Blob> => {
  const response = await api.post('/memory/export', {
    owner_type: ownerType,
    owner_id: ownerId,
    format: format
  }, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * 导入记忆
 * @param ownerType - owner类型 (user 或 agent)
 * @param ownerId - owner的ID
 * @param request - 导入请求数据
 * @returns 导入结果
 */
export const importMemories = async (
  ownerType: string,
  ownerId: string,
  request: ImportMemoryRequest
): Promise<MemoryResponse> => {
  const response = await api.post('/memory/import', {
    owner_type: ownerType,
    owner_id: ownerId,
    content: request.content,
    model_name: request.model_name
  });
  return response.data;
};
