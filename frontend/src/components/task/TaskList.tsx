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
    deleteTask
  } = useTaskStore();

  // 初始加载
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 查询参数变化时重新加载
  useEffect(() => {
    loadTasks();
  }, [queryParams, loadTasks]);

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

  // 搜索处理
  const handleSearch = () => {
    setQueryParams({
      offset: 0,
      ...(searchText ? {} : {}), // 后端暂不支持关键词搜索，可以在此处添加
    });
  };

  // 筛选处理
  const handleFilter = () => {
    setQueryParams({
      offset: 0,
      task_status: statusFilter,
      // schedule_type: typeFilter, // 后端暂不支持按调度类型筛选
    });
  };

  // 清除筛选
  const handleClearFilter = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setQueryParams({
      offset: 0,
      task_status: undefined,
    });
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
            onPressEnter={handleSearch}
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
            <Button onClick={handleSearch} icon={<SearchOutlined />}>
              搜索
            </Button>
            <Button onClick={handleFilter}>
              应用筛选
            </Button>
            <Button onClick={handleClearFilter}>
              清除
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={() => loadTasks()}
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
        dataSource={tasks}
        loading={loading}
        rowKey="id"
        pagination={{
          current: Math.floor((queryParams.offset || 0) / (queryParams.limit || 20)) + 1,
          pageSize: queryParams.limit || 20,
          total: tasks.length >= (queryParams.limit || 20) ? (queryParams.offset || 0) + tasks.length + 1 : (queryParams.offset || 0) + tasks.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`,
          onChange: (page, pageSize) => {
            setQueryParams({
              offset: (page - 1) * pageSize,
              limit: pageSize
            });
          }
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