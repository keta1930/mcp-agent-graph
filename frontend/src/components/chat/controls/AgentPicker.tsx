// src/components/chat/controls/AgentPicker.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Button, Tooltip, Typography, message, Tag } from 'antd';
import { Bot, CheckCircle } from 'lucide-react';
import { listAgents, AgentListItem } from '../../../services/agentService';
import { useT } from '../../../i18n/hooks';

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
  size = 'small'
}) => {
  const t = useT();
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
      console.error(t('components.agentPicker.loadAgentsFailed'), error);
      message.error(t('components.agentPicker.loadAgentsFailed'));
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
      <Tooltip title={selectedAgent ? t('components.agentPicker.currentAgent', { agent: selectedAgent }) : t('components.agentPicker.selectAgent')}>
        <Button
          type="text"
          icon={<Bot size={14} strokeWidth={1.5} />}
          onClick={handleButtonClick}
          size={size}
          loading={loading}
          style={{
            color: selectedAgent ? '#b85845' : '#8b7355',
            border: 'none',
            background: showPanel || selectedAgent ? 'rgba(184, 88, 69, 0.08)' : 'transparent',
            transition: 'all 0.2s ease',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: selectedAgent ? '0 1px 3px rgba(184, 88, 69, 0.15)' : 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = selectedAgent ? '#b85845' : '#8b7355';
            e.currentTarget.style.background = showPanel || selectedAgent ? 'rgba(184, 88, 69, 0.08)' : 'transparent';
          }}
        />
      </Tooltip>

      {showPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '8px',
          minWidth: '320px',
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* 顶部装饰线 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(184, 88, 69, 0.3) 50%, transparent)'
          }} />
          
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text strong style={{ 
              color: '#2d2d2d', 
              fontSize: '14px',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              {t('components.agentPicker.selectAgent')}
            </Text>
            {selectedAgent && (
              <Button
                type="text"
                size="small"
                onClick={() => handleSelectAgent(selectedAgent)}
                style={{ 
                  fontSize: '12px', 
                  color: '#b85845',
                  padding: '2px 8px',
                  height: 'auto',
                  fontWeight: 500
                }}
              >
                {t('components.agentPicker.clearSelection')}
              </Button>
            )}
          </div>
          <div style={{
            padding: '10px',
            maxHeight: '380px',
            overflowY: 'auto'
          }}>
            {agents.length === 0 ? (
              <div style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: 'rgba(45, 45, 45, 0.45)',
                fontSize: '13px',
                letterSpacing: '0.3px'
              }}>
                <Bot size={32} strokeWidth={1.5} style={{ 
                  marginBottom: '12px', 
                  color: 'rgba(139, 115, 85, 0.3)' 
                }} />
                <div>{t('components.agentPicker.noAgents')}</div>
              </div>
            ) : (
              agents.map(agent => (
                <div
                  key={agent.name}
                  onClick={() => handleSelectAgent(agent.name)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                    border: selectedAgent === agent.name
                      ? '1px solid rgba(184, 88, 69, 0.4)'
                      : '1px solid rgba(139, 115, 85, 0.15)',
                    background: selectedAgent === agent.name
                      ? 'rgba(184, 88, 69, 0.05)'
                      : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: selectedAgent === agent.name
                      ? '0 2px 6px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                      : '0 1px 2px rgba(139, 115, 85, 0.04)',
                    marginBottom: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAgent !== agent.name) {
                      e.currentTarget.style.background = 'rgba(245, 243, 240, 0.8)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                      e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAgent !== agent.name) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    {/* 左侧：图标 + Agent名称 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <Bot 
                        size={14} 
                        strokeWidth={1.5}
                        style={{ 
                          color: selectedAgent === agent.name ? '#b85845' : '#8b7355',
                          flexShrink: 0
                        }} 
                      />
                      <Text strong style={{
                        fontSize: '13px',
                        color: selectedAgent === agent.name ? '#b85845' : '#2d2d2d',
                        letterSpacing: '0.3px',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {agent.name}
                      </Text>
                      {selectedAgent === agent.name && (
                        <CheckCircle 
                          size={14} 
                          strokeWidth={2}
                          style={{ 
                            color: '#b85845',
                            flexShrink: 0
                          }} 
                        />
                      )}
                    </div>
                    
                    {/* 右侧：标签 */}
                    {agent.tags && agent.tags.length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexShrink: 0,
                        alignItems: 'center'
                      }}>
                        {agent.tags.slice(0, 2).map(tag => (
                          <Tag
                            key={tag}
                            style={{
                              background: 'rgba(139, 115, 85, 0.08)',
                              color: '#8b7355',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              borderRadius: '4px',
                              fontWeight: 400,
                              fontSize: '10px',
                              padding: '2px 6px',
                              margin: 0,
                              lineHeight: '16px',
                              letterSpacing: '0.2px'
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
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
