import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  Alert,
  Row,
  Col,
  Modal
} from 'antd';
import {
  ArrowLeft,
  Play,
  Pause,
  Check,
  AlertCircle,
  Clock,
  Link as LinkIcon,
  Trash2,
  Calendar as CalendarIcon,
  Repeat
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TaskStatus, ScheduleType } from '../types/task';
import { useTaskStore } from '../store/taskStore';

dayjs.extend(relativeTime);

const { Header, Content } = Layout;
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
    getTaskNextRunTime,
    loadScheduledJobs
  } = useTaskStore();

  useEffect(() => {
    if (taskId) {
      loadTask(taskId);
      loadScheduledJobs();
    }
    return () => {
      clearCurrentTask();
    };
  }, [taskId, loadTask, loadScheduledJobs, clearCurrentTask]);

  const handleStatusToggle = async () => {
    if (!currentTask) return;
    const newStatus = currentTask.status === TaskStatus.ACTIVE ? TaskStatus.PAUSED : TaskStatus.ACTIVE;
    const success = await updateTaskStatus(currentTask.id, newStatus);
    if (success) {
      loadTask(currentTask.id);
    }
  };

  const handleDelete = async () => {
    if (!currentTask) return;
    const success = await deleteTask(currentTask.id);
    if (success) {
      navigate('/tasks');
    }
  };

  const handleJumpToChat = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  if (loading) {
    return (
      <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="加载任务详情..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ height: '100vh', background: '#faf8f5' }}>
        <Content style={{ padding: '48px' }}>
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
            style={{
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(254, 242, 242, 0.8)'
            }}
            action={
              <Button onClick={() => navigate('/tasks')}>返回任务列表</Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  if (!currentTask) {
    return (
      <Layout style={{ height: '100vh', background: '#faf8f5' }}>
        <Content style={{ padding: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Empty
            description="任务不存在"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={() => navigate('/tasks')}>返回任务列表</Button>
          </Empty>
        </Content>
      </Layout>
    );
  }

  const statusConfig = (() => {
    const configs = {
      [TaskStatus.ACTIVE]: { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)', text: '运行中', icon: <Play size={14} /> },
      [TaskStatus.PAUSED]: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.08)', text: '已暂停', icon: <Pause size={14} /> },
      [TaskStatus.COMPLETED]: { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.08)', text: '已完成', icon: <Check size={14} /> },
      [TaskStatus.ERROR]: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.08)', text: '错误', icon: <AlertCircle size={14} /> }
    };
    return configs[currentTask.status];
  })();

  const nextRunTime = getTaskNextRunTime(currentTask.id);
  const nextRun = nextRunTime ? dayjs(nextRunTime) : null;
  const isOverdue = nextRun ? nextRun.isBefore(dayjs()) : false;

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Space size="large">
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
              onClick={() => navigate('/tasks')}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b7355';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
            </div>
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              任务详情
            </Title>
            <Tag style={{
              background: statusConfig.bgColor,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.color}40`,
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {statusConfig.icon}
              {statusConfig.text}
            </Tag>
          </Space>
        </div>
      </Header>

      <Content style={{ flex: 1, padding: '32px 48px', overflow: 'auto' }}>
        {/* 居中容器 */}
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* 基本信息 */}
          <div style={{ marginBottom: '24px' }}>
            <Card
              style={{
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
                background: 'rgba(255, 255, 255, 0.85)',
                height: '100%'
              }}
              styles={{
                body: { padding: '16px' }
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <Text strong style={{
                  fontSize: '18px',
                  color: '#2d2d2d',
                  fontWeight: 600,
                  letterSpacing: '0.3px'
                }}>
                  {currentTask.task_name}
                </Text>
              </div>

              <Row gutter={[16, 14]}>
                <Col span={12}>
                  <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', display: 'block', marginBottom: '6px' }}>
                    调度类型
                  </Text>
                  <Tag style={{
                    background: currentTask.schedule_type === ScheduleType.SINGLE ? 'rgba(59, 130, 246, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                    color: currentTask.schedule_type === ScheduleType.SINGLE ? '#3b82f6' : '#8b5cf6',
                    border: `1px solid ${currentTask.schedule_type === ScheduleType.SINGLE ? '#3b82f6' : '#8b5cf6'}40`,
                    borderRadius: '6px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {currentTask.schedule_type === ScheduleType.SINGLE ? (
                      <><CalendarIcon size={12} strokeWidth={1.5} /> 单次</>
                    ) : (
                      <><Repeat size={12} strokeWidth={1.5} /> 周期</>
                    )}
                  </Tag>
                </Col>

                <Col span={12}>
                  <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', display: 'block', marginBottom: '6px' }}>
                    图名称
                  </Text>
                  <Text strong style={{ fontSize: '13px', color: '#2d2d2d' }}>
                    {currentTask.graph_name}
                  </Text>
                </Col>

                <Col span={12}>
                  <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', display: 'block', marginBottom: '6px' }}>
                    并发数量
                  </Text>
                  <Text strong style={{ fontSize: '13px', color: '#2d2d2d' }}>
                    {currentTask.execution_count}
                  </Text>
                </Col>

                <Col span={12}>
                  <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', display: 'block', marginBottom: '6px' }}>
                    创建时间
                  </Text>
                  <Text style={{ fontSize: '13px', color: '#2d2d2d' }}>
                    {dayjs(currentTask.created_at).format('MM-DD HH:mm')}
                  </Text>
                </Col>

                {nextRun && (
                  <Col span={24}>
                    <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', display: 'block', marginBottom: '6px' }}>
                      下次运行
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color={isOverdue ? '#ef4444' : '#10b981'} strokeWidth={1.5} />
                      <Text style={{
                        fontSize: '13px',
                        color: isOverdue ? '#ef4444' : '#10b981',
                        fontWeight: 500
                      }}>
                        {nextRun.format('MM-DD HH:mm')} ({isOverdue ? '已过期' : nextRun.fromNow()})
                      </Text>
                    </div>
                  </Col>
                )}

                {currentTask.input_text && (
                  <Col span={24}>
                    <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', display: 'block', marginBottom: '6px' }}>
                      输入文本
                    </Text>
                    <Text style={{
                      fontSize: '13px',
                      color: '#2d2d2d',
                      display: 'block',
                      wordBreak: 'break-word',
                      padding: '6px 10px',
                      background: 'rgba(250, 248, 245, 0.6)',
                      borderRadius: '4px',
                      border: '1px solid rgba(139, 115, 85, 0.1)'
                    }}>
                      {currentTask.input_text}
                    </Text>
                  </Col>
                )}
              </Row>

              <div style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(139, 115, 85, 0.1)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <Button
                  icon={currentTask.status === TaskStatus.ACTIVE ? <Pause size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />}
                  onClick={handleStatusToggle}
                  disabled={currentTask.status === TaskStatus.COMPLETED}
                  size="small"
                  style={{
                    borderRadius: '6px',
                    border: '1px solid rgba(139, 115, 85, 0.2)',
                    color: '#8b7355',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {currentTask.status === TaskStatus.ACTIVE ? '暂停' : '启动'}
                </Button>
                <Button
                  icon={<Check size={14} strokeWidth={1.5} />}
                  disabled={currentTask.status === TaskStatus.COMPLETED}
                  onClick={() => updateTaskStatus(currentTask.id, TaskStatus.COMPLETED)}
                  size="small"
                  style={{
                    borderRadius: '6px',
                    border: '1px solid rgba(139, 115, 85, 0.2)',
                    color: '#8b7355',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  完成
                </Button>
                <Button
                  danger
                  icon={<Trash2 size={14} strokeWidth={1.5} />}
                  onClick={() => setDeleteModalVisible(true)}
                  size="small"
                  style={{
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  删除
                </Button>
              </div>
            </Card>
          </div>

          {/* 执行历史 - 卡片式 */}
          <Card
          title={
            <Text strong style={{ fontSize: '16px', color: '#2d2d2d', fontWeight: 600 }}>
              执行历史
            </Text>
          }
          style={{
            borderRadius: '8px',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
            background: 'rgba(255, 255, 255, 0.85)'
          }}
        >
          {currentTask.execution_history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(45, 45, 45, 0.45)' }}>
              暂无执行记录
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {currentTask.execution_history.map((history, index) => (
                <Col key={`${history.executed_at}-${index}`} xs={24} sm={12} md={12} lg={8}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: '6px',
                      border: '1px solid rgba(139, 115, 85, 0.15)',
                      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
                      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                      background: 'rgba(250, 248, 245, 0.6)'
                    }}
                    styles={{
                      body: { padding: '16px' }
                    }}
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
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Clock size={14} color="#8b7355" strokeWidth={1.5} />
                        <Text strong style={{ fontSize: '13px', color: '#2d2d2d' }}>
                          {dayjs(history.executed_at).format('MM-DD HH:mm:ss')}
                        </Text>
                      </div>
                      <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
                        {dayjs(history.executed_at).fromNow()}
                      </Text>
                    </div>

                    <Tag style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '6px',
                      fontWeight: 500,
                      fontSize: '12px',
                      padding: '4px 8px',
                      marginBottom: '12px'
                    }}>
                      {history.executions.length} 个实例
                    </Tag>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {history.executions.map((execution) => (
                        <div
                          key={execution.conversation_id}
                          style={{
                            padding: '6px 8px',
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          onClick={() => handleJumpToChat(execution.conversation_id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                          }}
                        >
                          <LinkIcon size={12} color="#8b7355" strokeWidth={1.5} />
                          <Text code style={{
                            fontSize: '11px',
                            background: 'transparent',
                            padding: 0,
                            fontFamily: 'Monaco, Courier New, monospace',
                            color: '#8b7355'
                          }}>
                            {execution.conversation_id.slice(-12)}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
          </Card>
        </div>
      </Content>

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
    </Layout>
  );
};

export default TaskDetail;
