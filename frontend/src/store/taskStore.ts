// 任务状态管理Store
import { create } from 'zustand';
import { taskService } from '../services/taskService';
import {
  Task,
  TaskSummary,
  TaskCreate,
  TaskStatus,
  TaskQueryParams,
  ScheduledJob
} from '../types/task';

interface TaskStore {
  // 状态
  tasks: TaskSummary[];
  currentTask: Task | null;
  scheduledJobs: ScheduledJob[];
  loading: boolean;
  error: string | null;

  // 查询参数
  queryParams: TaskQueryParams;

  // 操作
  setQueryParams: (params: Partial<TaskQueryParams>) => void;
  loadTasks: () => Promise<void>;
  loadTask: (taskId: string) => Promise<void>;
  createTask: (taskData: TaskCreate) => Promise<{ success: boolean; taskId?: string; message?: string }>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  loadScheduledJobs: () => Promise<void>;
  reloadScheduler: () => Promise<boolean>;
  clearError: () => void;
  clearCurrentTask: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  // 初始状态
  tasks: [],
  currentTask: null,
  scheduledJobs: [],
  loading: false,
  error: null,
  queryParams: {
    limit: 20,
    offset: 0,
    sort_by: 'created_at',
    sort_order: 'desc'
  },

  // 设置查询参数
  setQueryParams: (params) => {
    set(state => ({
      queryParams: { ...state.queryParams, ...params }
    }));
  },

  // 加载任务列表
  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const { queryParams } = get();
      const tasks = await taskService.getTaskSummaries(queryParams);
      set({ tasks, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '加载任务列表失败',
        loading: false
      });
    }
  },

  // 加载单个任务详情
  loadTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const task = await taskService.getTask(taskId);
      set({ currentTask: task, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '加载任务详情失败',
        loading: false
      });
    }
  },

  // 创建任务
  createTask: async (taskData: TaskCreate) => {
    set({ loading: true, error: null });
    try {
      const response = await taskService.createTask(taskData);
      if (response.status === 'success') {
        // 重新加载任务列表
        await get().loadTasks();
        set({ loading: false });
        return {
          success: true,
          taskId: response.data?.task_id,
          message: response.message
        };
      } else {
        set({
          error: response.message || '创建任务失败',
          loading: false
        });
        return { success: false, message: response.message };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '创建任务失败';
      set({ error: errorMessage, loading: false });
      return { success: false, message: errorMessage };
    }
  },

  // 更新任务状态
  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    set({ loading: true, error: null });
    try {
      const response = await taskService.updateTaskStatus(taskId, { status });
      if (response.status === 'success') {
        // 更新本地状态
        set(state => ({
          tasks: state.tasks.map(task =>
            task.id === taskId ? { ...task, status } : task
          ),
          loading: false
        }));

        // 如果当前任务是被更新的任务，也更新当前任务
        const { currentTask } = get();
        if (currentTask?.id === taskId) {
          set({ currentTask: { ...currentTask, status } });
        }

        return true;
      } else {
        set({
          error: response.message || '更新任务状态失败',
          loading: false
        });
        return false;
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '更新任务状态失败',
        loading: false
      });
      return false;
    }
  },

  // 删除任务
  deleteTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await taskService.deleteTask(taskId);
      if (response.status === 'success') {
        // 从本地状态移除
        set(state => ({
          tasks: state.tasks.filter(task => task.id !== taskId),
          loading: false
        }));

        // 如果删除的是当前任务，清除当前任务
        const { currentTask } = get();
        if (currentTask?.id === taskId) {
          set({ currentTask: null });
        }

        return true;
      } else {
        set({
          error: response.message || '删除任务失败',
          loading: false
        });
        return false;
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '删除任务失败',
        loading: false
      });
      return false;
    }
  },

  // 加载调度器中的任务
  loadScheduledJobs: async () => {
    try {
      const jobs = await taskService.getScheduledJobs();
      set({ scheduledJobs: jobs });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || '加载调度任务失败' });
    }
  },

  // 重新加载调度器
  reloadScheduler: async () => {
    set({ loading: true, error: null });
    try {
      const response = await taskService.reloadScheduler();
      if (response.status === 'success') {
        // 重新加载调度任务列表
        await get().loadScheduledJobs();
        set({ loading: false });
        return true;
      } else {
        set({
          error: response.message || '重新加载调度器失败',
          loading: false
        });
        return false;
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '重新加载调度器失败',
        loading: false
      });
      return false;
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 清除当前任务
  clearCurrentTask: () => {
    set({ currentTask: null });
  }
}));