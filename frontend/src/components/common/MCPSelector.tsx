// src/components/common/MCPSelector.tsx
import React from 'react';
import { Select, Tag } from 'antd';
import { useT } from '../../i18n/hooks';

const { Option } = Select;

interface MCPSelectorProps {
  /** 当前选中的 MCP 服务器列表 */
  value?: string[];
  /** MCP 服务器选择变更回调 */
  onChange?: (servers: string[]) => void;
  /** 可用的 MCP 服务器列表 */
  mcpServers: string[];
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * MCP 服务器选择器 - 公共组件
 *
 * 用于在多个场景中统一选择 MCP 服务器：
 * - 新建/编辑节点（图编辑器）
 * - 新建/编辑 Agent
 *
 * 特性：
 * - 多选模式
 * - 统一的标签样式
 * - 支持清空和响应式显示
 */
const MCPSelector: React.FC<MCPSelectorProps> = ({
  value = [],
  onChange,
  mcpServers,
  placeholder,
  style
}) => {
  const t = useT();

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      placeholder={placeholder || t('components.mcpSelector.placeholder')}
      allowClear
      maxTagCount="responsive"
      style={{ fontSize: '14px', ...style }}
      tagRender={(props) => {
        const { value: tagValue, closable, onClose } = props;
        return (
          <Tag
            closable={closable}
            onClose={onClose}
            style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '12px',
              padding: '4px 12px',
              marginRight: '4px'
            }}
          >
            {tagValue}
          </Tag>
        );
      }}
      maxTagPlaceholder={(omittedValues) => (
        <Tag
          style={{
            background: 'rgba(139, 115, 85, 0.08)',
            color: '#8b7355',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '12px',
            padding: '2px 8px',
            margin: 0
          }}
        >
          +{omittedValues.length}
        </Tag>
      )}
    >
      {mcpServers.map(server => (
        <Option key={server} value={server}>{server}</Option>
      ))}
    </Select>
  );
};

export default MCPSelector;
