// 图列表视图组件
import React from 'react';
import {
  Layout,
  Card,
  Spin,
  Typography,
  Button,
  Tooltip,
  Space,
  Input,
  Row,
  Col,
  Tag
} from 'antd';
import {
  Plus,
  Workflow,
  Search as SearchIcon,
  Sparkles,
  Edit,
  Trash2,
  Download,
  Code,
  PackagePlus
} from 'lucide-react';
import { useT } from '../../i18n/hooks';
import { buttonStyles } from '../../utils/graphEditorConstants';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

interface GraphListViewProps {
  loading: boolean;
  graphs: string[];
  filteredGraphs: string[];
  searchText: string;
  onSearchChange: (value: string) => void;
  onCreateGraph: () => void;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onShowPromptTemplate: () => void;
  onEditGraph: (graphName: string) => void;
  onExportPackage: (graphName: string) => void;
  onExportMCP: (graphName: string) => void;
  onDeleteGraph: (graphName: string) => void;
}

/**
 * 图列表视图
 */
const GraphListView: React.FC<GraphListViewProps> = ({
  loading,
  graphs,
  filteredGraphs,
  searchText,
  onSearchChange,
  onCreateGraph,
  onImportFile,
  onShowPromptTemplate,
  onEditGraph,
  onExportPackage,
  onExportMCP,
  onDeleteGraph
}) => {
  const t = useT();

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
              onChange={(e) => onSearchChange(e.target.value)}
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
              onChange={onImportFile}
            />
            <Tooltip title={t('pages.graphEditor.importGraph')}>
              <Button
                icon={<Download size={16} strokeWidth={1.5} style={{ transform: 'rotate(180deg)' }} />}
                onClick={() => document.getElementById('import-graph-file')?.click()}
                style={buttonStyles.secondary}
              >
                {t('pages.graphEditor.import')}
              </Button>
            </Tooltip>
            <Button
              icon={<Sparkles size={16} strokeWidth={1.5} />}
              onClick={onShowPromptTemplate}
              style={buttonStyles.secondary}
            >
              {t('pages.graphEditor.aiPrompt')}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={onCreateGraph}
              style={buttonStyles.primary}
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
                  ...buttonStyles.primary,
                  padding: '8px 16px',
                  height: 'auto',
                  display: 'inline-flex'
                }}
                onClick={onCreateGraph}
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
                      onClick={() => onEditGraph(graphName)}
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
                          onExportPackage(graphName);
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
                          onExportMCP(graphName);
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
                          onDeleteGraph(graphName);
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
    </Layout>
  );
};

export default GraphListView;
