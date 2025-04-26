// src/components/graph-runner/InputPanel.tsx
import React, { useState } from 'react';
import { Input, Button, message, Typography, Switch, Tooltip, Space } from 'antd';
import {
  SendOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';

const { TextArea } = Input;
const { Text } = Typography;

const InputPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const {
    selectedGraph,
    executeGraph,
    loading,
    currentConversation,
    parallelExecution,
    toggleParallelExecution
  } = useGraphRunnerStore();

  const handleSubmit = async () => {
    if (!input.trim()) {
      message.warning('Please enter content');
      return;
    }

    if (!selectedGraph) {
      message.warning('Please select a graph first');
      return;
    }

    try {
      await executeGraph(input, currentConversation);
      setInput('');
    } catch (error) {
      message.error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const clearInput = () => {
    setInput('');
  };

  return (
    <div className="graph-card input-panel">
      <div className="graph-card-header">
        <h3 className="graph-card-title">
          <RocketOutlined className="card-icon" />
          Input
        </h3>
        {selectedGraph && (
          <Text type="secondary" className="selected-graph-info">
            Running: <Text strong>{selectedGraph}</Text>
          </Text>
        )}
      </div>
      <div className="graph-card-body">
        <div className="textarea-container">
          <TextArea
            rows={4}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter your input text here..."
            disabled={!selectedGraph || loading}
            onKeyDown={handleKeyDown}
            className="custom-textarea"
          />
          {input && (
            <Button
              type="text"
              icon={<ClearOutlined />}
              className="clear-input-button"
              onClick={clearInput}
            />
          )}
        </div>

        <div className="input-controls">
          <div className="left-controls">
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={loading}
              disabled={!selectedGraph || !input.trim()}
              onClick={handleSubmit}
              size="large"
              className="execute-button"
            >
              Execute
            </Button>

            <Text type="secondary" className="keyboard-hint">
              Press Ctrl+Enter to submit
            </Text>
          </div>

          <div className="parallel-execution-control">
            <Tooltip title="When enabled, nodes at the same level will be executed in parallel">
              <Space>
                <Text type="secondary">Parallel Execution</Text>
                <Switch
                  checkedChildren={<ThunderboltOutlined />}
                  unCheckedChildren={<ThunderboltOutlined />}
                  checked={parallelExecution}
                  onChange={toggleParallelExecution}
                  disabled={loading}
                  className="parallel-switch"
                />
                <InfoCircleOutlined className="info-icon" />
              </Space>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;