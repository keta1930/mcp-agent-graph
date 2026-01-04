import api from './api';
import {
  ProjectListResponse,
  ProjectDetail,
  ProjectOperationResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '../types/project';

const PROJECT_API_BASE = '/projects';

export const projectService = {
  async listProjects(limit = 100, skip = 0): Promise<ProjectListResponse> {
    const response = await api.get(PROJECT_API_BASE, {
      params: { limit, skip },
    });
    return response.data;
  },

  async createProject(payload: CreateProjectRequest): Promise<ProjectOperationResponse> {
    const response = await api.post(PROJECT_API_BASE, payload);
    return response.data;
  },

  async updateProject(projectId: string, payload: UpdateProjectRequest): Promise<ProjectOperationResponse> {
    const response = await api.put(`${PROJECT_API_BASE}/${projectId}`, payload);
    return response.data;
  },

  async deleteProject(projectId: string): Promise<ProjectOperationResponse> {
    const response = await api.delete(`${PROJECT_API_BASE}/${projectId}`);
    return response.data;
  },

  async getProjectDetail(projectId: string, includeConversations = true): Promise<ProjectDetail> {
    const response = await api.get(`${PROJECT_API_BASE}/${projectId}`, {
      params: { include_conversations: includeConversations },
    });
    return response.data;
  },

  async getProjectConversations(projectId: string): Promise<{
    success: boolean;
    project_id: string;
    conversations: ProjectDetail['conversations'];
    total_count: number;
  }> {
    const response = await api.get(`${PROJECT_API_BASE}/${projectId}/conversations`);
    return response.data;
  },

  async moveConversationToProject(conversationId: string, projectId?: string | null): Promise<ProjectOperationResponse> {
    const response = await api.put(`/conversations/${conversationId}/project`, {
      project_id: projectId ?? null,
    });
    return response.data;
  },
};
