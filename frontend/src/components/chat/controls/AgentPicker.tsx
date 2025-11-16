// src/components/chat/controls/AgentPicker.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Button, Tooltip, Typography, Spin, message, Tag } from 'antd';
import { Bot } from 'lucide-react';
import { listAgents, AgentListItem } from '../../../services/agentService';

const { Text } = Typography;

/**
 * Agent 选择器组件属性
 */
interface AgentPickerProps {
  /** 当前选中的 Agent */
  selectedAgent: string | null;
  /** Agent 选择变更回调 */
  onAgentChange: (agentName: string | null) => void;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * Agent 选择器组件
 *
 * 用于在对话输入区域选择预配置的 Agent。
 * 提供一个下拉面板，显示所有可用的 Agent，
 * 用户点击后可以选择或取消选择 Agent。
 */
const AgentPicker: React.FC<AgentPickerProps> = ({
  selectedAgent,
  onAgentChange,
  size = 'small',
  className = ''
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await listAgents();
      setAgents(response.agents || []);
    } catch (error) {
      console.error('加载 Agent 列表失败:', error);
      message.error('加载 Agent 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (!showPanel && agents.length === 0) {
      loadAgents();
    }
    setShowPanel(!showPanel);
  };

  const handleSelectAgent = (agentName: string) => {
    if (selectedAgent === agentName) {
      onAgentChange(null);
    } else {
      onAgentChange(agentName);
    }
    setShowPanel(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <Tooltip title={selectedAgent ? `当前 Agent: ${selectedAgent}` : '选择 Agent'}>
        <Button
          type="text"
          icon={<Bot size={14} strokeWidth={1.5} />}
          onClick={handleButtonClick}
          size={size}
          loading={loading}
          style={{
            color: selectedAgent ? '#b85845' : 'rgba(139, 115, 85, 0.75)',
            border: 'none',
            background: showPanel || selectedAgent ? 'rgba(184, 88, 69, 0.1)' : 'transparent',
            transition: 'all 0.2s ease',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = selectedAgent ? '#b85845' : 'rgba(139, 115, 85, 0.75)';
            e.currentTarget.style.background = showPanel || selectedAgent ? 'rgba(184, 88, 69, 0.1)' : 'transparent';
          }}
        />
      </Tooltip>

      {showPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '8px',
          minWidth: '280px',
          maxWidth: '360px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
          animation: 'slideUp 0.2s ease-out'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text strong style={{ color: '#2d2d2d', fontSize: '13px' }}>选择 Agent</Text>
            {selectedAgent && (
              <Button
                type="text"
                size="small"
                onClick={() => handleSelectAgent(selectedAgent)}
                style={{ fontSize: '12px', color: '#b85845' }}
              >
                清除选择
              </Button>
            )}
          </div>
          <div style={{
            padding: '8px',
            maxHeight: '320px',
            overflowY: 'auto'
          }}>
            {agents.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'rgba(45, 45, 45, 0.45)',
                fontSize: '13px'
              }}>暂无可用的 Agent</div>
            ) : (
              agents.map(agent => (
                <div
                  key={agent.name}
                  onClick={() => handleSelectAgent(agent.name)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: selectedAgent === agent.name
                      ? '1px solid rgba(184, 88, 69, 0.25)'
                      : '1px solid transparent',
                    background: selectedAgent === agent.name
                      ? 'rgba(184, 88, 69, 0.05)'
                      : 'transparent',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAgent !== agent.name) {
                      e.currentTarget.style.background = 'rgba(245, 243, 240, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAgent !== agent.name) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}>
                    <Text strong style={{
                      fontSize: '13px',
                      color: selectedAgent === agent.name ? '#b85845' : '#2d2d2d'
                    }}>
                      {agent.name}
                    </Text>
                    <Tag color="blue" style={{ fontSize: '11px', margin: 0 }}>
                      {agent.model}
                    </Tag>
                  </div>
                  {agent.tags && agent.tags.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      flexWrap: 'wrap',
                      marginTop: '4px'
                    }}>
                      {agent.tags.slice(0, 3).map(tag => (
                        <Tag
                          key={tag}
                          style={{
                            fontSize: '10px',
                            margin: 0,
                            padding: '0 4px',
                            lineHeight: '18px'
                          }}
                        >
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPicker;
