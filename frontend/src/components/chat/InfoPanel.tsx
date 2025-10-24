// src/components/chat/InfoPanel.tsx
import React from 'react';
import { Card, Typography, Tag, Divider, Space, Collapse, Progress } from 'antd';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CodeOutlined,
  ToolOutlined,
  NodeIndexOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import { ParsedResults } from '../../types/conversation';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './InfoPanel.css';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface InfoPanelProps {
  parsedResults: ParsedResults;
  generationType: 'mcp' | 'graph';
  isGenerating?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ 
  parsedResults, 
  generationType,
  isGenerating = false,
  collapsed = false,
  onToggleCollapse
}) => {
  // 计算完成进度
  const getCompletionProgress = () => {
    const requiredFields = generationType === 'mcp' 
      ? ['analysis', 'todo', 'folder_name', 'script_files', 'dependencies']
      : ['analysis', 'todo', 'graph_name', 'nodes'];
    
    const completedFields = requiredFields.filter(field => 
      parsedResults[field as keyof ParsedResults]
    );
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const renderMCPInfo = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 进度指示器 */}
      <Card size="small" className="progress-card">
        <div className="progress-header">
          <Text strong>生成进度</Text>
          <Text type="secondary">{getCompletionProgress()}%</Text>
        </div>
        <Progress 
          percent={getCompletionProgress()} 
          size="small"
          status={isGenerating ? 'active' : 'normal'}
        />
      </Card>

      {/* 分析结果 */}
      {parsedResults.analysis && (
        <Card size="small" title={
          <span><InfoCircleOutlined /> 需求分析</span>
        }>
          <ReactMarkdown>{parsedResults.analysis}</ReactMarkdown>
        </Card>
      )}

      {/* 待办事项 */}
      {parsedResults.todo && (
        <Card size="small" title={
          <span><ClockCircleOutlined /> 待办事项</span>
        }>
          <ReactMarkdown>{parsedResults.todo}</ReactMarkdown>
        </Card>
      )}

      {/* 工具信息 */}
      {parsedResults.folder_name && (
        <Card size="small" title={
          <span><ToolOutlined /> 工具信息</span>
        }>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>文件夹名:</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {parsedResults.folder_name}
              </Tag>
            </div>
            
            {parsedResults.dependencies && (
              <div>
                <Text strong>依赖:</Text>
                <Paragraph>
                  <Text code>{parsedResults.dependencies}</Text>
                </Paragraph>
              </div>
            )}
          </Space>
        </Card>
      )}

      {/* 脚本文件 */}
      {parsedResults.script_files && Object.keys(parsedResults.script_files).length > 0 && (
        <Card size="small" title={
          <span><CodeOutlined /> 脚本文件</span>
        }>
          <Collapse size="small" ghost>
            {Object.entries(parsedResults.script_files).map(([filename, content]) => (
              <Panel
                header={filename}
                key={filename}
                extra={<Tag>Python</Tag>}
              >
                <SyntaxHighlighter
                  language="python"
                  style={tomorrow}
                  customStyle={{ 
                    background: 'transparent',
                    fontSize: '12px',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}
                >
                  {content}
                </SyntaxHighlighter>
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}

      {/* README */}
      {parsedResults.readme && (
        <Card size="small" title={
          <span><FileTextOutlined /> 说明文档</span>
        }>
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return !isInline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {parsedResults.readme}
          </ReactMarkdown>
        </Card>
      )}
    </Space>
  );

  const renderGraphInfo = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 进度指示器 */}
      <Card size="small" className="progress-card">
        <div className="progress-header">
          <Text strong>生成进度</Text>
          <Text type="secondary">{getCompletionProgress()}%</Text>
        </div>
        <Progress 
          percent={getCompletionProgress()} 
          size="small"
          status={isGenerating ? 'active' : 'normal'}
        />
      </Card>

      {/* 分析结果 */}
      {parsedResults.analysis && (
        <Card size="small" title={
          <span><InfoCircleOutlined /> 需求分析</span>
        }>
          <ReactMarkdown>{parsedResults.analysis}</ReactMarkdown>
        </Card>
      )}

      {/* 待办事项 */}
      {parsedResults.todo && (
        <Card size="small" title={
          <span><ClockCircleOutlined /> 待办事项</span>
        }>
          <ReactMarkdown>{parsedResults.todo}</ReactMarkdown>
        </Card>
      )}

      {/* Graph信息 */}
      {parsedResults.graph_name && (
        <Card size="small" title={
          <span><NodeIndexOutlined /> Graph信息</span>
        }>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>Graph名称:</Text>
              <Tag color="green" style={{ marginLeft: 8 }}>
                {parsedResults.graph_name}
              </Tag>
            </div>
            
            {parsedResults.graph_description && (
              <div>
                <Text strong>描述:</Text>
                <Paragraph>{parsedResults.graph_description}</Paragraph>
              </div>
            )}
            
            {parsedResults.end_template && (
              <div>
                <Text strong>输出模板:</Text>
                <Paragraph>
                  <Text code>{parsedResults.end_template}</Text>
                </Paragraph>
              </div>
            )}
          </Space>
        </Card>
      )}

      {/* 节点配置 */}
      {parsedResults.nodes && parsedResults.nodes.length > 0 && (
        <Card size="small" title={
          <span><NodeIndexOutlined /> 节点配置</span>
        }>
          <Collapse size="small" ghost>
            {parsedResults.nodes.map((node, index) => (
              <Panel
                header={
                  <Space>
                    <span>{node.name}</span>
                    <Tag color="blue">Level {node.level}</Tag>
                  </Space>
                }
                key={index}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {node.description && (
                    <div>
                      <Text strong>描述:</Text>
                      <Paragraph>{node.description}</Paragraph>
                    </div>
                  )}
                  
                  {node.mcp_servers && node.mcp_servers.length > 0 && (
                    <div>
                      <Text strong>MCP服务:</Text>
                      <div style={{ marginTop: 4 }}>
                        {node.mcp_servers.map((server: string) => (
                          <Tag key={server}>{server}</Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {node.prompt && (
                    <div>
                      <Text strong>提示词:</Text>
                      <Paragraph>
                        <Text code>{node.prompt}</Text>
                      </Paragraph>
                    </div>
                  )}
                </Space>
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}
    </Space>
  );

  return (
    <div className={`info-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <div className="panel-header-content">
          {!collapsed && (
            <>
              <Title level={4}>
                {generationType === 'mcp' ? '🔧 MCP工具生成' : '📊 Graph配置生成'}
              </Title>
              {isGenerating && (
                <Tag color="processing" icon={<ClockCircleOutlined />}>
                  生成中...
                </Tag>
              )}
            </>
          )}
        </div>
        
        {onToggleCollapse && (
          <div 
            className="panel-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "展开信息面板" : "折叠信息面板"}
          >
            {collapsed ? <LeftOutlined /> : <RightOutlined />}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <Divider />
          <div className="panel-content">
            {generationType === 'mcp' ? renderMCPInfo() : renderGraphInfo()}
          </div>
        </>
      )}

      {!collapsed && getCompletionProgress() === 100 && (
        <Card 
          size="small" 
          className="completion-card"
          style={{ 
            marginTop: 16,
            borderColor: '#52c41a',
            backgroundColor: '#f6ffed'
          }}
        >
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong style={{ color: '#52c41a' }}>
              {generationType === 'mcp' ? 'MCP工具' : 'Graph配置'}生成完成！
            </Text>
          </Space>
          <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
            <Text type="secondary">
              发送 <Text code>&lt;end&gt;END&lt;/end&gt;</Text> 来完成生成并保存到工作台
            </Text>
          </Paragraph>
        </Card>
      )}
    </div>
  );
};

export default InfoPanel;