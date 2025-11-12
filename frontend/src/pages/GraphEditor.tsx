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

const { Header, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

const GraphEditor: React.FC = () => {
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
    autoLayout
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
    // 初始化所有数据
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchGraphs(),
          fetchConfig(),
          fetchStatus(),
          fetchModels()
        ]);
      } catch (error) {
        console.error('初始化数据获取失败:', error);
      }
    };

    initializeData();

    // 定期刷新 MCP 状态
    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 30000); // 每 30 秒刷新一次

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
      message.success(`工作流 "${values.name}" 创建成功`);
    } catch (error: any) {
      message.error('创建失败: ' + (error.message || '未知错误'));
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
        title: '是否保存更改？',
        content: '当前工作流有未保存的更改，是否保存后返回？',
        okText: '保存并返回',
        cancelText: '直接返回',
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
      message.success(`工作流 "${graphName}" 删除成功`);
      setDeleteConfirmVisible(null);
    } catch (error: any) {
      message.error('删除失败: ' + (error.message || '未知错误'));
    }
  };

  // 导出为压缩包
  const handleExportPackage = async (graphName: string) => {
    try {
      const result = await exportGraph(graphName);
      message.success(`工作流 "${graphName}" 导出成功`);
      if (result.file_path) {
        message.info(`导出文件路径: ${result.file_path}`);
      }
    } catch (error: any) {
      message.error('导出失败: ' + (error.message || '未知错误'));
    }
  };

  // 导出为 MCP Script
  const handleExportMCP = async (graphName: string) => {
    try {
      await generateMCPScript(graphName);
      message.success('导出 MCP 脚本成功');
    } catch (error: any) {
      message.error('导出失败: ' + (error.message || '未知错误'));
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
      message.success('保存成功');
    } catch (error: any) {
      message.error('保存失败: ' + (error.message || '未知错误'));
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
      message.error('获取README失败: ' + (error.message || '未知错误'));
    }
  };

  // 自动布局
  const handleAutoLayout = () => {
    autoLayout();
    message.success('自动布局已应用');
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
      message.success('图设置已更新');
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
              工作流管理
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
              {graphs.length} 个工作流
            </Tag>
          </Space>

          {/* 右侧：搜索框 + 操作按钮 */}
          <Space size={12}>
            <Input
              placeholder="搜索工作流..."
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
              AI提示词
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
              工作流
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
            <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '14px' }}>加载中...</Text>
          </div>
        ) : filteredGraphs.length === 0 ? (
          searchText ? (
            <div style={{
              textAlign: 'center',
              marginTop: '120px',
              color: 'rgba(45, 45, 45, 0.45)',
              fontSize: '14px'
            }}>
              未找到匹配 "{searchText}" 的工作流
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
                暂无工作流配置
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
                创建第一个工作流
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
                      点击编辑查看详情
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
                      编辑
                    </div>
                    <Tooltip title="导出压缩包">
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
                    <Tooltip title="导出MCP脚本">
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
                    <Tooltip title="删除工作流">
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
                确认删除
              </Text>
              <Text style={{
                fontSize: '14px',
                color: 'rgba(45, 45, 45, 0.65)'
              }}>
                您确定要删除工作流 "{deleteConfirmVisible}" 吗？此操作无法撤销。
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
                取消
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
                确定删除
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
            <Tooltip title="返回列表">
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
                返回
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
            <Tooltip title="README">
              <Button
                type="text"
                icon={<FileText size={16} strokeWidth={1.5} />}
                onClick={handleViewReadme}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title="自动布局">
              <Button
                type="text"
                icon={<LayoutGrid size={16} strokeWidth={1.5} />}
                onClick={handleAutoLayout}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title="添加节点">
              <Button
                type="text"
                icon={<Plus size={16} strokeWidth={1.5} />}
                onClick={() => setAddNodeModalVisible(true)}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title="图设置">
              <Button
                type="text"
                icon={<Settings size={16} strokeWidth={1.5} />}
                onClick={handleGraphSettings}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title="版本管理">
              <Button
                type="text"
                icon={<GitBranch size={16} strokeWidth={1.5} />}
                onClick={() => setVersionManagerVisible(true)}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={hasUnsavedChanges ? '保存更改' : '已保存'}>
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
                保存
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* 画布区域 */}
      <div style={{ padding: '24px 48px' }}>
        <Card
          bodyStyle={{ padding: 0 }}
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

      {/* 节点属性模态框 */}
      <Modal
        title="节点属性设置"
        open={!!selectedNode}
        onCancel={() => selectNode(null)}
        footer={null}
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{
          height: '80vh',
          overflow: 'auto',
          padding: '0'
        }}
        destroyOnClose={true}
      >
        <NodePropertiesPanel />
      </Modal>

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
          message="错误"
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
              创建新工作流
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
            取消
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
            确定
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
            label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>工作流名称</span>}
            rules={[
              { required: true, message: '请输入工作流名称' },
              { pattern: /^[^./\\]+$/, message: '名称不能包含特殊字符 (/, \\, .)' }
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input
              placeholder="例如: data_analysis_workflow"
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
            label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>描述</span>}
            style={{ marginBottom: '0' }}
          >
            <TextArea
              rows={4}
              placeholder="详细说明该工作流的功能和用途"
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
              AI 生成提示词
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
            关闭
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
            该功能可以帮助您生成工作流的 AI 提示词模板
          </Text>
          <Text style={{
            fontSize: '14px',
            color: 'rgba(45, 45, 45, 0.65)'
          }}>
            请先选择一个工作流进入编辑模式，然后从编辑器工具栏访问此功能
          </Text>
        </div>
      </Modal>

      {/* README 模态框 */}
      <Modal
        title="README"
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
            关闭
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

      {/* 图设置模态框 */}
      <Modal
        title="图设置"
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
            取消
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
            确定
          </Button>
        ]}
        width={600}
      >
        <Form form={settingsForm} layout="vertical">
          <Form.Item
            name="name"
            label="图名称"
            rules={[
              { required: true, message: '请输入图名称' },
              { pattern: /^[^./\\]+$/, message: '名称不能包含特殊字符 (/, \\, .)' }
            ]}
          >
            <Input disabled style={{
              background: 'rgba(139, 115, 85, 0.05)',
              cursor: 'not-allowed'
            }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)'
            }} />
          </Form.Item>

          <Form.Item
            name="end_template"
            label="终止输出模板"
            tooltip="用于自定义图执行结束后的输出格式"
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
