import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Descriptions,
  Timeline,
  Empty,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  List,
  Tooltip,
  Modal
} from 'antd';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  DeleteOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Task, TaskStatus, ScheduleType } from '../types/task';
import { useTaskStore } from '../store/taskStore';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const {
    currentTask,
    loading,
    error,
    loadTask,
    updateTaskStatus,
    deleteTask,
    clearCurrentTask,
    clearError,
    getTaskNextRunTime,
    loadScheduledJobs
  } = useTaskStore();

  // 加载任务详情
  useEffect(() => {
    if (taskId) {
      loadTask(taskId);
      loadScheduledJobs();
    }
    return () => {
      clearCurrentTask();
    };
  }, [taskId, loadTask, loadScheduledJobs, clearCurrentTask]);

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
      <Tag color={config.color} icon={config.icon} style={{ fontSize: '14px' }}>
        {config.text}
      </Tag>
    );
  };

  // 处理状态切换
  const handleStatusToggle = async () => {
    if (!currentTask) return;
    const newStatus = currentTask.status === TaskStatus.ACTIVE ? TaskStatus.PAUSED : TaskStatus.ACTIVE;
    const success = await updateTaskStatus(currentTask.id, newStatus);
    if (success) {
      // 重新加载任务详情以获取最新状态
      loadTask(currentTask.id);
    }
  };

  // 处理删除任务
  const handleDelete = async () => {
    if (!currentTask) return;
    const success = await deleteTask(currentTask.id);
    if (success) {
      navigate('/tasks');
    }
  };

  // 跳转到对话页面
  const handleJumpToChat = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate('/tasks')}>返回任务列表</Button>
          }
        />
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Empty
          description="任务不存在"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button onClick={() => navigate('/tasks')}>返回任务列表</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* 页面头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/tasks')}
            style={{ marginRight: '12px' }}
          >
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            任务详情
          </Title>
        </div>

        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={() => navigate('/chat')}
          style={{
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px'
          }}
        />
      </div>

      {/* 任务基本信息 */}
      <Card title="基本信息" style={{ marginBottom: '24px' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Descriptions column={1}>
              <Descriptions.Item label="任务名称">
                <Text strong style={{ fontSize: '16px' }}>{currentTask.task_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(currentTask.status)}
              </Descriptions.Item>
              <Descriptions.Item label="调度类型">
                <Tag color={currentTask.schedule_type === ScheduleType.SINGLE ? 'cyan' : 'purple'}>
                  {currentTask.schedule_type === ScheduleType.SINGLE ? '单次任务' : '周期任务'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="图名称">
                {currentTask.graph_name}
              </Descriptions.Item>
              <Descriptions.Item label="并发数量">
                {currentTask.execution_count}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} md={12}>
            <Descriptions column={1}>
              <Descriptions.Item label="创建时间">
                {dayjs(currentTask.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(currentTask.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="调度配置">
                {currentTask.schedule_type === ScheduleType.SINGLE && currentTask.schedule_config.execute_at && (
                  <div>
                    <Text>{dayjs(currentTask.schedule_config.execute_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
                    <Text type="secondary" style={{ marginLeft: '8px' }}>
                      ({dayjs(currentTask.schedule_config.execute_at).fromNow()})
                    </Text>
                  </div>
                )}
                {currentTask.schedule_type === ScheduleType.RECURRING && currentTask.schedule_config.cron_expression && (
                  <Text code>{currentTask.schedule_config.cron_expression}</Text>
                )}
              </Descriptions.Item>
              {(() => {
                const nextRunTime = getTaskNextRunTime(currentTask.id);
                if (nextRunTime) {
                  const nextRun = dayjs(nextRunTime);
                  const now = dayjs();
                  const isOverdue = nextRun.isBefore(now);
                  return (
                    <Descriptions.Item label="下次运行">
                      <div>
                        <Text style={{
                          color: isOverdue ? '#f5222d' : currentTask.status === TaskStatus.ACTIVE ? '#389e0d' : '#666'
                        }}>
                          {nextRun.format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: '8px' }}>
                          ({isOverdue ? '已过期' : nextRun.fromNow()})
                        </Text>
                      </div>
                    </Descriptions.Item>
                  );
                } else if (currentTask.status === TaskStatus.ACTIVE) {
                  return (
                    <Descriptions.Item label="下次运行">
                      <Text type="secondary">未调度到调度器中</Text>
                    </Descriptions.Item>
                  );
                }
                return null;
              })()}
              <Descriptions.Item label="输入文本">
                {currentTask.input_text ? (
                  <Text style={{ maxWidth: '300px', display: 'block', wordBreak: 'break-word' }}>
                    {currentTask.input_text}
                  </Text>
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Space>
            <Button
              type={currentTask.status === TaskStatus.ACTIVE ? 'default' : 'primary'}
              icon={currentTask.status === TaskStatus.ACTIVE ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleStatusToggle}
              disabled={currentTask.status === TaskStatus.COMPLETED}
            >
              {currentTask.status === TaskStatus.ACTIVE ? '暂停' : '启动'}
            </Button>
            <Button
              disabled={currentTask.status === TaskStatus.COMPLETED}
              onClick={() => updateTaskStatus(currentTask.id, TaskStatus.COMPLETED)}
            >
              标记完成
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteModalVisible(true)}>
              删除任务
            </Button>
          </Space>
        </div>
      </Card>

      {/* 执行统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="总触发次数"
              value={currentTask.execution_stats.total_triggers}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="总执行实例"
              value={currentTask.execution_history.reduce((sum, history) => sum + history.executions.length, 0)}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="最后执行"
              value={currentTask.execution_stats.last_executed_at ?
                dayjs(currentTask.execution_stats.last_executed_at.executed_at).format('MM-DD HH:mm') :
                '无'
              }
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="平均并发"
              value={currentTask.execution_stats.total_triggers > 0 ?
                Math.round(currentTask.execution_history.reduce((sum, history) => sum + history.executions.length, 0) / currentTask.execution_stats.total_triggers * 10) / 10 :
                0
              }
              precision={1}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 执行历史 */}
      <Card title="执行历史" style={{ marginBottom: '24px' }}>
        {currentTask.execution_history.length === 0 ? (
          <Empty description="暂无执行记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Timeline mode="left" style={{ marginTop: '16px' }}>
            {currentTask.execution_history.map((history, index) => (
              <Timeline.Item
                key={`${history.executed_at}-${index}`}
                label={
                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {dayjs(history.executed_at).format('MM-DD HH:mm:ss')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {dayjs(history.executed_at).fromNow()}
                    </div>
                  </div>
                }
                color="blue"
              >
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>触发执行</Text>
                    <Tag color="blue" style={{ marginLeft: '8px' }}>
                      {history.executions.length} 个实例
                    </Tag>
                  </div>
                  <List
                    size="small"
                    dataSource={history.executions}
                    renderItem={(execution) => (
                      <List.Item
                        style={{
                          padding: '4px 0',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f0f0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => handleJumpToChat(execution.conversation_id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <LinkOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                          <Text code style={{ fontSize: '12px' }}>
                            {execution.conversation_id}
                          </Text>
                          <Tooltip title="点击跳转到对话">
                            <Button
                              type="link"
                              size="small"
                              style={{ marginLeft: 'auto', padding: 0 }}
                            >
                              查看对话
                            </Button>
                          </Tooltip>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      {/* 删除确认模态框 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除任务 <strong>"{currentTask.task_name}"</strong> 吗？</p>
        <p>此操作不可撤销，任务的所有执行历史也将被删除。</p>
      </Modal>
    </div>
  );
};

export default TaskDetail;