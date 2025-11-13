import React, { useState, useEffect } from 'react';
import {
  Layout,
  Space,
  Tag,
  Typography,
  message,
  Alert
} from 'antd';
import { Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { TaskStatus } from '../types/task';
import TaskList from '../components/task/TaskList';
import TaskCreateForm from '../components/task/TaskCreateForm';

const { Header, Content } = Layout;
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

  useEffect(() => {
    loadTasks();
    loadScheduledJobs();
  }, [loadTasks, loadScheduledJobs]);

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

  const handleReloadScheduler = async () => {
    const success = await reloadScheduler();
    if (success) {
      message.success('调度器重新加载成功');
    }
  };

  const handleCreateSuccess = () => {
    message.success('任务创建成功');
    loadTasks();
    loadScheduledJobs();
  };

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
            <Calendar size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              任务中心
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {stats.total} 个任务
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {stats.active} 运行中
            </Tag>
          </Space>
          
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
            onClick={() => navigate('/chat')}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8b7355';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} strokeWidth={1.5} />
          </div>
        </div>
      </Header>

      <Content style={{ flex: 1, padding: '32px 48px', overflow: 'auto' }}>
        {error && (
          <Alert
            message="操作失败"
            description={error}
            type="error"
            closable
            onClose={clearError}
            style={{
              marginBottom: 24,
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(254, 242, 242, 0.8)'
            }}
          />
        )}

        <TaskList 
          onCreateTask={() => setCreateModalVisible(true)}
          scheduledJobsCount={scheduledJobs.length}
          onReloadScheduler={handleReloadScheduler}
          loading={loading}
          stats={stats}
        />
      </Content>

      <TaskCreateForm
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </Layout>
  );
};

export default TaskManager;