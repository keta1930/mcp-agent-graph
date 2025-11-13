// src/pages/SystemToolsManager.tsx
import React, { useEffect, useState } from 'react';
import {
  Layout,
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
  Space,
  Typography,
  Input
} from 'antd';
import { Wrench, Eye, Search } from 'lucide-react';
import {
  listSystemTools,
  getSystemToolDetail,
  SystemToolSchema,
  ToolCategory
} from '../services/systemToolsService';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SystemToolsManager: React.FC = () => {
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<SystemToolSchema | null>(null);
  const [searchText, setSearchText] = useState('');

  // 加载系统工具列表
  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await listSystemTools();
      setCategories(response.categories || []);
      setFilteredCategories(response.categories || []);
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
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.map((category) => {
      const filteredTools = category.tools.filter((tool) =>
        tool.name.toLowerCase().includes(value.toLowerCase()) ||
        tool.schema.function.description.toLowerCase().includes(value.toLowerCase())
      );
      return {
        ...category,
        tools: filteredTools,
        tool_count: filteredTools.length
      };
    }).filter((category) => category.tools.length > 0);
    
    setFilteredCategories(filtered);
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
      return (
        <Text style={{ color: 'rgba(45, 45, 45, 0.45)', fontStyle: 'italic' }}>
          （无参数）
        </Text>
      );
    }

    const props = parameters.properties;
    const required = parameters.required || [];

    return (
      <div>
        {Object.entries(props).map(([key, value]: [string, any]) => (
          <div key={key} style={{
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.1)'
          }}>
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag style={{
                background: required.includes(key) ? 'rgba(184, 88, 69, 0.08)' : 'rgba(139, 115, 85, 0.08)',
                color: required.includes(key) ? '#b85845' : '#8b7355',
                border: `1px solid ${required.includes(key) ? 'rgba(184, 88, 69, 0.25)' : 'rgba(139, 115, 85, 0.2)'}`,
                borderRadius: '4px',
                fontWeight: 500,
                fontSize: '12px',
                padding: '2px 8px'
              }}>
                {key}
              </Tag>
              {required.includes(key) && (
                <Tag style={{
                  background: 'rgba(184, 88, 69, 0.08)',
                  color: '#b85845',
                  border: '1px solid rgba(184, 88, 69, 0.25)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  padding: '2px 6px'
                }}>
                  必填
                </Tag>
              )}
              <Tag style={{
                background: 'rgba(212, 165, 116, 0.08)',
                color: '#d4a574',
                border: '1px solid rgba(212, 165, 116, 0.25)',
                borderRadius: '4px',
                fontSize: '11px',
                padding: '2px 6px'
              }}>
                {value.type}
              </Tag>
            </div>
            <Text style={{
              fontSize: '13px',
              color: 'rgba(45, 45, 45, 0.65)',
              lineHeight: '1.6'
            }}>
              {value.description || '（无描述）'}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  const totalTools = categories.reduce((sum, cat) => sum + cat.tool_count, 0);

  return (
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
            <Wrench size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              系统工具
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
              {totalTools} 个工具
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {categories.length} 个类别
            </Tag>
          </Space>

          {/* 右侧：搜索框 */}
          <Input
            placeholder="搜索工具名称或描述"
            prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{
              width: 320,
              height: '40px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
            }}
          />
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{
        padding: '32px 48px',
        overflow: 'auto'
      }}>

        {/* 工具列表 */}
        {loading && categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <Empty
            description={searchText ? '未找到匹配的系统工具' : '暂无系统工具'}
            style={{ marginTop: '80px' }}
          />
        ) : (
          <>
            {filteredCategories.map((category) => (
              <div key={category.category} style={{ marginBottom: '40px' }}>
                {/* 类别标题 */}
                <div style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#2d2d2d',
                  letterSpacing: '0.5px'
                }}>
                  <Tag style={{
                    background: 'rgba(184, 88, 69, 0.08)',
                    color: '#b85845',
                    border: '1px solid rgba(184, 88, 69, 0.25)',
                    borderRadius: '6px',
                    fontWeight: 500,
                    padding: '4px 12px',
                    fontSize: '13px'
                  }}>
                    {category.category}
                  </Tag>
                  <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px' }}>
                    {category.tool_count} 个工具
                  </Text>
                </div>

                {/* 该类别下的工具卡片 */}
                <Row gutter={[16, 16]}>
                  {category.tools.map((tool) => (
                    <Col xs={24} sm={12} md={12} lg={8} xl={6} key={tool.name}>
                      <Card
                        hoverable
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 115, 85, 0.15)',
                          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                          background: 'rgba(255, 255, 255, 0.85)',
                          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        styles={{
                          body: { 
                            padding: '16px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column'
                          }
                        }}
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
                        {/* 工具名称 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <Wrench size={16} strokeWidth={1.5} style={{ color: '#b85845', flexShrink: 0 }} />
                          <Tooltip title={tool.name}>
                            <Text strong style={{
                              fontSize: '14px',
                              color: '#2d2d2d',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1
                            }}>
                              {tool.name}
                            </Text>
                          </Tooltip>
                        </div>

                        {/* 工具描述 */}
                        <Text style={{
                          fontSize: '13px',
                          color: 'rgba(45, 45, 45, 0.65)',
                          lineHeight: '1.6',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          marginBottom: '12px'
                        }}>
                          {tool.schema.function.description}
                        </Text>

                        {/* 查看详情按钮 */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(139, 115, 85, 0.1)'
                        }}>
                          <Tooltip title="查看详情">
                            <div
                              style={{
                                padding: '4px',
                                borderRadius: '4px',
                                color: '#8b7355',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => showToolDetail(tool.name)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Eye size={16} strokeWidth={1.5} />
                            </div>
                          </Tooltip>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ))}
          </>
        )}

      </Content>

      {/* 详情 Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wrench size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <Text strong style={{ fontSize: '16px', color: '#2d2d2d' }}>
              工具详情: {selectedTool?.name}
            </Text>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={900}
        styles={{
          body: { 
            padding: '24px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }
        }}
        style={{
          top: 40
        }}
      >
        {selectedTool && (
          <div>
            <Descriptions 
              bordered 
              column={1}
              labelStyle={{
                background: 'rgba(245, 243, 240, 0.6)',
                color: '#8b7355',
                fontWeight: 500,
                fontSize: '13px',
                width: '120px'
              }}
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#2d2d2d',
                fontSize: '13px'
              }}
            >
              <Descriptions.Item label="工具名称">
                <code style={{
                  fontSize: '13px',
                  background: 'rgba(139, 115, 85, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: '#b85845'
                }}>
                  {selectedTool.schema.function.name}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                <Text style={{ color: 'rgba(45, 45, 45, 0.85)' }}>
                  {selectedTool.schema.function.description}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="参数">
                {renderParameters(selectedTool.schema.function.parameters)}
              </Descriptions.Item>
            </Descriptions>

            {/* JSON Schema */}
            <div style={{ marginTop: '24px' }}>
              <Text strong style={{
                fontSize: '14px',
                color: '#2d2d2d',
                display: 'block',
                marginBottom: '12px'
              }}>
                完整 Schema
              </Text>
              <pre 
                className="custom-scrollbar"
                style={{
                  background: '#faf8f5',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  overflow: 'auto',
                  maxHeight: '300px',
                  fontSize: '12px',
                  color: '#2d2d2d',
                  lineHeight: '1.6',
                  margin: 0
                }}
              >
                {JSON.stringify(selectedTool.schema, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* 自定义滚动条样式 */}
      <style>{`
        /* Modal 滚动条样式 */
        .ant-modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .ant-modal-body::-webkit-scrollbar-track {
          background: rgba(245, 243, 240, 0.3);
          border-radius: 4px;
        }

        .ant-modal-body::-webkit-scrollbar-thumb {
          background: rgba(139, 115, 85, 0.3);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 115, 85, 0.5);
        }

        /* Schema 区域滚动条样式 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(245, 243, 240, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(184, 88, 69, 0.3);
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(184, 88, 69, 0.5);
        }

        /* Firefox 滚动条样式 */
        .ant-modal-body {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 115, 85, 0.3) rgba(245, 243, 240, 0.3);
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(184, 88, 69, 0.3) rgba(245, 243, 240, 0.5);
        }
      `}</style>
    </Layout>
  );
};

export default SystemToolsManager;
