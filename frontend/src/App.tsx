// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import WorkspaceLayout from './layouts/WorkspaceLayout';
import PrivateRoute from './components/common/PrivateRoute';
import { isAuthenticated } from './utils/auth';
import { I18nProvider, useI18n } from './i18n';

// Import pages
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import ChatSystem from './pages/ChatSystem';
import GraphEditor from './pages/GraphEditor';
import ModelManager from './pages/ModelManager';
import MCPManager from './pages/MCPManager';
import PromptManager from './pages/PromptManager';
import AgentManager from './pages/AgentManager';
import SystemToolsManager from './pages/SystemToolsManager';
import ExportManager from './pages/ExportManager';
import TaskManager from './pages/TaskManager';
import TaskDetail from './pages/TaskDetail';
import PreviewPage from './pages/PreviewPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPanel from './pages/AdminPanel';
import FileManager from './pages/FileManager';

// AppContent component that uses i18n context
const AppContent: React.FC = () => {
  const { locale } = useI18n();
  const antdLocale = locale === 'zh' ? zhCN : enUS;

  useEffect(() => {
    // 设置页面标题
    document.title = "MCP Agent Graph";
  }, []);

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        token: {
          colorPrimary: '#b85845',
          colorPrimaryHover: '#a0826d',
          colorBorder: 'rgba(139, 115, 85, 0.2)',
          colorBorderSecondary: 'rgba(139, 115, 85, 0.15)',
          colorText: '#2d2d2d',
          colorTextPlaceholder: 'rgba(45, 45, 45, 0.35)',
          borderRadius: 6,
          controlHeight: 40,
        },
        components: {
          Input: {
            activeBorderColor: '#b85845',
            hoverBorderColor: 'rgba(184, 88, 69, 0.4)',
            activeShadow: '0 0 0 2px rgba(184, 88, 69, 0.1)',
          },
          InputNumber: {
            activeBorderColor: '#b85845',
            hoverBorderColor: 'rgba(184, 88, 69, 0.4)',
            activeShadow: '0 0 0 2px rgba(184, 88, 69, 0.1)',
          },
          Select: {
            optionSelectedBg: 'rgba(184, 88, 69, 0.08)',
            optionActiveBg: 'rgba(184, 88, 69, 0.05)',
          },
        },
      }}
    >
      <AntApp>
        <Router>
      <Routes>
        {/* 公开路由 - 登录和注册 */}
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated() ? <Navigate to="/" replace /> : <RegisterPage />}
        />

        {/* 受保护的路由 - 主入口页面 */}
        <Route path="/" element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } />

        {/* 受保护的路由 - 对话系统 */}
        <Route path="/chat" element={
          <PrivateRoute>
            <ChatSystem />
          </PrivateRoute>
        } />
        <Route path="/chat/:conversationId" element={
          <PrivateRoute>
            <ChatSystem />
          </PrivateRoute>
        } />

        {/* 受保护的路由 - 任务管理 */}
        <Route path="/tasks" element={
          <PrivateRoute>
            <TaskManager />
          </PrivateRoute>
        } />
        <Route path="/tasks/:taskId" element={
          <PrivateRoute>
            <TaskDetail />
          </PrivateRoute>
        } />

        {/* 受保护的路由 - 导出管理 */}
        <Route path="/export" element={
          <PrivateRoute>
            <ExportManager />
          </PrivateRoute>
        } />

        {/* 受保护的路由 - 可分享预览页面 */}
        <Route path="/preview" element={
          <PrivateRoute>
            <PreviewPage />
          </PrivateRoute>
        } />

        {/* 受保护的路由 - 工作台入口 */}
        <Route path="/workspace" element={
          <PrivateRoute>
            <Workspace />
          </PrivateRoute>
        } />

        {/* 受保护的路由 - 工作台子页面 */}
        <Route
          path="/workspace/agent-manager"
          element={
            <PrivateRoute>
              <WorkspaceLayout>
                <AgentManager />
              </WorkspaceLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/graph-editor"
          element={
            <PrivateRoute>
              <WorkspaceLayout>
                <GraphEditor />
              </WorkspaceLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/model-manager"
          element={
            <PrivateRoute>
              <WorkspaceLayout>
                <ModelManager />
              </WorkspaceLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/system-tools"
          element={
            <PrivateRoute>
              <WorkspaceLayout>
                <SystemToolsManager />
              </WorkspaceLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/mcp-manager"
          element={
            <PrivateRoute>
              <WorkspaceLayout>
                <MCPManager />
              </WorkspaceLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/prompt-manager"
          element={
            <PrivateRoute>
              <WorkspaceLayout>
                <PromptManager />
              </WorkspaceLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/file-manager"
          element={
            <PrivateRoute>
              <WorkspaceLayout>
                <FileManager />
              </WorkspaceLayout>
            </PrivateRoute>
          }
        />

        {/* 受保护的路由 - 管理员页面 */}
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminPanel />
          </PrivateRoute>
        } />

        {/* 重定向旧路由到新的工作台路由 */}
        <Route path="/graph-editor" element={<Navigate to="/workspace/graph-editor" replace />} />
        <Route path="/model-manager" element={<Navigate to="/workspace/model-manager" replace />} />
        <Route path="/mcp-manager" element={<Navigate to="/workspace/mcp-manager" replace />} />
        <Route path="/prompt-manager" element={<Navigate to="/workspace/prompt-manager" replace />} />

        {/* 默认重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
};

// Main App component wrapped with I18nProvider
const App: React.FC = () => {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
};

export default App;
