// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Import pages
import GraphEditor from './pages/GraphEditor';
import ModelManager from './pages/ModelManager';
import MCPManager from './pages/MCPManager';
import GraphRunner from './pages/GraphRunner';

const App: React.FC = () => {
  useEffect(() => {
    // 设置页面标题
    document.title = "AgentGraph";
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/graph-editor" replace />} />
        <Route
          path="/graph-editor"
          element={
            <MainLayout>
              <GraphEditor />
            </MainLayout>
          }
        />
        <Route
          path="/model-manager"
          element={
            <MainLayout>
              <ModelManager />
            </MainLayout>
          }
        />
        <Route
          path="/mcp-manager"
          element={
            <MainLayout>
              <MCPManager />
            </MainLayout>
          }
        />
        <Route
          path="/graph-runner"
          element={
            <MainLayout>
              <GraphRunner />
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;