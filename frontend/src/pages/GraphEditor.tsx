// src/pages/GraphEditor.tsx
import React, { useEffect, useState, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import {
  Layout,
  Card,
  Alert,
  Spin,
  Typography,
  Empty,
  Button,
  Tooltip,
  Space,
  Modal,
  Drawer,
  Form,
  Input,
  Row,
  Col,
  Tag,
  message
} from 'antd';
import {
  Plus,
  Workflow,
  Search as SearchIcon,
  Sparkles,
  Edit,
  Trash2,
  Download,
  Server,
  ArrowLeft,
  FileText,
  LayoutGrid,
  Settings,
  Save,
  GitBranch,
  Eye,
  Code,
  PackagePlus
} from 'lucide-react';
import GraphCanvas from '../components/graph-editor/GraphCanvas';
import NodePropertiesPanel from '../components/graph-editor/NodePropertiesPanel';
import AddNodeModal from '../components/graph-editor/AddNodeModal';
import GraphVersionManager from '../components/graph-editor/GraphVersionManager';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useMCPStore } from '../store/mcpStore';
import { useModelStore } from '../store/modelStore';
import { useT } from '../i18n/hooks';

const { Header, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

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

  // 视图模式：'list' 或 'editor'
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
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

  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();

  useEffect(() => {
    // Initialize all data
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

    // Periodically refresh MCP status
    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 30000); // Refresh every 30 seconds

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
  const handleCreateNewGraph = () => {
    form.resetFields();
    setNewGraphModalVisible(true);
  };

  const handleNewGraphSubmit = async () => {
    try {
      const values = await form.validateFields();
      createNewGraph(values.name, values.description);
      setNewGraphModalVisible(false);
      message.success(t('pages.graphEditor.createSuccess', { name: values.name }));
    } catch (error: any) {
      message.error(t('pages.graphEditor.createFailed', { error: error.message || t('errors.serverError') }));
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
      const result = await exportGraph(graphName);
      message.success(t('pages.graphEditor.exportSuccess', { name: graphName }));
      if (result.file_path) {
        message.info(t('pages.graphEditor.exportFilePath', { path: result.file_path }));
      }
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

      // 清空文件输入，允许重复导入同一文件
      event.target.value = '';
    } catch (error: any) {
      message.error(t('pages.graphEditor.importFailed', { error: error.message || t('errors.serverError') }));
      event.target.value = '';
    }
  };

  // 添加节点
  const handleAddNode = (nodeData: any) => {
    const baseX = 250;
    const baseY = 150;
    const randomOffset = () => (Math.random() - 0.5) * 100;

    const position = {
      x: baseX + randomOffset(),
      y: baseY + randomOffset()
    };

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

  // 图设置
  const handleGraphSettings = () => {
    if (currentGraph) {
      settingsForm.setFieldsValue({
        name: currentGraph.name,
        description: currentGraph.description || '',
        end_template: currentGraph.end_template || ''
      });
      setGraphSettingsModalVisible(true);
    }
  };

  const handleUpdateGraphSettings = async () => {
    try {
      const values = await settingsForm.validateFields();
      updateGraphProperties(values);
      setGraphSettingsModalVisible(false);
      message.success(t('pages.graphEditor.graphSettingsUpdated'));
    } catch (error: any) {
      // Form validation error
    }
  };

  // 渲染列表视图
  const renderListView = () => (
    <Layout style={{ minHeight: '100vh', background: '#faf8f5' }}>
      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* 左侧：图标 + 标题 + 统计标签 */}
          <Space size="large">
            <Workflow size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              {t('pages.graphEditor.title')}
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
              {t('pages.graphEditor.workflowsCount', { count: graphs.length })}
            </Tag>
          </Space>

          {/* 右侧：搜索框 + 操作按钮 */}
          <Space size={12}>
            <Input
              placeholder={t('pages.graphEditor.searchPlaceholder')}
              allowClear
              prefix={<SearchIcon size={16} strokeWidth={1.5} style={{ color: '#8b7355', marginRight: '4px' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: 280,
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                color: '#2d2d2d',
                letterSpacing: '0.3px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#b85845';
                e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
              }}
            />
            <input
              type="file"
              id="import-graph-file"
              accept=".json,.zip"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <Tooltip title={t('pages.graphEditor.importGraph')}>
              <Button
                icon={<Download size={16} strokeWidth={1.5} style={{ transform: 'rotate(180deg)' }} />}
                onClick={() => document.getElementById('import-graph-file')?.click()}
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: '#8b7355',
                  fontWeight: 500,
                  fontSize: '14px',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 16px'
                }}
              >
                {t('pages.graphEditor.import')}
              </Button>
            </Tooltip>
            <Button
              icon={<Sparkles size={16} strokeWidth={1.5} />}
              onClick={() => setPromptTemplateModalVisible(true)}
              style={{
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#8b7355',
                fontWeight: 500,
                fontSize: '14px',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 16px'
              }}
            >
              {t('pages.graphEditor.aiPrompt')}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={handleCreateNewGraph}
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 500,
                fontSize: '14px',
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 20px'
              }}
            >
              {t('pages.graphEditor.createWorkflow')}
            </Button>
          </Space>
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{ padding: '48px 64px', overflow: 'auto' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: '12px'
          }}>
            <Spin size="large" />
            <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '14px' }}>{t('common.loading')}</Text>
          </div>
        ) : filteredGraphs.length === 0 ? (
          searchText ? (
            <div style={{
              textAlign: 'center',
              marginTop: '120px',
              color: 'rgba(45, 45, 45, 0.45)',
              fontSize: '14px'
            }}>
              {t('pages.graphEditor.noMatchingWorkflows', { search: searchText })}
            </div>
          ) : (
            <Card
              style={{
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                background: 'rgba(250, 248, 245, 0.6)',
                textAlign: 'center',
                padding: '40px 20px'
              }}
            >
              <Workflow size={48} strokeWidth={1.5} style={{ color: 'rgba(139, 115, 85, 0.3)', margin: '0 auto 16px' }} />
              <Text style={{
                fontSize: '14px',
                color: 'rgba(45, 45, 45, 0.65)',
                display: 'block',
                marginBottom: '16px'
              }}>
                {t('pages.graphEditor.noWorkflows')}
              </Text>
              <Button
                style={{
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px 16px',
                  height: 'auto',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={handleCreateNewGraph}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
              >
                <Plus size={16} strokeWidth={1.5} />
                {t('pages.graphEditor.createFirstWorkflow')}
              </Button>
            </Card>
          )
        ) : (
          <Row gutter={[16, 16]}>
            {filteredGraphs.map((graphName) => (
              <Col xs={24} sm={12} md={12} lg={8} xl={6} key={graphName}>
                <Card
                  hoverable
                  style={{
                    borderRadius: '6px',
                    border: '1px solid rgba(139, 115, 85, 0.15)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  styles={{ body: { padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' } }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                  }}
                >
                  {/* 标题区 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(139, 115, 85, 0.1)'
                  }}>
                    <Workflow size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                    <Text style={{
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#2d2d2d',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {graphName}
                    </Text>
                  </div>

                  {/* 内容区 */}
                  <div style={{ flex: 1, marginBottom: '12px' }}>
                    <Text style={{
                      fontSize: '13px',
                      color: 'rgba(45, 45, 45, 0.45)',
                      display: 'block',
                      fontStyle: 'italic'
                    }}>
                      {t('pages.graphEditor.clickToView')}
                    </Text>
                  </div>

                  {/* 操作按钮区 */}
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(139, 115, 85, 0.1)'
                  }}>
                    <div
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '4px',
                        color: '#8b7355',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        background: 'transparent'
                      }}
                      onClick={() => handleEditGraph(graphName)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#b85845';
                        e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#8b7355';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Edit size={15} strokeWidth={1.5} />
                      {t('common.edit')}
                    </div>
                    <Tooltip title={t('pages.graphEditor.exportPackage')}>
                      <div
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          color: '#8b7355',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          transition: 'all 0.2s ease',
                          background: 'transparent'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportPackage(graphName);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#b85845';
                          e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#8b7355';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <PackagePlus size={15} strokeWidth={1.5} />
                      </div>
                    </Tooltip>
                    <Tooltip title={t('pages.graphEditor.exportMCPScript')}>
                      <div
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          color: '#8b7355',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          transition: 'all 0.2s ease',
                          background: 'transparent'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportMCP(graphName);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#b85845';
                          e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#8b7355';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Code size={15} strokeWidth={1.5} />
                      </div>
                    </Tooltip>
                    <Tooltip title={t('pages.graphEditor.deleteWorkflow')}>
                      <div
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          color: '#8b7355',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          transition: 'all 0.2s ease',
                          background: 'transparent'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmVisible(graphName);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#b85845';
                          e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#8b7355';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </div>
                    </Tooltip>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>

      {/* 删除确认弹窗 */}
      {deleteConfirmVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(45, 45, 45, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setDeleteConfirmVisible(null)}
        >
          <Card
            style={{
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
              minWidth: '320px',
              maxWidth: '400px'
            }}
            styles={{ body: { padding: '24px' } }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <Text style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#2d2d2d',
                display: 'block',
                marginBottom: '8px'
              }}>
                {t('pages.graphEditor.deleteConfirmTitle')}
              </Text>
              <Text style={{
                fontSize: '14px',
                color: 'rgba(45, 45, 45, 0.65)'
              }}>
                {t('pages.graphEditor.deleteConfirmMessage', { name: deleteConfirmVisible })}
              </Text>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: '#8b7355',
                  padding: '6px 16px',
                  height: 'auto'
                }}
                onClick={() => setDeleteConfirmVisible(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                style={{
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '6px 16px',
                  height: 'auto',
                  fontWeight: 500,
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
                }}
                onClick={() => handleDeleteGraph(deleteConfirmVisible)}
              >
                {t('common.confirm')} {t('common.delete')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );

  // 渲染编辑视图
  const renderEditorView = () => (
    <div style={{ background: '#faf8f5', minHeight: '100vh' }}>
      {/* 顶部工具栏 */}
      <div style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '16px 48px',
        borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 左侧：返回按钮 + 标题 */}
          <Space size="middle">
            <Tooltip title={t('pages.graphEditor.backToList')}>
              <Button
                icon={<ArrowLeft size={16} strokeWidth={1.5} />}
                onClick={handleBackToList}
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: '#8b7355',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {t('pages.graphEditor.backToList')}
              </Button>
            </Tooltip>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Workflow size={24} color="#b85845" strokeWidth={1.5} />
              <div>
                <Text style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#2d2d2d',
                  display: 'block',
                  letterSpacing: '0.5px'
                }}>
                  {currentGraph?.name}
                </Text>
                {currentGraph?.description && (
                  <Text style={{
                    fontSize: '12px',
                    color: 'rgba(45, 45, 45, 0.65)'
                  }}>
                    {currentGraph.description}
                  </Text>
                )}
              </div>
            </div>
          </Space>

          {/* 右侧：工具按钮 */}
          <Space size="small">
            <Tooltip title={t('pages.graphEditor.readme')}>
              <Button
                type="text"
                icon={<FileText size={16} strokeWidth={1.5} />}
                onClick={handleViewReadme}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.autoLayout')}>
              <Button
                type="text"
                icon={<LayoutGrid size={16} strokeWidth={1.5} />}
                onClick={handleAutoLayout}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.addNode')}>
              <Button
                type="text"
                icon={<Plus size={16} strokeWidth={1.5} />}
                onClick={() => setAddNodeModalVisible(true)}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.graphSettings')}>
              <Button
                type="text"
                icon={<Settings size={16} strokeWidth={1.5} />}
                onClick={handleGraphSettings}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.versionManager')}>
              <Button
                type="text"
                icon={<GitBranch size={16} strokeWidth={1.5} />}
                onClick={() => setVersionManagerVisible(true)}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={hasUnsavedChanges ? t('pages.graphEditor.saveChanges') : t('pages.graphEditor.saved')}>
              <Button
                type={hasUnsavedChanges ? 'primary' : 'text'}
                icon={<Save size={16} strokeWidth={1.5} />}
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                style={hasUnsavedChanges ? {
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
                } : {
                  color: '#8b7355'
                }}
              >
                {t('common.save')}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* 画布区域 */}
      <div style={{ padding: '24px 48px' }}>
        <Card
          bodyStyle={{ padding: 0, height: '100%' }}
          className="overflow-hidden"
          style={{
            height: 'calc(100vh - 180px)',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          <ReactFlowProvider>
            <GraphCanvas />
          </ReactFlowProvider>
        </Card>
      </div>

      {/* Node properties drawer */}
      <Drawer
        title={t('pages.graphEditor.nodeProperties')}
        open={!!selectedNode}
        onClose={() => selectNode(null)}
        width={800}
        styles={{
          header: {
            background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.9))',
            borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '18px 28px'
          },
          body: {
            padding: '0',
            background: '#fff'
          }
        }}
        destroyOnClose={true}
      >
        <NodePropertiesPanel />
      </Drawer>

      {/* 添加节点模态框 */}
      <AddNodeModal
        visible={addNodeModalVisible}
        onClose={() => setAddNodeModalVisible(false)}
        onAdd={handleAddNode}
      />

      {/* 版本管理 */}
      {currentGraph && (
        <GraphVersionManager
          visible={versionManagerVisible}
          onClose={() => setVersionManagerVisible(false)}
          graphName={currentGraph.name}
        />
      )}
    </div>
  );

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

      {viewMode === 'list' ? renderListView() : renderEditorView()}

      {/* 创建新图模态框 */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Workflow size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <span style={{
              color: '#2d2d2d',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              {t('pages.graphEditor.createModalTitle')}
            </span>
          </div>
        }
        open={newGraphModalVisible}
        onOk={handleNewGraphSubmit}
        onCancel={() => setNewGraphModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setNewGraphModalVisible(false)}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px',
              padding: '0 24px'
            }}
          >
            {t('common.cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleNewGraphSubmit}
            style={{
              height: '40px',
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px',
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              padding: '0 24px'
            }}
          >
            {t('common.confirm')}
          </Button>
        ]}
        styles={{
          content: {
            borderRadius: '10px',
            boxShadow: '0 12px 40px rgba(139, 115, 85, 0.2)',
            padding: 0,
            overflow: 'hidden'
          },
          header: {
            background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.9))',
            borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '18px 28px',
            marginBottom: 0
          },
          body: {
            padding: '28px 28px 20px',
            background: '#fff'
          },
          footer: {
            borderTop: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '16px 28px',
            background: 'rgba(250, 248, 245, 0.3)',
            marginTop: 0
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.graphEditor.workflowName')}</span>}
            rules={[
              { required: true, message: t('pages.graphEditor.workflowNameRequired') },
              { pattern: /^[^./\\]+$/, message: t('pages.graphEditor.workflowNameInvalid') }
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input
              placeholder={t('pages.graphEditor.workflowNamePlaceholder')}
              style={{
                height: '40px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px',
                color: '#2d2d2d',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
              }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.graphEditor.description')}</span>}
            style={{ marginBottom: '0' }}
          >
            <TextArea
              rows={4}
              placeholder={t('pages.graphEditor.descriptionPlaceholder')}
              style={{
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px',
                color: '#2d2d2d',
                lineHeight: '1.6',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

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
          <Button
            key="close"
            onClick={() => setPromptTemplateModalVisible(false)}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px',
              padding: '0 24px'
            }}
          >
            {t('pages.graphEditor.close')}
          </Button>
        ]}
        width={700}
        styles={{
          content: {
            borderRadius: '10px',
            boxShadow: '0 12px 40px rgba(139, 115, 85, 0.2)',
            padding: 0,
            overflow: 'hidden'
          },
          header: {
            background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.9))',
            borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '18px 28px',
            marginBottom: 0
          },
          body: {
            padding: '28px',
            background: '#fff'
          },
          footer: {
            borderTop: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '16px 28px',
            background: 'rgba(250, 248, 245, 0.3)',
            marginTop: 0
          }
        }}
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

      {/* README modal */}
      <Modal
        title={t('pages.graphEditor.readmeTitle')}
        open={readmeModalVisible}
        onCancel={() => setReadmeModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setReadmeModalVisible(false)}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontWeight: 500
            }}
          >
            {t('pages.graphEditor.close')}
          </Button>
        ]}
        width={800}
      >
        <div style={{
          maxHeight: '60vh',
          overflow: 'auto',
          padding: '16px',
          background: '#faf8f5',
          borderRadius: '6px'
        }}>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#2d2d2d'
          }}>
            {readmeContent}
          </pre>
        </div>
      </Modal>

      {/* Graph settings modal */}
      <Modal
        title={t('pages.graphEditor.graphSettingsTitle')}
        open={graphSettingsModalVisible}
        onOk={handleUpdateGraphSettings}
        onCancel={() => setGraphSettingsModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setGraphSettingsModalVisible(false)}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontWeight: 500
            }}
          >
            {t('common.cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleUpdateGraphSettings}
            style={{
              height: '40px',
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
            }}
          >
            {t('common.confirm')}
          </Button>
        ]}
        width={600}
      >
        <Form form={settingsForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('pages.graphEditor.graphName')}
            rules={[
              { required: true, message: t('pages.graphEditor.workflowNameRequired') },
              { pattern: /^[^./\\]+$/, message: t('pages.graphEditor.workflowNameInvalid') }
            ]}
          >
            <Input disabled style={{
              background: 'rgba(139, 115, 85, 0.05)',
              cursor: 'not-allowed'
            }} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('pages.graphEditor.description')}
          >
            <TextArea rows={3} style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)'
            }} />
          </Form.Item>

          <Form.Item
            name="end_template"
            label={t('pages.graphEditor.endTemplate')}
            tooltip={t('pages.graphEditor.endTemplateTooltip')}
          >
            <TextArea rows={4} style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              fontFamily: 'monospace'
            }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GraphEditor;
