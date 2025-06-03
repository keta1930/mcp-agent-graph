// src/components/graph-runner/InputArea.tsx
import React, { useState } from 'react';
import { Input, Button, Select, Space, message, Tooltip } from 'antd';
import {
  SendOutlined,
  ApartmentOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';

const { TextArea } = Input;
const { Option } = Select;

const InputArea: React.FC = () => {
  const [input, setInput] = useState('');
  const {
    graphs,
    selectedGraph,
    selectGraph,
    executeGraph,
    loading,
    currentConversation,
    parallelExecution,
    toggleParallelExecution
  } = useGraphRunnerStore();

  const handleSubmit = async () => {
    if (!input.trim()) {
      message.warning('请输入内容');
      return;
    }

    if (!selectedGraph) {
      message.warning('请先选择一个图');
      return;
    }

    try {
      await executeGraph(input, currentConversation);
      setInput('');
    } catch (error) {
      message.error(`执行失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* 工具栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <Space>
          <Select
            placeholder="选择图"
            value={selectedGraph}
            onChange={selectGraph}
            style={{ width: '200px' }}
            size="small"
            suffixIcon={<ApartmentOutlined />}
          >
            {graphs.map(graph => (
              <Option key={graph} value={graph}>{graph}</Option>
            ))}
          </Select>
          
          <Tooltip title="切换并行/串行执行">
            <Button
              type={parallelExecution ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              size="small"
              onClick={toggleParallelExecution}
            >
              {parallelExecution ? '并行执行' : '串行执行'}
            </Button>
          </Tooltip>
        </Space>

        <Space>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
            按 Ctrl+Enter 发送
          </span>
        </Space>
      </div>

      {/* 输入区域 */}
      <div style={{ 
        display: 'flex', 
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <TextArea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedGraph ? "在这里输入您的消息..." : "请先选择一个图..."}
            disabled={!selectedGraph || loading}
            autoSize={{ minRows: 1, maxRows: 6 }}
            style={{
              borderRadius: '12px',
              padding: '12px 50px 12px 16px',
              border: '1px solid #e8e8e8',
              fontSize: '14px',
              resize: 'none'
            }}
          />
          
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            disabled={!selectedGraph || !input.trim()}
            onClick={handleSubmit}
            style={{
              position: 'absolute',
              right: '8px',
              bottom: '8px',
              borderRadius: '8px',
              height: '32px',
              width: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default InputArea;