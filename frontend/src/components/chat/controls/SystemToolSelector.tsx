// src/components/chat/controls/SystemToolSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button, Checkbox, Tooltip, Typography, Spin, message, Collapse } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { listSystemTools, ToolCategory } from '../../../services/systemToolsService';
import './SystemToolSelector.css';

const { Text } = Typography;
const { Panel } = Collapse;

/**
 * 系统工具选择器组件属性
 */
interface SystemToolSelectorProps {
  /** 已选择的系统工具列表 */
  selectedTools: string[];
  /** 工具选择变更回调 */
  onToolsChange: (tools: string[]) => void;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * 系统工具选择器组件
 * 
 * 用于在对话输入区域选择系统工具。
 * 提供一个下拉面板，显示所有可用的系统工具及其描述，
 * 用户可以通过复选框来选择/取消选择特定的工具。
 */
const SystemToolSelector: React.FC<SystemToolSelectorProps> = ({
  selectedTools,
  onToolsChange,
  size = 'small',
  className = ''
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 加载系统工具列表
  useEffect(() => {
    if (showPanel && categories.length === 0) {
      loadSystemTools();
    }
  }, [showPanel]);

  // 点击外部关闭面板
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

  const loadSystemTools = async () => {
    setLoading(true);
    try {
      const response = await listSystemTools();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('加载系统工具列表失败:', error);
      message.error('加载系统工具列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理工具选择变更
  const handleToolToggle = (toolName: string, checked: boolean) => {
    if (checked) {
      onToolsChange([...selectedTools, toolName]);
    } else {
      onToolsChange(selectedTools.filter(t => t !== toolName));
    }
  };

  // 计算已选择的工具数量
  const selectedCount = selectedTools.length;

  return (
    <div className={`system-tool-selector ${className}`} ref={dropdownRef}>
      <Tooltip title={`系统工具 (${selectedCount}个已选择)`}>
        <Button
          type="text"
          icon={<ToolOutlined />}
          onClick={() => setShowPanel(!showPanel)}
          size={size}
          className={`system-tool-selector-button ${showPanel ? 'active' : ''} ${selectedCount > 0 ? 'has-selection' : ''}`}
        />
      </Tooltip>

      {/* 系统工具面板 */}
      {showPanel && (
        <div className="system-tool-selector-panel">
          <div className="system-tool-selector-header">
            <Text strong>系统工具</Text>
            {selectedCount > 0 && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                已选择 {selectedCount} 个
              </Text>
            )}
          </div>

          <div className="system-tool-selector-content">
            {loading ? (
              <div className="system-tool-selector-loading">
                <Spin tip="加载中..." />
              </div>
            ) : categories.length === 0 ? (
              <div className="system-tool-selector-empty">
                <Text type="secondary">暂无可用的系统工具</Text>
              </div>
            ) : (
              <Collapse
                ghost
                defaultActiveKey={categories.map(cat => cat.category)}
                className="system-tool-selector-collapse"
              >
                {categories.map(category => (
                  <Panel
                    header={
                      <div className="system-tool-category-header">
                        <Text strong>{category.category}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {category.tool_count} 个工具
                        </Text>
                      </div>
                    }
                    key={category.category}
                  >
                    <div className="system-tool-list">
                      {category.tools.map(tool => (
                        <div key={tool.name} className="system-tool-item">
                          <Checkbox
                            checked={selectedTools.includes(tool.name)}
                            onChange={(e) => handleToolToggle(tool.name, e.target.checked)}
                          >
                            <div className="system-tool-info">
                              <Text strong className="system-tool-name">
                                {tool.schema.function.name}
                              </Text>
                              <Text type="secondary" className="system-tool-description">
                                {tool.schema.function.description}
                              </Text>
                            </div>
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  </Panel>
                ))}
              </Collapse>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemToolSelector;
