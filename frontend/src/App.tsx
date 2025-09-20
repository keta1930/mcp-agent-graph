// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WorkspaceLayout from './layouts/WorkspaceLayout';

// Import pages
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import ChatSystem from './pages/ChatSystem';
import GraphEditor from './pages/GraphEditor';
import ModelManager from './pages/ModelManager';
import MCPManager from './pages/MCPManager';
import PromptManager from './pages/PromptManager';

const App: React.FC = () => {
  useEffect(() => {
    // 设置页面标题
    document.title = "MCP Agent Graph";
  }, []);

  return (
    <Router>
      <Routes>
        {/* 主入口页面 */}
        <Route path="/" element={<Home />} />
        
        {/* 对话系统 */}
        <Route path="/chat" element={<ChatSystem />} />
        
        {/* 工作台入口 */}
        <Route path="/workspace" element={<Workspace />} />
        
        {/* 工作台子页面 */}
        <Route
          path="/workspace/graph-editor"
          element={
            <WorkspaceLayout>
              <GraphEditor />
            </WorkspaceLayout>
          }
        />
        <Route
          path="/workspace/model-manager"
          element={
            <WorkspaceLayout>
              <ModelManager />
            </WorkspaceLayout>
          }
        />
        <Route
          path="/workspace/mcp-manager"
          element={
            <WorkspaceLayout>
              <MCPManager />
            </WorkspaceLayout>
          }
        />
        <Route
          path="/workspace/prompt-manager"
          element={
            <WorkspaceLayout>
              <PromptManager />
            </WorkspaceLayout>
          }
        />

        {/* 重定向旧路由到新的工作台路由 */}
        <Route path="/graph-editor" element={<Navigate to="/workspace/graph-editor" replace />} />
        <Route path="/model-manager" element={<Navigate to="/workspace/model-manager" replace />} />
        <Route path="/mcp-manager" element={<Navigate to="/workspace/mcp-manager" replace />} />
        <Route path="/prompt-manager" element={<Navigate to="/workspace/prompt-manager" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
