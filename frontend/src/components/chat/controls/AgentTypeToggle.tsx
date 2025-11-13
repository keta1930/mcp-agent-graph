// src/components/chat/controls/AgentTypeToggle.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { ToolOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { AgentType } from '../../../types/conversation';

/**
 * Agent 类型切换按钮组件属性
 */
interface AgentTypeToggleProps {
  /** 当前 Agent 类型 */
  agentType: AgentType;
  /** Agent 类型变更回调 */
  onToggle: (type: AgentType) => void;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * Agent 类型切换按钮组件
 *
 * 用于在 Agent 模式下切换 MCP 工具生成和 Graph 工作流生成。
 * 提供直观的图标和文字标识,帮助用户理解当前模式。
 */
const AgentTypeToggle: React.FC<AgentTypeToggleProps> = ({
  agentType,
  onToggle,
  size = 'small',
  className = ''
}) => {
  /**
   * 处理切换事件
   */
  const handleToggle = () => {
    const newType: AgentType = agentType === 'mcp' ? 'graph' : 'mcp';
    onToggle(newType);
  };

  /**
   * 获取提示文本
   */
  const getTooltipTitle = () => {
    return agentType === 'mcp' ? '切换到Graph生成' : '切换到MCP工具生成';
  };

  /**
   * 获取图标
   */
  const getIcon = () => {
    return agentType === 'mcp' ? <ToolOutlined /> : <NodeIndexOutlined />;
  };

  /**
   * 获取按钮文字
   */
  const getButtonText = () => {
    return agentType === 'mcp' ? 'MCP' : 'Graph';
  };

  return (
    <Tooltip title={getTooltipTitle()}>
      <Button
        type="text"
        icon={getIcon()}
        onClick={handleToggle}
        size={size}
        style={{
          color: agentType === 'graph' ? '#a0826d' : 'rgba(139, 115, 85, 0.75)',
          border: 'none',
          background: agentType === 'graph' ? 'rgba(160, 130, 109, 0.1)' : 'transparent',
          transition: 'all 0.2s ease',
          height: '28px',
          padding: '0 10px',
          fontSize: '12px',
          borderRadius: '6px',
          fontWeight: 500
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#a0826d';
          e.currentTarget.style.background = 'rgba(160, 130, 109, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = agentType === 'graph' ? '#a0826d' : 'rgba(139, 115, 85, 0.75)';
          e.currentTarget.style.background = agentType === 'graph' ? 'rgba(160, 130, 109, 0.1)' : 'transparent';
        }}
      >
        {getButtonText()}
      </Button>
    </Tooltip>
  );
};

export default AgentTypeToggle;
