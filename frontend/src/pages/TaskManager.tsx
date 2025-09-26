import React, { useState, useEffect } from 'react';
import {
  Button,
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
      minHeight: '100vh'
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

      {/* 任务列表 */}
      <Card 
        style={{ 
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
        bodyStyle={{
          padding: 0
        }}
      >
        <TaskList 
          onCreateTask={() => setCreateModalVisible(true)}
          scheduledJobsCount={scheduledJobs.length}
          onReloadScheduler={handleReloadScheduler}
          loading={loading}
          stats={stats}
        />
      </Card>

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