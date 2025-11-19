// src/components/graph-editor/AgentNodeComponent.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Typography, Tooltip } from 'antd';
import {
  GitBranch, Bot, Wrench, AlertTriangle,
  RefreshCw, Zap
} from 'lucide-react';
import { useMCPStore } from '../../store/mcpStore';
import { useT } from '../../i18n/hooks';

const { Text } = Typography;

interface AgentNodeProps {
  data: {
    id: string;
    name: string;
    description?: string;
    is_subgraph: boolean;
    input_nodes: string[];
    output_nodes: string[];
    model_name?: string;
    agent_name?: string;
    subgraph_name?: string;
    mcp_servers: string[];
    system_tools: string[];
    handoffs?: number;
    level?: number;
    selected: boolean;
    onClick: () => void;
  };
}

const AgentNodeComponent: React.FC<AgentNodeProps> = ({ data }) => {
  const t = useT();
  const {
    name,
    is_subgraph,
    input_nodes,
    output_nodes,
    model_name,
    agent_name,
    subgraph_name,
    mcp_servers,
    system_tools,
    handoffs,
    level,
    selected,
    onClick
  } = data;

  const { status } = useMCPStore();



  // Check server connection status
  const hasDisconnectedServers = mcp_servers?.some(server => {
    return status[server] && !status[server].connected;
  });

  // Check if has handoffs feature
  const hasHandoffs = Boolean(handoffs);

  // 构建节点标题区域 - 自然简洁设计
  const renderNodeTitle = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      minHeight: '28px',
      padding: '2px 0'
    }}>
      {/* 主图标 - 子图使用分支图标 */}
      {is_subgraph && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          background: 'rgba(205, 127, 50, 0.1)',
          border: '1px solid rgba(205, 127, 50, 0.2)'
        }}>
          <GitBranch size={12} strokeWidth={2} style={{ color: '#cd7f32' }} />
        </div>
      )}

      {/* 节点名称 */}
      <Text 
        strong 
        ellipsis 
        style={{ 
          flex: 1, 
          fontSize: '13px',
          fontWeight: 600,
          color: '#2d2d2d',
          letterSpacing: '0.3px'
        }}
      >
        {name}
      </Text>
      
      {/* 状态图标组 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* 执行层级 */}
        {level !== undefined && level !== null && (
          <Tooltip title={`${t('components.graphEditor.nodePropertiesPanel.executionLevel')}: ${level}`}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '4px',
              background: 'rgba(184, 88, 69, 0.1)',
              border: '1px solid rgba(184, 88, 69, 0.2)',
              fontSize: '10px',
              fontWeight: 600,
              color: '#b85845',
              letterSpacing: '0.2px'
            }}>
              {level}
            </div>
          </Tooltip>
        )}

        {/* 循环执行 */}
        {hasHandoffs && (
          <Tooltip title={`${t('components.graphEditor.nodePropertiesPanel.loopExecution')}: ${handoffs}${t('components.graphEditor.nodePropertiesPanel.times')}`}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              background: 'rgba(212, 165, 116, 0.1)',
              border: '1px solid rgba(212, 165, 116, 0.2)'
            }}>
              <RefreshCw size={10} strokeWidth={2} style={{ color: '#d4a574' }} />
            </div>
          </Tooltip>
        )}

        {/* 服务器连接警告 */}
        {hasDisconnectedServers && (
          <Tooltip title={t('components.graphEditor.nodePropertiesPanel.disconnectedServers')}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              background: 'rgba(212, 165, 116, 0.15)',
              border: '1px solid rgba(212, 165, 116, 0.3)'
            }}>
              <AlertTriangle size={10} strokeWidth={2} style={{ color: '#d4a574' }} />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );

  // 构建节点内容区域 - 层次分明的信息展示
  const renderNodeContent = () => {
    // 确定显示的主要信息（优先级：agent > model > subgraph）
    let mainIcon = null;
    let mainText = '';

    if (is_subgraph) {
      mainIcon = <GitBranch size={11} strokeWidth={2} style={{ color: '#cd7f32', flexShrink: 0 }} />;
      mainText = subgraph_name || 'N/A';
    } else if (agent_name) {
      mainIcon = <Bot size={11} strokeWidth={2} style={{ color: '#a0826d', flexShrink: 0 }} />;
      mainText = agent_name;
    } else if (model_name) {
      mainIcon = <Zap size={11} strokeWidth={2} style={{ color: '#8b7355', flexShrink: 0 }} />;
      mainText = model_name;
    }

    // 统一的块样式（无背景、无边框）
    const blockStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 0'
    };

    return (
      <div style={{ 
        fontSize: '12px', 
        color: 'rgba(45, 45, 45, 0.85)', 
        lineHeight: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {/* Agent/Model/Subgraph 信息 */}
        {mainText && (
          <div style={blockStyle}>
            {mainIcon}
            <Text 
              ellipsis 
              style={{ 
                flex: 1,
                fontSize: '11px',
                color: 'rgba(45, 45, 45, 0.75)',
                fontWeight: 500
              }}
            >
              {mainText}
            </Text>
          </div>
        )}

        {/* 工具信息（MCP + 系统工具） */}
        {((mcp_servers && mcp_servers.length > 0) || (system_tools && system_tools.length > 0)) && (
          <div style={blockStyle}>
            <Wrench size={11} strokeWidth={2} style={{ color: '#8b7355', flexShrink: 0 }} />
            <Text style={{ 
              fontSize: '11px',
              color: 'rgba(45, 45, 45, 0.75)',
              fontWeight: 500
            }}>
              {mcp_servers?.length || 0} MCP + {system_tools?.length || 0} System Tools
            </Text>
          </div>
        )}

        {/* 节点流向信息 */}
        {((input_nodes && input_nodes.length > 0) || (output_nodes && output_nodes.length > 0)) && (
          <div style={blockStyle}>
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              flex: 1,
              fontSize: '10px',
              color: 'rgba(45, 45, 45, 0.65)'
            }}>
              {input_nodes && input_nodes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ opacity: 0.6 }}>←</span>
                  <span>{input_nodes.slice(0, 2).join(', ')}{input_nodes.length > 2 ? '...' : ''}</span>
                </div>
              )}
              {output_nodes && output_nodes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ opacity: 0.6 }}>→</span>
                  <span>{output_nodes.slice(0, 2).join(', ')}{output_nodes.length > 2 ? '...' : ''}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };



  // 确定节点样式 - 自然质感设计
  const getNodeStyle = () => {
    // 基础样式 - 纸张质感
    let borderColor = 'rgba(139, 115, 85, 0.25)';
    let boxShadow = '0 2px 6px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
    let background = 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)';
    let transform = 'none';

    if (selected) {
      // 选中状态 - 锈红色强调
      borderColor = 'rgba(184, 88, 69, 0.5)';
      boxShadow = '0 4px 12px rgba(184, 88, 69, 0.2), 0 0 0 2px rgba(184, 88, 69, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
      background = 'linear-gradient(to bottom, rgba(255, 255, 255, 0.98) 0%, rgba(250, 248, 245, 0.95) 100%)';
      transform = 'translateY(-1px)';
    } else if (is_subgraph) {
      // 子图节点 - 青铜色调
      borderColor = 'rgba(205, 127, 50, 0.4)';
      boxShadow = '0 3px 8px rgba(205, 127, 50, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -1px 0 rgba(205, 127, 50, 0.08)';
      background = 'linear-gradient(135deg, rgba(255, 252, 248, 0.95) 0%, rgba(250, 245, 238, 0.9) 100%)';
    } else if (hasHandoffs) {
      // 循环节点 - 琥珀色调
      borderColor = 'rgba(212, 165, 116, 0.4)';
      boxShadow = '0 3px 8px rgba(212, 165, 116, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -1px 0 rgba(212, 165, 116, 0.08)';
      background = 'linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(252, 248, 242, 0.9) 100%)';
    } else if (hasDisconnectedServers) {
      // 警告状态 - 琥珀边框
      borderColor = 'rgba(212, 165, 116, 0.5)';
      boxShadow = '0 2px 6px rgba(212, 165, 116, 0.12), 0 0 0 1px rgba(212, 165, 116, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
    }

    return {
      width: 200,
      border: `1.5px solid ${borderColor}`,
      borderRadius: '8px',
      boxShadow,
      background,
      position: 'relative' as const,
      transform,
      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
      backdropFilter: 'blur(8px)',
    };
  };

  return (
    <div onClick={onClick} style={{ position: 'relative' }}>
      {/* 左侧输入连接点 - 纸张质感 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
          border: '2px solid rgba(139, 115, 85, 0.3)',
          width: '10px', 
          height: '10px',
          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      />

      {/* 顶部循环输出连接点 - 琥珀色 */}
      {hasHandoffs && (
        <Handle
          type="source"
          position={Position.Top}
          id="handoff-source"
          style={{ 
            background: 'linear-gradient(135deg, #d4a574 0%, #cd7f32 100%)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            width: '11px', 
            height: '11px',
            boxShadow: '0 2px 6px rgba(212, 165, 116, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        />
      )}

      {/* 顶部循环接收连接点 - 陶土色 */}
      <Handle
        type="target"
        position={Position.Top}
        id="handoff-target"
        style={{ 
          background: hasHandoffs 
            ? 'linear-gradient(135deg, #a0826d 0%, #8b7355 100%)'
            : 'rgba(160, 130, 109, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.9)',
          width: '9px', 
          height: '9px',
          boxShadow: hasHandoffs 
            ? '0 1px 3px rgba(160, 130, 109, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : 'none',
          opacity: hasHandoffs ? 1 : 0.4,
          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      />

      {/* 节点卡片主体 */}
      <Card
        size="small"
        title={renderNodeTitle()}
        style={getNodeStyle()}
        bodyStyle={{ 
          padding: '10px 12px',
          paddingTop: '6px',
          background: 'transparent'
        }}
        headStyle={{
          padding: '10px 12px',
          minHeight: '44px',
          borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
          background: 'transparent'
        }}
      >
        {renderNodeContent()}

        {/* 关键节点标识 - 锈红色点 */}
        {(level !== undefined && level !== null && level < 3) && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: '2px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 1px 3px rgba(184, 88, 69, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }} />
        )}
      </Card>

      {/* 右侧输出连接点 - 纸张质感 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
          border: '2px solid rgba(139, 115, 85, 0.3)',
          width: '10px', 
          height: '10px',
          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      />
    </div>
  );
};

export default AgentNodeComponent;