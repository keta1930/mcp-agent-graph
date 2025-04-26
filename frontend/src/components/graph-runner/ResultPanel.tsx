// src/components/graph-runner/ResultPanel.tsx
import React from 'react';
import { Spin, Empty, Tag, Collapse, Typography, Tooltip } from 'antd';
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
  ThunderboltOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

const ResultPanel: React.FC = () => {
  const { conversations, currentConversation, loading, parallelExecution } = useGraphRunnerStore();

  const currentResult = currentConversation
    ? conversations[currentConversation]
    : null;

  if (loading) {
    return (
      <div className="graph-card">
        <div className="graph-card-header">
          <h3 className="graph-card-title">
            <SyncOutlined spin style={{ marginRight: '8px' }} />
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
            <MessageOutlined style={{ marginRight: '8px' }} />
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
          <MessageOutlined style={{ marginRight: '8px' }} />
          Results
        </h3>

        {currentResult.completed ? (
          <Tag className="status-tag status-completed">
            <CheckCircleOutlined /> Completed
          </Tag>
        ) : (
          <Tag className="status-tag status-processing">
            <ClockCircleOutlined /> In Progress
          </Tag>
        )}

        {currentResult.error && (
          <Tag className="status-tag status-error">
            <WarningOutlined /> Error
          </Tag>
        )}
      </div>

      <div className="graph-card-body">
        <div className="result-panel-header">
          <div className="result-info-grid">
            <div className="result-info-item">
              <div className="result-info-label">Conversation ID</div>
              <div className="result-info-value">
                <KeyOutlined style={{ marginRight: '6px', fontSize: '0.9rem' }} />
                <Tooltip title="Click to copy">
                  <Text copyable={{ text: currentResult.conversation_id }}>
                    {currentResult.conversation_id.substring(0, 12)}...
                  </Text>
                </Tooltip>
              </div>
            </div>

            {/* 新增: 执行模式信息 */}
            <div className="result-info-item">
              <div className="result-info-label">Execution Mode</div>
              <div className="result-info-value">
                {parallelExecution ? (
                  <Tag color="blue" icon={<ThunderboltOutlined />}>Parallel</Tag>
                ) : (
                  <Tag color="default" icon={<RightOutlined />}>Sequential</Tag>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="result-section">
          <h4 className="result-section-title">
            <RightOutlined /> Input
          </h4>
          <div className="result-content">
            {currentResult.input}
          </div>
        </div>

        <div className="result-section">
          <h4 className="result-section-title">
            <MessageOutlined /> Output
          </h4>
          <div className="result-content">
            {currentResult.output}
          </div>
        </div>

        <div className="result-section">
          <h4 className="result-section-title">
            <NodeIndexOutlined /> Node Execution Details
          </h4>

          <div className="node-collapse">
            <Collapse expandIconPosition="end">
              {currentResult.node_results.map((node, index) => (
                <Panel
                  key={index}
                  header={
                    <div className="node-name">
                      {node.node_name}
                      {node.is_start_input && (
                        <span className="node-badge node-badge-start">Start</span>
                      )}
                      {node.error && (
                        <span className="node-badge node-badge-error">Error</span>
                      )}
                      {/* 新增: 显示节点层级 */}
                      {node.level !== undefined && (
                        <span className="node-badge node-badge-level">Level {node.level}</span>
                      )}
                    </div>
                  }
                >
                  <div className="node-item-content">
                    <div>
                      <div className="node-io-label">Input:</div>
                      <div className="node-io-content">{node.input}</div>
                    </div>

                    <div>
                      <div className="node-io-label">Output:</div>
                      <div className="node-io-content">{node.output}</div>
                    </div>

                    {node.tool_calls && node.tool_calls.length > 0 && (
                      <div>
                        <div className="node-io-label">
                          <CodeOutlined style={{ marginRight: '6px' }} />
                          Tool Calls ({node.tool_calls.length})
                        </div>
                        <div className="subgraph-collapse">
                          <Collapse>
                            {node.tool_calls.map((tool, idx) => (
                              <Panel
                                header={tool.name || 'Unknown tool'}
                                key={idx}
                              >
                                <pre>{JSON.stringify(tool, null, 2)}</pre>
                              </Panel>
                            ))}
                          </Collapse>
                        </div>
                      </div>
                    )}

                    {node.error && (
                      <div>
                        <div className="node-io-label">
                          <ExceptionOutlined style={{ marginRight: '6px', color: '#ef4444' }} />
                          Error:
                        </div>
                        <div className="node-error">{node.error}</div>
                      </div>
                    )}

                    {node.is_subgraph && node.subgraph_results && (
                      <div>
                        <div className="node-io-label">
                          <BranchesOutlined style={{ marginRight: '6px' }} />
                          Subgraph Results:
                        </div>
                        <div className="subgraph-collapse">
                          <Collapse>
                            {node.subgraph_results.map((subResult, subIdx) => (
                              <Panel
                                header={`Subnode: ${subResult.node_name}`}
                                key={subIdx}
                              >
                                <pre>{JSON.stringify(subResult, null, 2)}</pre>
                              </Panel>
                            ))}
                          </Collapse>
                        </div>
                      </div>
                    )}
                  </div>
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