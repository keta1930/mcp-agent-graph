import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Dropdown,
  Modal,
  message,
  Tooltip,
  Input,
  Select,
  Row,
  Col,
  Typography,
  Empty
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  SearchOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
import { TaskSummary, TaskStatus, ScheduleType } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';

dayjs.extend(relativeTime);

const { Option } = Select;
const { Text } = Typography;

interface TaskListProps {
  onCreateTask?: () => void;
}

const TaskList: React.FC<TaskListProps> = ({ onCreateTask }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<ScheduleType | undefined>();

  const {
    tasks,
    loading,
    queryParams,
    setQueryParams,
    loadTasks,
    updateTaskStatus,
    deleteTask,
    getTaskNextRunTime,
    loadScheduledJobs
  } = useTaskStore();

  // 初始加载
  useEffect(() => {
    loadTasks();
    loadScheduledJobs();
  }, [loadTasks, loadScheduledJobs]);

  // 查询参数变化时重新加载
  useEffect(() => {
    loadTasks();
  }, [queryParams, loadTasks]);

  // 前端筛选逻辑
  const filteredTasks = React.useMemo(() => {
    let filtered = tasks;

    // 搜索筛选：任务名称或图名称包含搜索文本
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(task =>
        task.task_name.toLowerCase().includes(searchLower) ||
        task.graph_name.toLowerCase().includes(searchLower)
      );
    }

    // 状态筛选
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // 类型筛选（前端处理，因为后端可能不支持）
    if (typeFilter) {
      filtered = filtered.filter(task => task.schedule_type === typeFilter);
    }

    return filtered;
  }, [tasks, searchText, statusFilter, typeFilter]);

  // 获取状态标签配置
  const getStatusTag = (status: TaskStatus) => {
    const configs = {
      [TaskStatus.ACTIVE]: { color: 'green', icon: <PlayCircleOutlined />, text: '运行中' },
      [TaskStatus.PAUSED]: { color: 'orange', icon: <PauseCircleOutlined />, text: '已暂停' },
      [TaskStatus.COMPLETED]: { color: 'blue', icon: <CheckCircleOutlined />, text: '已完成' },
      [TaskStatus.ERROR]: { color: 'red', icon: <ExclamationCircleOutlined />, text: '错误' }
    };
    const config = configs[status];
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 获取调度类型标签
  const getScheduleTypeTag = (type: ScheduleType) => {
    return type === ScheduleType.SINGLE ? (
      <Tag color="cyan">单次</Tag>
    ) : (
      <Tag color="purple">周期</Tag>
    );
  };

  // 处理状态切换
  const handleStatusToggle = async (task: TaskSummary) => {
    const newStatus = task.status === TaskStatus.ACTIVE ? TaskStatus.PAUSED : TaskStatus.ACTIVE;
    const success = await updateTaskStatus(task.id, newStatus);
    if (success) {
      message.success(`任务已${newStatus === TaskStatus.ACTIVE ? '启动' : '暂停'}`);
    }
  };

  // 处理删除任务
  const handleDelete = (task: TaskSummary) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务"${task.task_name}"吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const success = await deleteTask(task.id);
        if (success) {
          message.success('任务删除成功');
        }
      }
    });
  };

  // 处理执行历史点击
  const handleExecutionClick = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  // 清除筛选
  const handleClearFilter = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
  };

  // 表格列定义
  const columns: ColumnsType<TaskSummary> = [
    {
      title: '任务信息',
      key: 'taskInfo',
      render: (_, task) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            <Button
              type="link"
              style={{ padding: 0, fontWeight: 'bold', fontSize: '14px' }}
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              {task.task_name}
            </Button>
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            图: {task.graph_name} | 并发数: {task.execution_count}
          </div>
        </div>
      )
    },
    {
      title: '类型',
      dataIndex: 'schedule_type',
      key: 'schedule_type',
      width: 80,
      render: (type: ScheduleType) => getScheduleTypeTag(type)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TaskStatus) => getStatusTag(status)
    },
    {
      title: '调度配置',
      key: 'schedule',
      width: 200,
      render: (_, task) => {
        if (task.schedule_type === ScheduleType.SINGLE && task.schedule_config.execute_at) {
          const executeTime = dayjs(task.schedule_config.execute_at);
          const isPast = executeTime.isBefore(dayjs());
          return (
            <div>
              <div style={{ fontSize: '12px', color: isPast ? '#f5222d' : '#389e0d' }}>
                {executeTime.format('MM-DD HH:mm')}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {isPast ? '已过期' : executeTime.fromNow()}
              </div>
            </div>
          );
        } else if (task.schedule_type === ScheduleType.RECURRING && task.schedule_config.cron_expression) {
          return (
            <div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                {task.schedule_config.cron_expression}
              </div>
            </div>
          );
        }
        return '-';
      }
    },
    {
      title: '下次运行',
      key: 'next_run',
      width: 120,
      render: (_, task) => {
        const nextRunTime = getTaskNextRunTime(task.id);
        if (!nextRunTime) {
          if (task.status === TaskStatus.ACTIVE) {
            return <Text type="secondary">未调度</Text>;
          } else {
            return <Text type="secondary">-</Text>;
          }
        }

        // 处理时区转换，后端返回的时间带有时区信息
        const nextRun = dayjs(nextRunTime);
        const now = dayjs();
        const isOverdue = nextRun.isBefore(now);

        // 判断是否是今天
        const isToday = nextRun.isSame(now, 'day');
        const isTomorrow = nextRun.isSame(now.add(1, 'day'), 'day');

        return (
          <Tooltip
            title={`完整时间: ${nextRun.format('YYYY-MM-DD HH:mm:ss')}`}
            placement="left"
          >
            <div>
              <div style={{
                fontSize: '12px',
                color: isOverdue ? '#f5222d' : task.status === TaskStatus.ACTIVE ? '#389e0d' : '#666',
                fontWeight: isToday || isTomorrow ? 'bold' : 'normal'
              }}>
                {isToday ? '今天 ' : isTomorrow ? '明天 ' : nextRun.format('MM-DD ')}{nextRun.format('HH:mm')}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {isOverdue ? '已过期' : nextRun.fromNow()}
              </div>
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '执行统计',
      key: 'stats',
      width: 150,
      render: (_, task) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            总执行: <Text strong>{task.execution_stats.total_triggers}</Text> 次
          </div>
          {task.execution_stats.last_executed_at ? (
            <div style={{ fontSize: '11px', color: '#666' }}>
              最后执行: {dayjs(task.execution_stats.last_executed_at.executed_at).format('MM-DD HH:mm')}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#999' }}>未执行过</div>
          )}
        </div>
      )
    },
    {
      title: '最近执行',
      key: 'recent_executions',
      width: 120,
      render: (_, task) => {
        const lastExecution = task.execution_stats.last_executed_at;
        if (!lastExecution || !lastExecution.executions.length) {
          return <Text type="secondary">无</Text>;
        }

        return (
          <Space direction="vertical" size={2}>
            {lastExecution.executions.slice(0, 2).map((execution, index) => (
              <Button
                key={execution.conversation_id}
                type="link"
                size="small"
                onClick={() => handleExecutionClick(execution.conversation_id)}
                style={{ padding: 0, fontSize: '11px', height: 'auto' }}
              >
                {execution.conversation_id.slice(-8)}
              </Button>
            ))}
            {lastExecution.executions.length > 2 && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                +{lastExecution.executions.length - 2} 个
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (time: string) => (
        <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
          <div style={{ fontSize: '12px' }}>
            {dayjs(time).format('MM-DD HH:mm')}
          </div>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, task) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tasks/${task.id}`)}
            />
          </Tooltip>
          <Tooltip title={task.status === TaskStatus.ACTIVE ? '暂停' : '启动'}>
            <Button
              type="text"
              size="small"
              icon={task.status === TaskStatus.ACTIVE ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleStatusToggle(task)}
              disabled={task.status === TaskStatus.COMPLETED}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'detail',
                  label: '查看详情',
                  icon: <EyeOutlined />,
                  onClick: () => navigate(`/tasks/${task.id}`)
                },
                {
                  key: 'complete',
                  label: '标记完成',
                  disabled: task.status === TaskStatus.COMPLETED,
                  onClick: () => updateTaskStatus(task.id, TaskStatus.COMPLETED)
                },
                {
                  key: 'delete',
                  label: '删除',
                  danger: true,
                  onClick: () => handleDelete(task)
                }
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* 搜索和筛选栏 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="搜索任务名称或图名称"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            placeholder="状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: '100%' }}
          >
            <Option value={TaskStatus.ACTIVE}>运行中</Option>
            <Option value={TaskStatus.PAUSED}>已暂停</Option>
            <Option value={TaskStatus.COMPLETED}>已完成</Option>
            <Option value={TaskStatus.ERROR}>错误</Option>
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            placeholder="类型筛选"
            value={typeFilter}
            onChange={setTypeFilter}
            allowClear
            style={{ width: '100%' }}
          >
            <Option value={ScheduleType.SINGLE}>单次任务</Option>
            <Option value={ScheduleType.RECURRING}>周期任务</Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Space>
            <Button onClick={handleClearFilter}>
              清除筛选
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                loadTasks();
                loadScheduledJobs();
              }}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 任务表格 */}
      <Table
        columns={columns}
        dataSource={filteredTasks}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`,
        }}
        locale={{
          emptyText: (
            <Empty
              description="暂无任务"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {onCreateTask && (
                <Button type="primary" onClick={onCreateTask}>
                  创建第一个任务
                </Button>
              )}
            </Empty>
          )
        }}
      />
    </div>
  );
};

export default TaskList;