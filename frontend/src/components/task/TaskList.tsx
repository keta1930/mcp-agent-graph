import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Empty,
  Spin,
  Typography,
  Row,
  Col,
  Tag,
  Tooltip,
  Space,
  Pagination
} from 'antd';
import {
  Search,
  Play,
  Pause,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  Calendar as CalendarIcon,
  Repeat
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TaskSummary, TaskStatus, ScheduleType } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../i18n/hooks';

dayjs.extend(relativeTime);

const { Option } = Select;
const { Text } = Typography;

interface TaskListProps {
  onCreateTask?: () => void;
  scheduledJobsCount?: number;
  onReloadScheduler?: () => void;
  loading?: boolean;
  stats?: {
    total: number;
    active: number;
    paused: number;
    completed: number;
    error: number;
    scheduled: number;
  };
}

const TaskList: React.FC<TaskListProps> = ({ 
  onCreateTask, 
  scheduledJobsCount = 0, 
  onReloadScheduler, 
  loading: externalLoading
}) => {
  const navigate = useNavigate();
  const t = useT();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<ScheduleType | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const {
    tasks,
    loading: storeLoading,
    loadTasks,
    updateTaskStatus,
    deleteTask,
    getTaskNextRunTime,
    loadScheduledJobs
  } = useTaskStore();

  const loading = storeLoading || externalLoading;

  useEffect(() => {
    loadTasks();
    loadScheduledJobs();
  }, [loadTasks, loadScheduledJobs]);

  const filteredTasks = React.useMemo(() => {
    let filtered = tasks;

    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(task =>
        task.task_name.toLowerCase().includes(searchLower) ||
        task.graph_name.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(task => task.schedule_type === typeFilter);
    }

    return filtered;
  }, [tasks, searchText, statusFilter, typeFilter]);

  const paginatedTasks = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage]);

  const getStatusConfig = (status: TaskStatus) => {
    const configs = {
      [TaskStatus.ACTIVE]: { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)', text: t('pages.taskManager.statusActive') },
      [TaskStatus.PAUSED]: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.08)', text: t('pages.taskManager.statusPaused') },
      [TaskStatus.COMPLETED]: { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.08)', text: t('pages.taskManager.statusCompleted') },
      [TaskStatus.ERROR]: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.08)', text: t('pages.taskManager.statusError') }
    };
    return configs[status];
  };

  const handleStatusToggle = async (task: TaskSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === TaskStatus.ACTIVE ? TaskStatus.PAUSED : TaskStatus.ACTIVE;
    await updateTaskStatus(task.id, newStatus);
  };

  const handleDelete = async (task: TaskSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(t('pages.taskManager.deleteConfirm', { name: task.task_name }));
    if (confirmed) {
      await deleteTask(task.id);
    }
  };

  const handleCardClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleClearFilter = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* 操作栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        background: 'rgba(255, 255, 255, 0.85)',
        borderRadius: '8px',
        padding: '16px 20px',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
      }}>
        <Input
          placeholder={t('pages.taskManager.searchPlaceholder')}
          prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{
            width: '280px',
            height: '40px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
          }}
        />

        <Select
          placeholder={t('pages.taskManager.statusFilter')}
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: '120px' }}
        >
          <Option value={TaskStatus.ACTIVE}>{t('pages.taskManager.statusActive')}</Option>
          <Option value={TaskStatus.PAUSED}>{t('pages.taskManager.statusPaused')}</Option>
          <Option value={TaskStatus.COMPLETED}>{t('pages.taskManager.statusCompleted')}</Option>
          <Option value={TaskStatus.ERROR}>{t('pages.taskManager.statusError')}</Option>
        </Select>

        <Select
          placeholder={t('pages.taskManager.typeFilter')}
          value={typeFilter}
          onChange={setTypeFilter}
          allowClear
          style={{ width: '100px' }}
        >
          <Option value={ScheduleType.SINGLE}>{t('pages.taskManager.typeSingle')}</Option>
          <Option value={ScheduleType.RECURRING}>{t('pages.taskManager.typeRecurring')}</Option>
        </Select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={1.5} />}
            onClick={onCreateTask}
            style={{
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              height: '40px',
              padding: '0 20px',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
            }}
          >
            {t('pages.taskManager.createTask')}
          </Button>
          
          <Tooltip title={t('pages.taskManager.refresh')}>
            <div
              style={{
                padding: '8px',
                borderRadius: '6px',
                color: '#8b7355',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => {
                loadTasks();
                loadScheduledJobs();
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b7355';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <RefreshCw size={18} strokeWidth={1.5} />
            </div>
          </Tooltip>

          <Tooltip title={t('pages.taskManager.reloadScheduler')}>
            <div
              style={{
                padding: '8px',
                borderRadius: '6px',
                color: '#8b7355',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={onReloadScheduler}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b7355';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <RefreshCw size={18} strokeWidth={1.5} />
            </div>
          </Tooltip>

          {(searchText || statusFilter || typeFilter) && (
            <Button 
              onClick={handleClearFilter}
              type="text"
              style={{
                color: '#8b7355',
                height: '40px'
              }}
            >
              {t('pages.taskManager.clearFilter')}
            </Button>
          )}

          {scheduledJobsCount > 0 && (
            <Tag style={{
              background: 'rgba(139, 92, 246, 0.08)',
              color: '#8b5cf6',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '6px 12px',
              fontSize: '12px',
              margin: 0
            }}>
              {t('pages.taskManager.activeJobs', { count: scheduledJobsCount })}
            </Tag>
          )}
        </div>
      </div>

      {/* 任务卡片列表 */}
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}>
          <Spin size="large" tip={t('pages.taskManager.loadingTasks')} />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Empty
          description={searchText ? t('pages.taskManager.noMatchingTasks', { search: searchText }) : t('pages.taskManager.noTasks')}
          style={{ marginTop: '80px', color: 'rgba(45, 45, 45, 0.5)' }}
        >
          {onCreateTask && !searchText && (
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={onCreateTask}
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                height: '40px',
                padding: '0 20px',
                fontWeight: 500,
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
                marginTop: '16px'
              }}
            >
              {t('pages.taskManager.createFirstTask')}
            </Button>
          )}
        </Empty>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {paginatedTasks.map((task) => {
              const statusConfig = getStatusConfig(task.status);
              const nextRunTime = getTaskNextRunTime(task.id);
              const nextRun = nextRunTime ? dayjs(nextRunTime) : null;
              const isOverdue = nextRun ? nextRun.isBefore(dayjs()) : false;

              return (
                <Col key={task.id} xs={24} sm={24} md={12} lg={12} xl={8}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: '8px',
                      border: '1px solid rgba(139, 115, 85, 0.15)',
                      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
                      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                      background: 'rgba(255, 255, 255, 0.85)',
                      cursor: 'pointer',
                      height: '100%'
                    }}
                    styles={{
                      body: { padding: '20px' }
                    }}
                    onClick={() => handleCardClick(task.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06)';
                      e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                    }}
                  >
                    {/* 卡片头部 */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Text strong style={{
                          fontSize: '16px',
                          color: '#2d2d2d',
                          fontWeight: 600,
                          letterSpacing: '0.3px',
                          flex: 1,
                          marginRight: '12px',
                          lineHeight: '1.4'
                        }}>
                          {task.task_name}
                        </Text>
                        <Tag style={{
                          background: statusConfig.bgColor,
                          color: statusConfig.color,
                          border: `1px solid ${statusConfig.color}40`,
                          borderRadius: '6px',
                          fontWeight: 500,
                          fontSize: '12px',
                          padding: '2px 8px',
                          margin: 0
                        }}>
                          {statusConfig.text}
                        </Tag>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <Text style={{
                          fontSize: '13px',
                          color: 'rgba(45, 45, 45, 0.65)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {t('pages.taskManager.graph')}: {task.graph_name}
                        </Text>
                        <span style={{ color: 'rgba(139, 115, 85, 0.3)' }}>•</span>
                        <Text style={{
                          fontSize: '13px',
                          color: 'rgba(45, 45, 45, 0.65)'
                        }}>
                          {t('pages.taskManager.concurrency')}: {task.execution_count}
                        </Text>
                      </div>
                    </div>

                    {/* 调度信息 */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(250, 248, 245, 0.6)',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {task.schedule_type === ScheduleType.SINGLE ? (
                          <CalendarIcon size={14} color="#8b7355" strokeWidth={1.5} />
                        ) : (
                          <Repeat size={14} color="#8b7355" strokeWidth={1.5} />
                        )}
                        <Text style={{
                          fontSize: '12px',
                          color: '#8b7355',
                          fontWeight: 500
                        }}>
                          {task.schedule_type === ScheduleType.SINGLE ? t('pages.taskManager.singleTask') : t('pages.taskManager.recurringTask')}
                        </Text>
                      </div>

                      {nextRun && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} color={isOverdue ? '#ef4444' : '#10b981'} strokeWidth={1.5} />
                          <Text style={{
                            fontSize: '12px',
                            color: isOverdue ? '#ef4444' : '#10b981',
                            fontWeight: 500
                          }}>
                            {isOverdue ? t('pages.taskManager.overdue') : nextRun.format('MM-DD HH:mm')}
                          </Text>
                        </div>
                      )}
                    </div>

                    {/* 执行统计 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(139, 115, 85, 0.1)'
                    }}>
                      <div>
                        <Text style={{
                          fontSize: '12px',
                          color: 'rgba(45, 45, 45, 0.65)'
                        }}>
                          {t('pages.taskManager.executedTimes', { count: task.execution_stats.total_triggers })}
                        </Text>
                      </div>
                      
                      {/* 操作按钮 */}
                      <Space size={4}>
                        <Tooltip title={t('pages.taskManager.viewDetails')}>
                          <div
                            style={{
                              padding: '6px',
                              borderRadius: '4px',
                              color: '#8b7355',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(task.id);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#b85845';
                              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#8b7355';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Eye size={16} strokeWidth={1.5} />
                          </div>
                        </Tooltip>

                        {task.status !== TaskStatus.COMPLETED && (
                          <Tooltip title={task.status === TaskStatus.ACTIVE ? t('pages.taskManager.pause') : t('pages.taskManager.start')}>
                            <div
                              style={{
                                padding: '6px',
                                borderRadius: '4px',
                                color: '#8b7355',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={(e) => handleStatusToggle(task, e)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {task.status === TaskStatus.ACTIVE ? (
                                <Pause size={16} strokeWidth={1.5} />
                              ) : (
                                <Play size={16} strokeWidth={1.5} />
                              )}
                            </div>
                          </Tooltip>
                        )}

                        <Tooltip title={t('common.delete')}>
                          <div
                            style={{
                              padding: '6px',
                              borderRadius: '4px',
                              color: '#8b7355',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={(e) => handleDelete(task, e)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#8b7355';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </div>
                        </Tooltip>
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* 分页 */}
          {filteredTasks.length > pageSize && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '32px'
            }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredTasks.length}
                onChange={setCurrentPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TaskList;
