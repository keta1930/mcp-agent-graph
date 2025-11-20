// 图编辑器主组件
import React, { useEffect, useState } from 'react';
import { Alert, Modal, message } from 'antd';
import { Sparkles } from 'lucide-react';
import { Typography } from 'antd';
import AddNodeModal from '../components/graph-editor/AddNodeModal';
import GraphVersionManager from '../components/graph-editor/GraphVersionManager';
import GraphListView from '../components/graph-editor/GraphListView';
import GraphEditorView from '../components/graph-editor/GraphEditorView';
import CreateGraphModal from '../components/graph-editor/CreateGraphModal';
import GraphSettingsModal from '../components/graph-editor/GraphSettingsModal';
import ReadmeModal from '../components/graph-editor/ReadmeModal';
import DeleteConfirmDialog from '../components/graph-editor/DeleteConfirmDialog';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useMCPStore } from '../store/mcpStore';
import { useModelStore } from '../store/modelStore';
import { useT } from '../i18n/hooks';
import { ViewMode } from '../utils/graphEditorConstants';
import { generateNodePosition } from '../utils/graphEditorUtils';
import { buttonStyles, modalStyles } from '../utils/graphEditorConstants';

const { Text } = Typography;

/**
 * 图编辑器页面
 */
const GraphEditor: React.FC = () => {
  const t = useT();
  const {
    fetchGraphs,
    addNode,
    loading,
    error,
    currentGraph,
    selectedNode,
    selectNode,
    createNewGraph,
    deleteGraph,
    graphs,
    loadGraph,
    saveGraph,
    dirty: hasUnsavedChanges,
    exportGraph,
    generateMCPScript,
    getGraphReadme,
    updateGraphProperties,
    autoLayout,
    importGraphFromFile,
    importGraphPackageFromFile
  } = useGraphEditorStore();

  const { fetchConfig, fetchStatus } = useMCPStore();
  const { fetchModels } = useModelStore();

  // 状态管理
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [addNodeModalVisible, setAddNodeModalVisible] = useState(false);
  const [newGraphModalVisible, setNewGraphModalVisible] = useState(false);
  const [versionManagerVisible, setVersionManagerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredGraphs, setFilteredGraphs] = useState<string[]>(graphs);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState<string | null>(null);
  const [promptTemplateModalVisible, setPromptTemplateModalVisible] = useState(false);
  const [readmeModalVisible, setReadmeModalVisible] = useState(false);
  const [readmeContent, setReadmeContent] = useState('');
  const [graphSettingsModalVisible, setGraphSettingsModalVisible] = useState(false);

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchGraphs(),
          fetchConfig(),
          fetchStatus(),
          fetchModels()
        ]);
      } catch (error) {
        console.error('Failed to initialize data:', error);
      }
    };

    initializeData();

    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 30000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [fetchGraphs, fetchConfig, fetchStatus, fetchModels]);

  // 搜索过滤
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredGraphs(graphs);
    } else {
      const keyword = searchText.toLowerCase();
      const filtered = graphs.filter(graphName =>
        graphName.toLowerCase().includes(keyword)
      );
      setFilteredGraphs(filtered);
    }
  }, [searchText, graphs]);

  // 自动切换视图模式
  useEffect(() => {
    if (currentGraph) {
      setViewMode('editor');
    } else {
      setViewMode('list');
    }
  }, [currentGraph]);

  // 创建新图
  const handleCreateNewGraph = async (values: { name: string; description?: string }) => {
    try {
      createNewGraph(values.name, values.description || '');
      message.success(t('pages.graphEditor.createSuccess', { name: values.name }));
    } catch (error: any) {
      message.error(t('pages.graphEditor.createFailed', { error: error.message || t('errors.serverError') }));
      throw error;
    }
  };

  // 进入编辑模式
  const handleEditGraph = (graphName: string) => {
    loadGraph(graphName);
  };

  // 返回列表
  const handleBackToList = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: t('pages.graphEditor.saveChangesTitle'),
        content: t('pages.graphEditor.saveChangesMessage'),
        okText: t('pages.graphEditor.saveAndReturn'),
        cancelText: t('pages.graphEditor.returnDirectly'),
        onOk: async () => {
          await saveGraph();
          selectNode(null);
          setViewMode('list');
        },
        onCancel: () => {
          selectNode(null);
          setViewMode('list');
        }
      });
    } else {
      selectNode(null);
      setViewMode('list');
    }
  };

  // 删除图
  const handleDeleteGraph = async (graphName: string) => {
    try {
      await deleteGraph(graphName);
      message.success(t('pages.graphEditor.deleteSuccess', { name: graphName }));
      setDeleteConfirmVisible(null);
    } catch (error: any) {
      message.error(t('pages.graphEditor.deleteFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 导出为压缩包
  const handleExportPackage = async (graphName: string) => {
    try {
      await exportGraph(graphName);
      message.success(t('pages.graphEditor.exportSuccess', { name: graphName }));
    } catch (error: any) {
      message.error(t('pages.graphEditor.exportFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 导出为 MCP Script
  const handleExportMCP = async (graphName: string) => {
    try {
      await generateMCPScript(graphName);
      message.success(t('pages.graphEditor.exportMCPSuccess'));
    } catch (error: any) {
      message.error(t('pages.graphEditor.exportFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 导入文件
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      let result;

      if (fileName.endsWith('.json')) {
        result = await importGraphFromFile(file);
        message.success(t('pages.graphEditor.importSuccess', { name: result.graph_name || file.name }));
      } else if (fileName.endsWith('.zip')) {
        result = await importGraphPackageFromFile(file);
        message.success(t('pages.graphEditor.importPackageSuccess', { name: result.graph_name || file.name }));
      } else {
        message.error(t('pages.graphEditor.unsupportedFileType'));
        return;
      }

      event.target.value = '';
    } catch (error: any) {
      message.error(t('pages.graphEditor.importFailed', { error: error.message || t('errors.serverError') }));
      event.target.value = '';
    }
  };

  // 添加节点
  const handleAddNode = (nodeData: any) => {
    const position = generateNodePosition();
    addNode({ ...nodeData, position });
    setAddNodeModalVisible(false);
  };

  // 保存当前图
  const handleSave = async () => {
    try {
      await saveGraph();
      message.success(t('pages.graphEditor.saveSuccess'));
    } catch (error: any) {
      message.error(t('pages.graphEditor.saveFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 查看 README
  const handleViewReadme = async () => {
    if (!currentGraph) return;
    try {
      const result = await getGraphReadme(currentGraph.name);
      setReadmeContent(result.readme);
      setReadmeModalVisible(true);
    } catch (error: any) {
      message.error(t('pages.graphEditor.readmeFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 自动布局
  const handleAutoLayout = () => {
    autoLayout();
    message.success(t('pages.graphEditor.autoLayoutSuccess'));
  };

  // 更新图设置
  const handleUpdateGraphSettings = async (values: { name: string; description?: string; end_template?: string }) => {
    try {
      updateGraphProperties(values);
      message.success(t('pages.graphEditor.graphSettingsUpdated'));
    } catch (error: any) {
      message.error(t('pages.graphEditor.graphSettingsUpdateFailed', { error: error.message || t('errors.serverError') }));
      throw error;
    }
  };

  return (
    <div>
      {error && (
        <Alert
          message={t('pages.graphEditor.error')}
          description={error}
          type="error"
          showIcon
          closable
          style={{ margin: '16px' }}
        />
      )}

      {/* 主视图 */}
      {viewMode === 'list' ? (
        <GraphListView
          loading={loading}
          graphs={graphs}
          filteredGraphs={filteredGraphs}
          searchText={searchText}
          onSearchChange={setSearchText}
          onCreateGraph={() => setNewGraphModalVisible(true)}
          onImportFile={handleImportFile}
          onShowPromptTemplate={() => setPromptTemplateModalVisible(true)}
          onEditGraph={handleEditGraph}
          onExportPackage={handleExportPackage}
          onExportMCP={handleExportMCP}
          onDeleteGraph={(graphName) => setDeleteConfirmVisible(graphName)}
        />
      ) : (
        <GraphEditorView
          graphName={currentGraph?.name || ''}
          graphDescription={currentGraph?.description}
          hasUnsavedChanges={hasUnsavedChanges}
          selectedNode={selectedNode}
          onBack={handleBackToList}
          onSave={handleSave}
          onViewReadme={handleViewReadme}
          onAutoLayout={handleAutoLayout}
          onAddNode={() => setAddNodeModalVisible(true)}
          onGraphSettings={() => setGraphSettingsModalVisible(true)}
          onVersionManager={() => setVersionManagerVisible(true)}
          onCloseNodePanel={() => selectNode(null)}
        />
      )}

      {/* 模态框组件 */}
      <CreateGraphModal
        visible={newGraphModalVisible}
        onOk={handleCreateNewGraph}
        onCancel={() => setNewGraphModalVisible(false)}
      />

      <GraphSettingsModal
        visible={graphSettingsModalVisible}
        graphName={currentGraph?.name}
        description={currentGraph?.description}
        endTemplate={currentGraph?.end_template}
        onOk={handleUpdateGraphSettings}
        onCancel={() => setGraphSettingsModalVisible(false)}
      />

      <ReadmeModal
        visible={readmeModalVisible}
        content={readmeContent}
        onClose={() => setReadmeModalVisible(false)}
      />

      <DeleteConfirmDialog
        visible={!!deleteConfirmVisible}
        graphName={deleteConfirmVisible || ''}
        onConfirm={() => deleteConfirmVisible && handleDeleteGraph(deleteConfirmVisible)}
        onCancel={() => setDeleteConfirmVisible(null)}
      />

      <AddNodeModal
        visible={addNodeModalVisible}
        onClose={() => setAddNodeModalVisible(false)}
        onAdd={handleAddNode}
      />

      {currentGraph && (
        <GraphVersionManager
          visible={versionManagerVisible}
          onClose={() => setVersionManagerVisible(false)}
          graphName={currentGraph.name}
        />
      )}

      {/* AI 提示词模态框 */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Sparkles size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <span style={{
              color: '#2d2d2d',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              {t('pages.graphEditor.aiPromptTitle')}
            </span>
          </div>
        }
        open={promptTemplateModalVisible}
        onCancel={() => setPromptTemplateModalVisible(false)}
        footer={[
          <button
            key="close"
            onClick={() => setPromptTemplateModalVisible(false)}
            style={{
              ...buttonStyles.modalCancel,
              cursor: 'pointer',
              border: buttonStyles.modalCancel.border
            }}
          >
            {t('pages.graphEditor.close')}
          </button>
        ]}
        width={700}
        styles={modalStyles}
      >
        <div style={{
          textAlign: 'center',
          padding: '20px'
        }}>
          <Sparkles size={48} strokeWidth={1.5} style={{ color: 'rgba(184, 88, 69, 0.5)', margin: '0 auto 16px' }} />
          <Text style={{
            fontSize: '16px',
            color: 'rgba(45, 45, 45, 0.85)',
            display: 'block',
            marginBottom: '12px'
          }}>
            {t('pages.graphEditor.aiPromptMessage')}
          </Text>
          <Text style={{
            fontSize: '14px',
            color: 'rgba(45, 45, 45, 0.65)'
          }}>
            {t('pages.graphEditor.aiPromptHint')}
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default GraphEditor;
