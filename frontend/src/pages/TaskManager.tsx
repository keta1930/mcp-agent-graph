import React, { useState, useEffect } from 'react';
import {
  Button,
  FloatButton,
  Typography,
  Space,
  Statistic,
  Row,
  Col,
  Card,
  message,
  Alert
} from 'antd';
import {
  PlusOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { TaskStatus } from '../types/task';
import TaskList from '../components/task/TaskList';
import TaskCreateForm from '../components/task/TaskCreateForm';

const { Title } = Typography;

const TaskManager: React.FC = () => {
  const navigate = useNavigate();
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const {
    tasks,
    scheduledJobs,
    loading,
    error,
    loadTasks,
    loadScheduledJobs,
    reloadScheduler,
    clearError
  } = useTaskStore();

  // 初始化加载
  useEffect(() => {
    loadTasks();
    loadScheduledJobs();
  }, [loadTasks, loadScheduledJobs]);

  // 统计数据
  const stats = React.useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter(t => t.status === TaskStatus.ACTIVE).length,
      paused: tasks.filter(t => t.status === TaskStatus.PAUSED).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      error: tasks.filter(t => t.status === TaskStatus.ERROR).length,
      scheduled: scheduledJobs.length
    };
  }, [tasks, scheduledJobs]);

  // 处理调度器重载
  const handleReloadScheduler = async () => {
    const success = await reloadScheduler();
    if (success) {
      message.success('调度器重新加载成功');
    }
  };

  // 创建任务成功回调
  const handleCreateSuccess = () => {
    message.success('任务创建成功');
    loadTasks();
    loadScheduledJobs();
  };

  return (
    <div style={{
      padding: '24px',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* 页面头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ClockCircleOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
          <Title level={2} style={{ margin: 0 }}>
            任务中心
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

      {/* 错误提示 */}
      {error && (
        <Alert
          message="操作失败"
          description={error}
          type="error"
          closable
          onClose={clearError}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="总任务"
              value={stats.total}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="运行中"
              value={stats.active}
              valueStyle={{ color: '#3f8600' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="已暂停"
              value={stats.paused}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<PauseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="错误"
              value={stats.error}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="调度中"
              value={stats.scheduled}
              valueStyle={{ color: '#722ed1' }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作按钮栏 */}
      <div style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建任务
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={handleReloadScheduler}
            loading={loading}
          >
            重载调度器
          </Button>
        </Space>

        {scheduledJobs.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            调度器中有 {scheduledJobs.length} 个活跃任务
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <Card style={{ backgroundColor: 'white' }}>
        <TaskList onCreateTask={() => setCreateModalVisible(true)} />
      </Card>

      {/* 浮动创建按钮 */}
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        onClick={() => setCreateModalVisible(true)}
        tooltip="创建新任务"
      />

      {/* 创建任务表单 */}
      <TaskCreateForm
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default TaskManager;