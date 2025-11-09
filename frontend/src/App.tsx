// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WorkspaceLayout from './layouts/WorkspaceLayout';
import PrivateRoute from './components/common/PrivateRoute';
import { isAuthenticated } from './utils/auth';

// Import pages
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import ChatSystem from './pages/ChatSystem';
import GraphEditor from './pages/GraphEditor';
import ModelManager from './pages/ModelManager';
import MCPManager from './pages/MCPManager';
import PromptManager from './pages/PromptManager';
import ExportManager from './pages/ExportManager';
import TaskManager from './pages/TaskManager';
import TaskDetail from './pages/TaskDetail';
import PreviewPage from './pages/PreviewPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPanel from './pages/admin/AdminPanel';

const App: React.FC = () => {
  useEffect(() => {
    // 设置页面标题
    document.title = "MCP Agent Graph";
  }, []);

  return (
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
  );
};

export default App;
