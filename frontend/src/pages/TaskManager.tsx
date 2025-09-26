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

  // 刷新所有数据
  const handleRefreshAll = () => {
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

      {/* 统计卡片 - Minimal风格 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap' }}>
        <Col xs={12} sm={8} md={4}>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: '16px', 
            padding: '12px 20px',
            border: '1px solid rgba(203, 213, 225, 0.6)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#94a3b8', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ color: '#475569', fontSize: '14px' }}>总任务</span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{stats.total}</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: '16px', 
            padding: '12px 20px',
            border: '1px solid rgba(203, 213, 225, 0.6)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#10b981', 
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{ color: '#475569', fontSize: '14px' }}>运行中</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>{stats.active}</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: '16px', 
            padding: '12px 20px',
            border: '1px solid rgba(203, 213, 225, 0.6)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#f59e0b', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ color: '#475569', fontSize: '14px' }}>已暂停</span>
              <span style={{ fontWeight: 600, color: '#d97706' }}>{stats.paused}</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: '16px', 
            padding: '12px 20px',
            border: '1px solid rgba(203, 213, 225, 0.6)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#3b82f6', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ color: '#475569', fontSize: '14px' }}>已完成</span>
              <span style={{ fontWeight: 600, color: '#2563eb' }}>{stats.completed}</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: '16px', 
            padding: '12px 20px',
            border: '1px solid rgba(203, 213, 225, 0.6)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#ef4444', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ color: '#475569', fontSize: '14px' }}>错误</span>
              <span style={{ fontWeight: 600, color: '#dc2626' }}>{stats.error}</span>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: '16px', 
            padding: '12px 20px',
            border: '1px solid rgba(203, 213, 225, 0.6)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#8b5cf6', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ color: '#475569', fontSize: '14px' }}>调度中</span>
              <span style={{ fontWeight: 600, color: '#7c3aed' }}>{stats.scheduled}</span>
            </div>
          </div>
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