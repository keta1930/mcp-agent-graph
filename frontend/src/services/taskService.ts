// 任务服务API接口层
import api from './api';
import {
  Task,
  TaskSummary,
  TaskCreate,
  TaskStatusUpdate,
  TaskResponse,
  ScheduledJob,
  TaskQueryParams
} from '../types/task';

export class TaskService {
  // 创建任务
  async createTask(taskData: TaskCreate): Promise<TaskResponse> {
    const response = await api.post('/tasks', taskData);
    return response.data;
  }

  // 获取任务摘要列表
  async getTaskSummaries(params?: TaskQueryParams): Promise<TaskSummary[]> {
    const response = await api.get('/tasks', { params });
    return response.data;
  }

  // 获取单个任务详情
  async getTask(taskId: string): Promise<Task> {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  }

  // 更新任务状态
  async updateTaskStatus(taskId: string, statusUpdate: TaskStatusUpdate): Promise<TaskResponse> {
    const response = await api.put(`/tasks/${taskId}/status`, statusUpdate);
    return response.data;
  }

  // 删除任务
  async deleteTask(taskId: string): Promise<TaskResponse> {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  }

  // 获取调度器中的任务
  async getScheduledJobs(): Promise<ScheduledJob[]> {
    const response = await api.get('/tasks/scheduler/jobs');
    return response.data;
  }

  // 重新加载调度器
  async reloadScheduler(): Promise<TaskResponse> {
    const response = await api.post('/tasks/scheduler/reload');
    return response.data;
  }
}

export const taskService = new TaskService();