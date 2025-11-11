// src/pages/SystemToolsManager.tsx
import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  message,
  Modal,
  Empty,
  Spin,
  Descriptions,
  Tag,
  Tooltip,
  Button,
  Input
} from 'antd';
import {
  ToolOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import {
  listSystemTools,
  getSystemToolDetail,
  SystemToolSchema
} from '../services/systemToolsService';

const { Search } = Input;

const SystemToolsManager: React.FC = () => {
  const [tools, setTools] = useState<SystemToolSchema[]>([]);
  const [filteredTools, setFilteredTools] = useState<SystemToolSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<SystemToolSchema | null>(null);
  const [searchText, setSearchText] = useState('');

  // 加载系统工具列表
  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await listSystemTools();
      setTools(response.tools || []);
      setFilteredTools(response.tools || []);
    } catch (error: any) {
      message.error('加载系统工具列表失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // 搜索过滤
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredTools(tools);
      return;
    }

    const filtered = tools.filter((tool) =>
      tool.name.toLowerCase().includes(value.toLowerCase()) ||
      tool.schema.function.description.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredTools(filtered);
  };

  // 显示工具详情
  const showToolDetail = async (toolName: string) => {
    try {
      const response = await getSystemToolDetail(toolName);
      if (response.success) {
        setSelectedTool({
          name: response.name,
          schema: response.schema
        });
        setDetailModalVisible(true);
      }
    } catch (error: any) {
      message.error('加载工具详情失败: ' + (error.message || '未知错误'));
    }
  };

  // 渲染参数信息
  const renderParameters = (parameters: any) => {
    if (!parameters || !parameters.properties) {
      return <div style={{ color: '#999' }}>（无参数）</div>;
    }

    const props = parameters.properties;
    const required = parameters.required || [];

    return (
      <div>
        {Object.entries(props).map(([key, value]: [string, any]) => (
          <div key={key} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: '4px' }}>
              <Tag color={required.includes(key) ? 'red' : 'default'}>
                {key}
              </Tag>
              {required.includes(key) && <Tag color="red">必填</Tag>}
              <Tag>{value.type}</Tag>
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              {value.description || '（无描述）'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和操作按钮 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          <ToolOutlined /> 系统工具
        </h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadTools}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* 搜索框 */}
      <div style={{ marginBottom: '24px' }}>
        <Search
          placeholder="搜索工具名称或描述"
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
          value={searchText}
        />
      </div>

      {/* 工具列表 */}
      {loading && tools.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : filteredTools.length === 0 ? (
        <Empty
          description={searchText ? '未找到匹配的系统工具' : '暂无系统工具'}
          style={{ marginTop: '50px' }}
        />
      ) : (
        <>
          <div style={{ marginBottom: '16px', color: '#666' }}>
            找到 {filteredTools.length} 个系统工具
          </div>
          <Row gutter={[16, 16]}>
            {filteredTools.map((tool) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={tool.name}>
                <Card
                  hoverable
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ToolOutlined />
                      <Tooltip title={tool.name}>
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {tool.name}
                        </span>
                      </Tooltip>
                    </div>
                  }
                  actions={[
                    <Tooltip title="查看详情">
                      <EyeOutlined onClick={() => showToolDetail(tool.name)} />
                    </Tooltip>
                  ]}
                >
                  <div style={{
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: '1.6',
                    minHeight: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {tool.schema.function.description}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {/* 详情 Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ToolOutlined />
            <span>工具详情: {selectedTool?.name}</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={900}
      >
        {selectedTool && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="工具名称">
                <code style={{ fontSize: '14px' }}>{selectedTool.schema.function.name}</code>
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                {selectedTool.schema.function.description}
              </Descriptions.Item>
              <Descriptions.Item label="参数">
                {renderParameters(selectedTool.schema.function.parameters)}
              </Descriptions.Item>
            </Descriptions>

            {/* JSON Schema */}
            <div style={{ marginTop: '24px' }}>
              <h4>完整 Schema</h4>
              <pre style={{
                background: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '12px'
              }}>
                {JSON.stringify(selectedTool.schema, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SystemToolsManager;
