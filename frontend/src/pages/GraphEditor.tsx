// src/pages/GraphEditor.tsx
import React, { useEffect, useState, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Card, Alert, Spin, Typography, Empty, Button, Tooltip, Space, Modal, Form, Input, Tour } from 'antd';
import { 
  PlusOutlined, InfoCircleOutlined, WarningOutlined, QuestionCircleOutlined,
  BulbOutlined, EyeOutlined
} from '@ant-design/icons';
import GraphCanvas from '../components/graph-editor/GraphCanvas';
import NodePropertiesPanel from '../components/graph-editor/NodePropertiesPanel';
import GraphControls from '../components/graph-editor/GraphControls';
import AddNodeModal from '../components/graph-editor/AddNodeModal';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useMCPStore } from '../store/mcpStore';

const { Text } = Typography;
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
    graphs
  } = useGraphEditorStore();
  const { fetchConfig, fetchStatus, config, status } = useMCPStore();
  const [addNodeModalVisible, setAddNodeModalVisible] = useState(false);
  const [newGraphModalVisible, setNewGraphModalVisible] = useState(false);
  
  // 教学引导相关状态
  const [tourOpen, setTourOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  
  // 引用各个功能区域
  const graphControlsRef = useRef<HTMLDivElement>(null);
  const addNodeBtnRef = useRef<HTMLButtonElement>(null);
  const graphCanvasRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const createGraphBtnRef = useRef<HTMLButtonElement>(null);
  
  const [form] = Form.useForm();

  // 检查是否有连接的MCP服务器
  const hasConnectedServers = Object.values(status || {}).some(serverStatus => 
    serverStatus?.connected
  );

  // 检查是否为首次访问
  const isFirstVisit = () => {
    return !localStorage.getItem('graph_editor_tour_completed');
  };

  // 标记引导已完成
  const markTourCompleted = () => {
    localStorage.setItem('graph_editor_tour_completed', 'true');
  };

  // 检查是否有图配置
  const hasGraphs = graphs && graphs.length > 0;
  const hasCurrentGraph = !!currentGraph;

  // 根据当前状态生成不同的引导步骤
  const getTourSteps = () => {
    // 如果没有任何图配置，显示基础引导
    if (!hasGraphs) {
      return [
        {
          title: '欢迎使用图编辑器! 🎉',
          description: (
            <div>
              <p>这里是图形化流程编辑器，让您轻松创建和管理复杂的AI工作流程。</p>
              <p>看起来您还没有创建任何图配置，让我们从头开始！</p>
            </div>
          ),
          target: () => graphControlsRef.current,
          placement: 'bottom' as const,
        },
        {
          title: '开始之前的准备 🛠️',
          description: (
            <div>
              <p><strong>在创建第一个图之前，建议先完成以下准备工作：</strong></p>
              <ol>
                <li><strong>配置AI模型</strong>：前往"模型管理"页面添加至少一个AI模型</li>
                <li><strong>连接工具服务</strong>：在"MCP管理"页面连接需要的工具服务器</li>
                <li><strong>了解基本概念</strong>：图由节点组成，节点间通过连线传递数据</li>
              </ol>
              <p>准备就绪后，就可以创建您的第一个图了！</p>
            </div>
          ),
          target: () => graphControlsRef.current,
          placement: 'bottom' as const,
        },
        {
          title: '创建您的第一个图 📝',
          description: (
            <div>
              <p>有三种方式创建新图：</p>
              <ol>
                <li><strong>手动创建</strong>：点击"+"按钮 → "新建图"</li>
                <li><strong>AI生成</strong>：点击"+"按钮 → "AI生成图"，描述您的需求</li>
                <li><strong>导入现有</strong>：点击"导入/导出"按钮导入图配置</li>
              </ol>
              <p>💡 推荐新手使用"AI生成图"功能快速开始！</p>
            </div>
          ),
          target: () => graphControlsRef.current?.querySelector('.ant-row .ant-col:first-child'),
          placement: 'bottom' as const,
        },
        {
          title: '图管理功能 📁',
          description: (
            <div>
              <p>这个区域包含所有图管理功能：</p>
              <ul>
                <li><strong>图选择下拉框</strong>：切换不同的图配置</li>
                <li><strong>快速操作菜单</strong>：创建、生成、导入图等</li>
                <li><strong>服务器状态指示</strong>：显示MCP服务器连接状态</li>
              </ul>
              <p>创建第一个图后，这里会显示更多选项。</p>
            </div>
          ),
          target: () => graphControlsRef.current?.querySelector('.ant-row .ant-col:first-child'),
          placement: 'bottom' as const,
        },
        {
          title: '开始创建吧! 🚀',
          description: (
            <div>
              <p><strong>立即行动：</strong></p>
              <div style={{ 
                background: '#f6f8fa', 
                padding: '12px', 
                borderRadius: '6px', 
                margin: '8px 0' 
              }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>🎯 推荐流程：</p>
                <ol style={{ margin: '8px 0 0 16px', padding: 0 }}>
                  <li>点击下方的"创建新图"按钮</li>
                  <li>或尝试使用"AI生成图"功能</li>
                  <li>创建图后再次点击引导按钮查看更多功能</li>
                </ol>
              </div>
              <p>祝您使用愉快！有问题随时查看帮助文档。</p>
            </div>
          ),
          target: () => emptyStateRef.current,
          placement: 'top' as const,
        },
      ];
    }

    // 如果有图配置，显示完整功能引导
    return [
      {
        title: '欢迎回来! 🎉',
        description: (
          <div>
            <p>很好！您已经有图配置了。让我们来了解图编辑器的完整功能。</p>
            <p>这里是图形化流程编辑器的主要功能区域。</p>
          </div>
        ),
        target: () => graphControlsRef.current,
        placement: 'bottom' as const,
      },
      {
        title: '图管理区域 📁',
        description: (
          <div>
            <p><strong>图选择</strong>：在下拉菜单中选择已有的图配置</p>
            <p><strong>快速操作</strong>：点击"+"按钮可以创建新图、AI生成图等</p>
            <p><strong>服务器状态</strong>：显示MCP服务器连接状态</p>
          </div>
        ),
        target: () => graphControlsRef.current?.querySelector('.ant-row .ant-col:first-child'),
        placement: 'bottom' as const,
      },
      ...(hasCurrentGraph ? [
        {
          title: '添加节点 ➕',
          description: (
            <div>
              <p>点击此按钮可以向当前图中添加新的节点。</p>
              <p>节点分为两种类型：</p>
              <ul>
                <li><strong>智能体节点</strong>：使用AI模型执行任务</li>
                <li><strong>子图节点</strong>：引用其他已有的图配置</li>
              </ul>
            </div>
          ),
          target: () => addNodeBtnRef.current,
          placement: 'bottom' as const,
        },
        {
          title: '工具栏操作 🛠️',
          description: (
            <div>
              <p><strong>自动布局</strong>：根据节点层级自动排列节点位置</p>
              <p><strong>导入/导出</strong>：支持JSON图配置和完整图包的导入导出</p>
              <p><strong>保存</strong>：保存当前图的修改（有修改时按钮会高亮）</p>
            </div>
          ),
          target: () => graphControlsRef.current?.querySelector('.ant-row .ant-col:last-child'),
          placement: 'bottom' as const,
        },
        {
          title: '图画布区域 🎨',
          description: (
            <div>
              <p>这里是主要的工作区域：</p>
              <ul>
                <li><strong>拖拽节点</strong>：调整节点位置</li>
                <li><strong>连接节点</strong>：拖拽节点边缘的连接点来建立连接</li>
                <li><strong>选择节点</strong>：点击节点查看和编辑属性</li>
                <li><strong>删除连接</strong>：点击连接线上的"×"按钮</li>
              </ul>
            </div>
          ),
          target: () => graphCanvasRef.current,
          placement: 'top' as const,
        },
        {
          title: '背景控制 🌈',
          description: (
            <div>
              <p>右上角的背景控制面板让您自定义画布背景：</p>
              <ul>
                <li>无背景、点状、线性、网格、交叉等多种样式</li>
                <li>帮助您更好地组织和查看图结构</li>
              </ul>
            </div>
          ),
          target: () => document.querySelector('[style*="position: absolute"][style*="top: 16px"][style*="right: 16px"]'),
          placement: 'left' as const,
        },
        {
          title: '画布控制器 🎮',
          description: (
            <div>
              <p>左下角的控制面板提供：</p>
              <ul>
                <li><strong>缩放</strong>：放大缩小画布</li>
                <li><strong>适应视图</strong>：自动调整到合适的视图大小</li>
                <li><strong>小地图</strong>：快速导航到图的不同区域</li>
              </ul>
            </div>
          ),
          target: () => document.querySelector('.react-flow__controls'),
          placement: 'right' as const,
        },
        {
          title: '节点属性编辑 ⚙️',
          description: (
            <div>
              <p>点击任意节点可以打开属性编辑面板，包含：</p>
              <ul>
                <li><strong>基础信息</strong>：名称、描述、类型、模型选择</li>
                <li><strong>提示词设置</strong>：系统和用户提示词</li>
                <li><strong>执行控制</strong>：执行层级、循环次数等</li>
                <li><strong>连接管理</strong>：输入输出节点配置</li>
              </ul>
            </div>
          ),
          target: () => graphCanvasRef.current,
          placement: 'top' as const,
        },
      ] : []),
      {
        title: '高级功能提示 🚀',
        description: (
          <div>
            <p><strong>探索更多功能：</strong></p>
            <ul>
              <li><strong>AI优化图</strong>：让AI帮您优化现有图结构</li>
              <li><strong>导出MCP脚本</strong>：生成可执行的命令行脚本</li>
              <li><strong>图包导出</strong>：打包图及相关配置便于分享</li>
              <li><strong>README生成</strong>：自动生成图的说明文档</li>
            </ul>
            <p>🎯 尝试在"更多操作"菜单中发现这些功能！</p>
          </div>
        ),
        target: () => graphControlsRef.current,
        placement: 'bottom' as const,
      },
    ];
  };

  useEffect(() => {
    fetchGraphs();
    fetchConfig();
    fetchStatus();

    // 首次访问自动显示引导（延迟一点确保页面完全加载）
    const timer = setTimeout(() => {
      if (isFirstVisit()) {
        setTourOpen(true);
      }
    }, 1500);

    // Set up a timer to periodically refresh status
    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 30000); // Refresh status every 30 seconds

    return () => {
      clearTimeout(timer);
      clearInterval(statusInterval);
    };
  }, [fetchGraphs, fetchConfig, fetchStatus]);

  const handleAddNode = (nodeData: any) => {
    // Preset node position at the center of canvas with some randomization
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

  // 处理创建新图
  const handleCreateNewGraph = () => {
    form.resetFields();
    setNewGraphModalVisible(true);
  };

  const handleNewGraphSubmit = async () => {
    try {
      const values = await form.validateFields();
      createNewGraph(values.name, values.description);
      setNewGraphModalVisible(false);
    } catch (error) {
      // Form validation error
    }
  };

  // 关闭节点属性模态框
  const handleCloseNodeProperties = () => {
    selectNode(null);
  };

  // 开始引导
  const startTour = () => {
    setCurrent(0);
    setTourOpen(true);
  };

  // 完成引导
  const handleTourClose = () => {
    setTourOpen(false);
    markTourCompleted();
  };

  // 引导步骤变化
  const handleTourChange = (current: number) => {
    setCurrent(current);
  };

  // 渲染连接状态警告
  const renderConnectionWarning = () => {
    if (hasConnectedServers || !currentGraph) return null;

    return (
      <Alert
        message="MCP服务器连接"
        description="当前没有连接的MCP服务器。某些节点功能可能无法正常工作。"
        type="warning"
        showIcon
        className="mb-4"
        action={
          <Button size="small" type="text">
            检查连接
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          className="mb-4"
          closable
        />
      )}

      {renderConnectionWarning()}

      {/* 新手引导按钮 */}
      <div style={{ 
        position: 'fixed', 
        top: '120px', 
        right: '20px', 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <Tooltip title="查看功能引导教程" placement="left">
          <Button
            type="primary"
            shape="circle"
            icon={<BulbOutlined />}
            onClick={startTour}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              animation: !localStorage.getItem('graph_editor_tour_completed') ? 'pulse 2s infinite' : 'none'
            }}
          />
        </Tooltip>
        {!localStorage.getItem('graph_editor_tour_completed') && (
          <div style={{
            position: 'absolute',
            right: '50px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#667eea',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            animation: 'fadeInOut 3s infinite'
          }}>
            点击查看教程
          </div>
        )}
      </div>

      <div ref={graphControlsRef}>
        <GraphControls 
          onAddNode={() => setAddNodeModalVisible(true)} 
          addNodeBtnRef={addNodeBtnRef}
        />
      </div>

      <Spin spinning={loading} tip="加载中..." delay={300}>
        {!currentGraph ? (
          <div ref={emptyStateRef}>
            <Card className="text-center p-8" style={{ height: '85vh' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无图配置"
              >
                <Space direction="vertical">
                  <Button
                    ref={createGraphBtnRef}
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateNewGraph}
                  >
                    创建新图
                  </Button>
                  <Text type="secondary">
                    您也可以使用AI生成功能或导入现有图配置
                  </Text>
                </Space>
              </Empty>
            </Card>
          </div>
        ) : (
          <Card
            bodyStyle={{ padding: 0 }}
            className="overflow-hidden"
            style={{ height: '85vh' }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>图画布 - {currentGraph.name}</span>
                {currentGraph.description && (
                  <Tooltip title={currentGraph.description}>
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                )}
              </div>
            }
          >
            <ReactFlowProvider>
              <div ref={graphCanvasRef}>
                <GraphCanvas />
              </div>
            </ReactFlowProvider>
          </Card>
        )}
      </Spin>

      {/* 节点属性模态框 */}
      <Modal
        title="节点属性设置"
        open={!!selectedNode}
        onCancel={handleCloseNodeProperties}
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

      {/* 创建新图模态框 */}
      <Modal
        title="创建新图"
        open={newGraphModalVisible}
        onOk={handleNewGraphSubmit}
        onCancel={() => setNewGraphModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="图名称"
            rules={[
              { required: true, message: '请输入图名称' },
              { pattern: /^[^./\\]+$/, message: '名称不能包含特殊字符 (/, \\, .)' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <AddNodeModal
        visible={addNodeModalVisible}
        onClose={() => setAddNodeModalVisible(false)}
        onAdd={handleAddNode}
      />

      {/* 教学引导组件 */}
      <Tour
        open={tourOpen}
        onClose={handleTourClose}
        steps={getTourSteps()}
        current={current}
        onChange={handleTourChange}
        indicatorsRender={(current, total) => (
          <span style={{ 
            color: '#667eea', 
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {current + 1} / {total}
          </span>
        )}
        type="primary"
        arrow={true}
        placement="bottom"
        mask={{
          style: {
            boxShadow: 'inset 0 0 15px #fff',
          },
        }}
        zIndex={1001}
        gap={{
          offset: 8,
          radius: 8,
        }}
        scrollIntoViewOptions={{
          behavior: 'smooth',
          block: 'center'
        }}
      />

      {/* 全局键盘事件处理 */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0 }}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Delete' && selectedNode) {
            // 这里可以触发删除选中节点的操作
            console.log('Delete key pressed for node:', selectedNode);
          } else if (e.key === 'Escape') {
            // 取消选择或关闭模态框
            if (selectedNode) {
              selectNode(null);
            }
          }
        }}
      />

      {/* 添加引导相关的CSS动画 */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
        }

        @keyframes fadeInOut {
          0%, 100% {
            opacity: 0.7;
            transform: translateY(-50%) translateX(5px);
          }
          50% {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }

        .ant-tour .ant-tour-content .ant-tour-close {
          color: #667eea;
        }

        .ant-tour .ant-tour-content .ant-tour-close:hover {
          color: #764ba2;
        }

        .ant-tour-primary .ant-tour-next-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
        }

        .ant-tour-primary .ant-tour-next-btn:hover {
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }
      `}</style>
    </div>
  );
};

export default GraphEditor;