// 任务管理系统类型定义

export enum ScheduleType {
  SINGLE = 'single',
  RECURRING = 'recurring'
}

export enum TaskStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ScheduleConfig {
  execute_at?: string; // ISO 8601 字符串
  cron_expression?: string; // 5段cron表达式
}

export interface TaskExecution {
  conversation_id: string;
}

export interface TaskExecutionHistory {
  executed_at: string; // ISO 8601 字符串
  executions: TaskExecution[];
}

export interface ExecutionStats {
  total_triggers: number;
  last_executed_at?: TaskExecutionHistory;
}

export interface TaskCreate {
  task_name: string;
  graph_name: string;
  input_text: string;
  execution_count: number;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  user_id?: string;
}

export interface Task {
  id: string;
  user_id: string;
  task_name: string;
  graph_name: string;
  input_text: string;
  execution_count: number;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  execution_history: TaskExecutionHistory[];
  execution_stats: ExecutionStats;
}

export interface TaskSummary {
  id: string;
  user_id: string;
  task_name: string;
  graph_name: string;
  input_text: string;
  execution_count: number;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  execution_stats: ExecutionStats;
}

export interface TaskStatusUpdate {
  status: TaskStatus;
}

export interface TaskResponse {
  status: string;
  message: string;
  data?: any;
}

export interface ScheduledJob {
  id: string;
  name: string;
  next_run_time?: string;
  trigger: string;
}

// 任务查询参数
export interface TaskQueryParams {
  user_id?: string;
  task_status?: TaskStatus;
  graph_name?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Cron 表达式模板
export interface CronTemplate {
  name: string;
  description: string;
  expression: string;
}