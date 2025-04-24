// src/components/graph-runner/InputPanel.tsx
import React, { useState } from 'react';
import { Input, Button, message, Typography } from 'antd';
import { SendOutlined, RocketOutlined } from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';
import './InputPanel.css';

const { TextArea } = Input;
const { Text } = Typography;

const InputPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const { selectedGraph, executeGraph, loading, currentConversation } = useGraphRunnerStore();

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

  return (
    <div className="graph-card input-panel">
      <div className="graph-card-header">
        <h3 className="graph-card-title">
          <RocketOutlined style={{ marginRight: '8px' }} />
          Input
        </h3>
        {selectedGraph && (
          <Text type="secondary" style={{ fontSize: '0.9rem' }}>
            Running: <Text strong>{selectedGraph}</Text>
          </Text>
        )}
      </div>
      <div className="graph-card-body">
        <TextArea
          rows={4}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter your input text here..."
          disabled={!selectedGraph || loading}
          onKeyDown={handleKeyDown}
          className="mb-4"
        />

        <div className="flex justify-start items-center input-spacing">
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            disabled={!selectedGraph}
            onClick={handleSubmit}
            size="large"
            className="flat-execute-button"
          >
            Execute
          </Button>

          <Text type="secondary" className="text-xs ml-4">
            Press Ctrl+Enter to submit
          </Text>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;