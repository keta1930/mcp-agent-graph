// src/components/graph-editor/AgentNodeComponent.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Typography, Tooltip, Tag, Badge } from 'antd';
import { 
  BranchesOutlined, RobotOutlined, ApiOutlined, WarningOutlined,
  GlobalOutlined, ClockCircleOutlined, SaveOutlined, LinkOutlined,
  ReloadOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { useMCPStore } from '../../store/mcpStore';

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
    subgraph_name?: string;
    mcp_servers: string[];
    global_output: boolean;
    context: string[];
    context_mode: 'all' | 'latest' | 'latest_n';
    context_n: number;
    handoffs?: number;
    level?: number;
    save?: string;
    selected: boolean;
    onClick: () => void;
  };
}

const AgentNodeComponent: React.FC<AgentNodeProps> = ({ data }) => {
  const {
    name,
    description,
    is_subgraph,
    input_nodes,
    output_nodes,
    model_name,
    subgraph_name,
    mcp_servers,
    global_output,
    context,
    context_mode,
    context_n,
    handoffs,
    level,
    save,
    selected,
    onClick
  } = data;

  const { status } = useMCPStore();

  // 从input_nodes和output_nodes判断起始和结束状态
  const is_start = input_nodes?.includes('start') || false;
  const is_end = output_nodes?.includes('end') || false;

  // Check server connection status
  const hasDisconnectedServers = mcp_servers?.some(server => {
    return status[server] && !status[server].connected;
  });

  // 构建节点标题区域
  const renderNodeTitle = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '24px' }}>
      {/* 主图标 */}
      {is_subgraph ? (
        <BranchesOutlined style={{
          color: '#1677ff',
          fontSize: '16px'
        }} />
      ) : (
        <RobotOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
      )}
      
      {/* 节点名称 */}
      <Text strong ellipsis style={{ flex: 1, fontSize: '13px' }}>
        {name}
      </Text>
      
      {/* 状态图标 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* 执行层级 */}
        {level !== undefined && level !== null && (
          <Tooltip title={`执行层级: ${level}`}>
            <Badge 
              count={level} 
              style={{ 
                backgroundColor: '#108ee9', 
                fontSize: '10px',
                height: '16px',
                minWidth: '16px',
                lineHeight: '16px'
              }} 
            />
          </Tooltip>
        )}

        {/* 循环次数 */}
        {handoffs && handoffs > 1 && (
          <Tooltip title={`循环执行: ${handoffs}次`}>
            <ReloadOutlined style={{ color: '#fa8c16', fontSize: '12px' }} />
          </Tooltip>
        )}

        {/* 全局输出 */}
        {global_output && (
          <Tooltip title="全局输出节点">
            <GlobalOutlined style={{ color: '#722ed1', fontSize: '12px' }} />
          </Tooltip>
        )}

        {/* 文件保存 */}
        {save && (
          <Tooltip title={`保存为 ${save.toUpperCase()} 文件`}>
            <SaveOutlined style={{ color: '#13c2c2', fontSize: '12px' }} />
          </Tooltip>
        )}

        {/* 上下文引用 */}
        {context && context.length > 0 && (
          <Tooltip title={`引用 ${context.length} 个节点的输出`}>
            <LinkOutlined style={{ color: '#eb2f96', fontSize: '12px' }} />
          </Tooltip>
        )}

        {/* 服务器连接警告 */}
        {hasDisconnectedServers && (
          <Tooltip title="使用了断开连接的服务器">
            <WarningOutlined style={{ color: '#faad14', fontSize: '12px' }} />
          </Tooltip>
        )}
      </div>
    </div>
  );

  // 构建节点内容区域
  const renderNodeContent = () => (
    <div style={{ fontSize: '11px', color: '#666', lineHeight: '16px' }}>
      {/* 描述信息 */}
      {description && (
        <div style={{ 
          marginBottom: '6px', 
          color: '#8c8c8c',
          fontSize: '10px',
          fontStyle: 'italic'
        }}>
          <Text ellipsis style={{ maxWidth: '160px' }}>{description}</Text>
        </div>
      )}

      {/* 模型/子图信息 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
        {is_subgraph ? (
          <>
            <BranchesOutlined style={{ marginRight: '4px', fontSize: '11px', color: '#1677ff' }} />
            <Text ellipsis style={{ maxWidth: '140px', fontSize: '11px' }}>
              {subgraph_name || 'N/A'}
            </Text>
          </>
        ) : (
          <>
            <RobotOutlined style={{ marginRight: '4px', fontSize: '11px', color: '#52c41a' }} />
            <Text ellipsis style={{ maxWidth: '140px', fontSize: '11px' }}>
              {model_name || 'N/A'}
            </Text>
          </>
        )}
      </div>

      {/* MCP服务器信息 */}
      {mcp_servers && mcp_servers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <ApiOutlined style={{ marginRight: '4px', fontSize: '11px', color: '#fa8c16' }} />
          {mcp_servers.length > 1 ? (
            <Tooltip title={mcp_servers.join(', ')}>
              <Text style={{ fontSize: '11px' }}>{mcp_servers.length} 个服务</Text>
            </Tooltip>
          ) : (
            <Text ellipsis style={{ maxWidth: '140px', fontSize: '11px' }}>
              {mcp_servers[0]}
            </Text>
          )}
        </div>
      )}

      {/* 连接信息 */}
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
        {input_nodes && input_nodes.length > 0 && (
          <div style={{ marginBottom: '2px' }}>
            输入: {input_nodes.slice(0, 2).join(', ')}{input_nodes.length > 2 ? '...' : ''}
          </div>
        )}
        {output_nodes && output_nodes.length > 0 && (
          <div>
            输出: {output_nodes.slice(0, 2).join(', ')}{output_nodes.length > 2 ? '...' : ''}
          </div>
        )}
      </div>

      {/* 上下文信息 */}
      {context && context.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <LinkOutlined style={{ marginRight: '4px', fontSize: '11px', color: '#eb2f96' }} />
          <Tooltip title={`引用模式: ${context_mode === 'all' ? '所有输出' : 
            context_mode === 'latest' ? '最新输出' : `最新${context_n}次输出`}`}>
            <Text style={{ fontSize: '11px' }}>
              引用 {context.length} 个节点
            </Text>
          </Tooltip>
        </div>
      )}
    </div>
  );

  // 构建底部标签区域
  const renderNodeTags = () => {
    const tags = [];
    
    if (is_start) {
      tags.push(<Tag key="start" color="green" style={{ fontSize: '10px', margin: '2px 2px 0 0' }}>开始</Tag>);
    }
    if (is_end) {
      tags.push(<Tag key="end" color="blue" style={{ fontSize: '10px', margin: '2px 2px 0 0' }}>结束</Tag>);
    }
    
    return tags.length > 0 ? (
      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap' }}>
        {tags}
      </div>
    ) : null;
  };

  // 确定节点样式
  const getNodeStyle = () => {
    let borderColor = '#d9d9d9';
    let boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    let background = 'white';

    if (selected) {
      borderColor = '#1677ff';
      boxShadow = '0 0 0 2px rgba(22,119,255,0.2)';
    } else if (is_subgraph) {
      borderColor = '#1677ff';
      boxShadow = '0 0 8px rgba(22,119,255,0.2)';
      background = 'linear-gradient(to bottom, #f5f9ff, #ffffff)';
    } else if (global_output) {
      borderColor = '#722ed1';
      boxShadow = '0 0 6px rgba(114,46,209,0.2)';
      background = 'linear-gradient(to bottom, #f9f0ff, #ffffff)';
    } else if (hasDisconnectedServers) {
      boxShadow = '0 0 0 1px #faad14';
    }

    return {
      width: 190,
      border: `1px solid ${borderColor}`,
      borderRadius: '6px',
      boxShadow,
      background,
      position: 'relative' as const,
    };
  };

  return (
    <div onClick={onClick}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#555', width: '8px', height: '8px' }}
      />

      <Card
        size="small"
        title={renderNodeTitle()}
        style={getNodeStyle()}
        bodyStyle={{ 
          padding: '8px 12px',
          paddingTop: '4px'
        }}
        headStyle={{
          padding: '8px 12px',
          minHeight: '40px',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        {renderNodeContent()}
        {renderNodeTags()}

        {/* 特殊标识 - 如果是关键节点类型 */}
        {(level !== undefined && level !== null && level < 3) && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ff4d4f',
            border: '1px solid white'
          }} />
        )}
      </Card>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
    </div>
  );
};

export default AgentNodeComponent;