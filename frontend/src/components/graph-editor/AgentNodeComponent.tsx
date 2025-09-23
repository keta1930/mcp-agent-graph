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

  // 判断是否有handoffs功能
  const hasHandoffs = Boolean(handoffs);

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
        {hasHandoffs && (
          <Tooltip title={`循环执行: ${handoffs}次`}>
            <ReloadOutlined style={{ color: '#fa8c16', fontSize: '12px' }} />
          </Tooltip>
        )}

        {/* 文件保存 */}
        {save && (
          <Tooltip title={`保存为 ${save.toUpperCase()} 文件`}>
            <SaveOutlined style={{ color: '#13c2c2', fontSize: '12px' }} />
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
    } else if (hasHandoffs) {
      // 为有handoffs的节点添加特殊样式
      borderColor = '#fa8c16';
      boxShadow = '0 0 8px rgba(250,140,22,0.3)';
      background = 'linear-gradient(to bottom, #fff7e6, #ffffff)';
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
      {/* 常规左侧输入Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#555', width: '8px', height: '8px' }}
      />

      {/* 为有handoffs的节点添加顶部Handle */}
      {hasHandoffs && (
        <Handle
          type="source"
          position={Position.Top}
          id="handoff-source"
          style={{ 
            background: '#fa8c16', 
            width: '10px', 
            height: '10px',
            border: '2px solid white',
            boxShadow: '0 0 8px rgba(250,140,22,0.4)'
          }}
        />
      )}

      {/* 为所有节点添加顶部接收Handle（用于接收handoffs连接） */}
      <Handle
        type="target"
        position={Position.Top}
        id="handoff-target"
        style={{ 
          background: '#52c41a', 
          width: '8px', 
          height: '8px',
          border: '2px solid white',
          opacity: hasHandoffs ? 1 : 0.3 // 没有handoffs的节点Handle透明度较低
        }}
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

        {/* Handoffs特殊标识 */}
        {hasHandoffs && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#fa8c16',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            ↻
          </div>
        )}

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

      {/* 常规右侧输出Handle */}
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