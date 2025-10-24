// src/components/chat/AgentTypeToggle.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { ToolOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { AgentType } from '../../types/conversation';

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
        className={`agent-type-toggle ${agentType === 'graph' ? 'active' : ''} ${className}`}
        onClick={handleToggle}
        size={size}
      >
        {getButtonText()}
      </Button>
    </Tooltip>
  );
};

export default AgentTypeToggle;
