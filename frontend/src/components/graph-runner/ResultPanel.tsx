// src/components/graph-runner/ResultPanel.tsx
import React, { useState } from 'react';
import { Spin, Empty, Tag, Collapse, Typography, Tooltip, Divider, Button } from 'antd';
import {
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RightOutlined,
  NodeIndexOutlined,
  KeyOutlined,
  SyncOutlined,
  CodeOutlined,
  ExceptionOutlined,
  BranchesOutlined,
  ThunderboltOutlined,
  DownOutlined,
  RocketOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 帮助函数：处理子图节点路径
const processNodePath = (nodeName: string) => {
  if (!nodeName || !nodeName.includes('.')) return { name: nodeName, path: null };

  const parts = nodeName.split('.');
  const name = parts.pop() || '';
  const path = parts.join('.');

  return { name, path };
};

// 自定义折叠面板头部
const CustomPanelHeader = ({
  node,
  isSubgraph = false,
  level = 0
}: {
  node: any,
  isSubgraph?: boolean,
  level?: number
}) => {
  const { name, path } = processNodePath(node.node_name);

  return (
    <div className="node-panel-header">
      <div className="node-header-title">
        {isSubgraph ? (
          <BranchesOutlined className="node-icon subgraph-icon" />
        ) : (
          <RocketOutlined className="node-icon" />
        )}

        <span className="node-name">
          {name}
          {node.is_start_input && (
            <Tag className="node-tag start-tag">Input</Tag>
          )}
          {path && (
            <Tooltip title={`From subgraph: ${path}`}>
              <Tag className="node-tag path-tag">{path}</Tag>
            </Tooltip>
          )}
          {node.error && (
            <Tag className="node-tag error-tag">Error</Tag>
          )}
          {level !== undefined && level > 0 && (
            <Tag className="node-tag level-tag">Level {level}</Tag>
          )}
        </span>
      </div>

      <div className="node-header-status">
        {isSubgraph && (
          <Tag color="blue" icon={<BranchesOutlined />}>Subgraph</Tag>
        )}
      </div>
    </div>
  );
};

// 节点内容组件
const NodeContent = ({ node }: { node: any }) => {
  const [showAll, setShowAll] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="node-content">
      {node.input && (
        <div className="node-io-section">
          <div className="node-io-header">
            <RightOutlined className="node-io-icon" />
            <span className="node-io-label">Input</span>
          </div>
          <div className="node-io-content">
            {showAll || node.input.length < 500 ? node.input : (
              <>
                {node.input.substring(0, 500)}...
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowAll(true)}
                >
                  Show more
                </Button>
              </>
            )}
          </div>
          {node.input && (
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              className="copy-button"
              onClick={() => copyToClipboard(node.input)}
            >
              Copy
            </Button>
          )}
        </div>
      )}

      {node.output && (
        <div className="node-io-section">
          <div className="node-io-header">
            <MessageOutlined className="node-io-icon" />
            <span className="node-io-label">Output</span>
          </div>
          <div className="node-io-content">
            {showAll || node.output.length < 500 ? node.output : (
              <>
                {node.output.substring(0, 500)}...
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowAll(true)}
                >
                  Show more
                </Button>
              </>
            )}
          </div>
          {node.output && (
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              className="copy-button"
              onClick={() => copyToClipboard(node.output)}
            >
              Copy
            </Button>
          )}
        </div>
      )}

      {node.error && (
        <div className="node-io-section error-section">
          <div className="node-io-header">
            <ExceptionOutlined className="node-io-icon error-icon" />
            <span className="node-io-label">Error</span>
          </div>
          <div className="node-error">
            {node.error}
          </div>
        </div>
      )}

      {node.tool_calls && node.tool_calls.length > 0 && (
        <div className="node-io-section">
          <div className="node-io-header">
            <CodeOutlined className="node-io-icon" />
            <span className="node-io-label">Tool Calls ({node.tool_calls.length})</span>
          </div>
          <div className="subgraph-collapse">
            <Collapse ghost>
              {node.tool_calls.map((tool: any, idx: number) => (
                <Panel
                  header={<Text strong>{tool.name || 'Unknown tool'}</Text>}
                  key={idx}
                >
                  <pre className="tool-call-content">{JSON.stringify(tool, null, 2)}</pre>
                </Panel>
              ))}
            </Collapse>
          </div>
        </div>
      )}
    </div>
  );
};

