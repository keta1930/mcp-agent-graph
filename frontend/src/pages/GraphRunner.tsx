// src/pages/GraphRunner.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Alert, Button, Drawer } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import ConversationHistory from '../components/graph-runner/ConversationHistory';
import InputArea from '../components/graph-runner/InputArea';
import ResultsPanel from '../components/graph-runner/ResultsPanel';
import { useGraphRunnerStore } from '../store/graphRunnerStore';

import '../styles/graph-runner.css';

const { Content } = Layout;

const GraphRunner: React.FC = () => {
  const { fetchGraphs, fetchConversationList, error, conversationList } = useGraphRunnerStore();
  const [conversationDrawerVisible, setConversationDrawerVisible] = useState(false);

  useEffect(() => {
    fetchGraphs();
    fetchConversationList();
  }, [fetchGraphs, fetchConversationList]);

  const toggleConversationDrawer = () => {
    setConversationDrawerVisible(!conversationDrawerVisible);
  };

  return (
    <Layout style={{ height: '100vh', background: '#f5f5f5' }}>
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          style={{ 
            position: 'fixed', 
            top: '16px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 1000,
            maxWidth: '600px'
          }}
          closable
        />
      )}

      {/* 主内容区域 */}
      <Content style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh',
        position: 'relative'
      }}>
        {/* 右侧会话历史按钮 */}
        <div className="conversation-sidebar-button">
          <Button
            type={conversationDrawerVisible ? "primary" : "default"}
            onClick={toggleConversationDrawer}
            className="sidebar-toggle-button"
            title={conversationDrawerVisible ? '收起会话历史' : '展开会话历史'}
          >
            <div className="sidebar-button-content">
              <div className="sidebar-button-text">
                会话历史
              </div>
            </div>
          </Button>
        </div>

        {/* 结果展示区域 */}
        <div style={{ 
          flex: 1, 
          padding: '20px 60px 120px 20px', // 右侧留出空间给侧边栏按钮
          overflow: 'auto'
        }}>
          <ResultsPanel />
        </div>

        {/* 底部输入区域 */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 200,
          right: 240,
          background: '#fff',
          borderTop: '1px solid #e8e8e8',
          borderRadius: '16px 16px 0 0',
          padding: '16px 20px',
          zIndex: 999,
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <InputArea />
        </div>
      </Content>

      {/* 会话历史抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <HistoryOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            会话历史
            {conversationList.length > 0 && (
              <div style={{
                marginLeft: 'auto',
                background: '#1890ff',
                color: 'white',
                borderRadius: '10px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {conversationList.length}
              </div>
            )}
          </div>
        }
        placement="right"
        onClose={() => setConversationDrawerVisible(false)}
        open={conversationDrawerVisible}
        width={400}
        styles={{
          body: { padding: 0 },
          header: { 
            borderBottom: '1px solid #f0f0f0',
            background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)'
          }
        }}
        className="conversation-drawer"
      >
        <ConversationHistory />
      </Drawer>
    </Layout>
  );
};

export default GraphRunner;