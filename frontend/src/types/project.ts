export interface ProjectListItem {
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  conversation_count: number;
  total_files: number;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total_count: number;
}

export interface ProjectConversationSummary {
  conversation_id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  type?: 'agent' | 'graph';
}

export interface ProjectDetail {
  project_id: string;
  name: string;
  instruction: string;
  created_at: string;
  updated_at: string;
  conversation_count: number;
  total_files: number;
  files?: string[];
  conversations?: ProjectConversationSummary[];
}

export interface ProjectOperationResponse {
  success: boolean;
  message: string;
  project_id?: string | null;
}

export interface CreateProjectRequest {
  name: string;
  instruction?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  instruction?: string;
}