// 子图节点组件
const SubgraphNode = ({ node }: { node: any }) => {
  return (
    <div className="subgraph-node">
      <NodeContent node={node} />

      {node.is_subgraph && node.subgraph_results && node.subgraph_results.length > 0 && (
        <div className="subgraph-results">
          <Divider>
            <BranchesOutlined /> Subgraph Nodes
          </Divider>

          <Collapse
            ghost
            className="subgraph-nodes-collapse"
          >
            {node.subgraph_results.map((subNode: any, idx: number) => (
              <Panel
                key={idx}
                header={<CustomPanelHeader node={subNode} />}
              >
                <NodeContent node={subNode} />

                {/* 递归处理嵌套子图 */}
                {subNode.is_subgraph && subNode.subgraph_results && (
                  <SubgraphNode node={subNode} />
                )}
              </Panel>
            ))}
          </Collapse>
        </div>
      )}
    </div>
  );
};

// 主组件
const ResultPanel: React.FC = () => {
  const { conversations, currentConversation, loading, parallelExecution } = useGraphRunnerStore();

  const currentResult = currentConversation
    ? conversations[currentConversation]
    : null;

  if (loading) {
    return (
      <div className="graph-card running-card">
        <div className="graph-card-header">
          <h3 className="graph-card-title">
            <SyncOutlined spin className="card-icon" />
            Execution in Progress
          </h3>
        </div>
        <div className="result-loading">
          <Spin size="large" />
          <Text>Processing your request...</Text>
        </div>
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="graph-card">
        <div className="graph-card-header">
          <h3 className="graph-card-title">
            <MessageOutlined className="card-icon" />
            Results
          </h3>
        </div>
        <div className="custom-empty">
          <MessageOutlined className="custom-empty-icon" />
          <Text className="custom-empty-text">No results yet. Execute a graph to see output.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="graph-card">
      <div className="graph-card-header">
        <h3 className="graph-card-title">
          <MessageOutlined className="card-icon" />
          Results
        </h3>

        <div className="result-status-tags">
          {currentResult.completed ? (
            <Tag className="status-tag status-completed" icon={<CheckCircleOutlined />}>
              Completed
            </Tag>
          ) : (
            <Tag className="status-tag status-processing" icon={<ClockCircleOutlined />}>
              In Progress
            </Tag>
          )}

          {currentResult.error && (
            <Tag className="status-tag status-error" icon={<WarningOutlined />}>
              Error
            </Tag>
          )}

          {parallelExecution ? (
            <Tag className="status-tag status-parallel" icon={<ThunderboltOutlined />}>
              Parallel
            </Tag>
          ) : (
            <Tag className="status-tag status-sequential" icon={<RightOutlined />}>
              Sequential
            </Tag>
          )}
        </div>
      </div>

      <div className="graph-card-body">
        <div className="result-panel-header">
          <div className="result-info-grid">
            <div className="result-info-item">
              <div className="result-info-label">Conversation ID</div>
              <div className="result-info-value">
                <KeyOutlined className="result-info-icon" />
                <Tooltip title={currentResult.conversation_id}>
                  <Text copyable={{ text: currentResult.conversation_id }}>
                    {currentResult.conversation_id.substring(0, 12)}...
                  </Text>
                </Tooltip>
              </div>
            </div>

            <div className="result-info-item">
              <div className="result-info-label">Graph Name</div>
              <div className="result-info-value">
                <BranchesOutlined className="result-info-icon" />
                <Text>{currentResult.graph_name}</Text>
              </div>
            </div>
          </div>
        </div>

        <div className="result-section">
          <div className="section-header">
            <RightOutlined className="section-icon" />
            <h4 className="section-title">Input</h4>
          </div>
          <div className="result-content">
            {currentResult.input}
          </div>
          <Button
            type="text"
            icon={<CopyOutlined />}
            size="small"
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(currentResult.input)}
          >
            Copy
          </Button>
        </div>

        <div className="result-section">
          <div className="section-header">
            <MessageOutlined className="section-icon" />
            <h4 className="section-title">Output</h4>
          </div>
          <div className="result-content">
            {currentResult.output}
          </div>
          <Button
            type="text"
            icon={<CopyOutlined />}
            size="small"
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(currentResult.output)}
          >
            Copy
          </Button>
        </div>

        <div className="result-section">
          <div className="section-header">
            <NodeIndexOutlined className="section-icon" />
            <h4 className="section-title">Node Execution Details</h4>
          </div>

          <div className="node-execution-collapse">
            <Collapse expandIconPosition="end">
              {currentResult.node_results.map((node, index) => (
                <Panel
                  key={index}
                  header={
                    <CustomPanelHeader
                      node={node}
                      isSubgraph={node.is_subgraph}
                      level={node.level}
                    />
                  }
                  className={node.is_subgraph ? 'subgraph-panel' : 'node-panel'}
                >
                  {node.is_subgraph ? (
                    <SubgraphNode node={node} />
                  ) : (
                    <NodeContent node={node} />
                  )}
                </Panel>
              ))}
            </Collapse>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPanel;