// src/components/common/SystemToolTreeSelector.tsx
import React from 'react';
import { TreeSelect, Tag } from 'antd';
import { ToolCategory } from '../../services/systemToolsService';
import { useT } from '../../i18n/hooks';

interface SystemToolTreeSelectorProps {
  /** 当前选中的工具列表 */
  value?: string[];
  /** 工具选择变更回调 */
  onChange?: (tools: string[]) => void;
  /** 工具分类列表 */
  categories: ToolCategory[];
  /** 加载状态 */
  loading?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 系统工具树形选择器 - 公共组件
 *
 * 用于在多个场景中统一选择系统工具：
 * - 新建/编辑节点（图编辑器）
 * - 新建/编辑Agent
 *
 * 特性：
 * - 支持分类折叠/展开
 * - 支持选择整个分类或单个工具
 * - 显示工具名称和描述
 * - 统一的标签样式
 */
const SystemToolTreeSelector: React.FC<SystemToolTreeSelectorProps> = ({
  value = [],
  onChange,
  categories,
  loading = false,
  placeholder,
  style
}) => {
  const t = useT();

  // 处理选择变更
  const handleChange = (values: string[]) => {
    // 只保留实际的工具名称，过滤掉分类前缀
    const toolNames = values.filter((v: string) => !v.startsWith('category:'));
    onChange?.(toolNames);
  };

  return (
    <>
      <style>{`
        /* 恢复默认布局：旋转按钮在左，复选框在中间，内容在右 */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-treenode {
          display: flex !important;
          align-items: center;
        }
        
        /* 旋转按钮保持在左侧（默认位置） */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-switcher {
          margin-right: 8px !important;
        }
        
        /* 复选框在右侧 */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-checkbox {
          order: 999 !important;
          margin-left: auto !important;
          margin-right: 8px !important;
        }
        
        /* 内容在中间 */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-node-content-wrapper {
          flex: 1;
          margin-left: 0 !important;
        }
        
        /* 禁用整行的 hover 背景 */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-treenode:hover {
          background-color: transparent !important;
        }
        
        /* 只在内容区域显示 hover 效果 */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-node-content-wrapper:hover {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
        
        /* 旋转按钮 hover 时不显示背景 */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-switcher:hover {
          background-color: transparent !important;
        }
        
        /* 复选框 hover 时显示主题色边框 */
        .system-tool-tree-selector .ant-select-tree .ant-select-tree-checkbox:hover .ant-select-tree-checkbox-inner {
          border-color: #b85845 !important;
        }
      `}</style>
      <TreeSelect
        value={value}
        popupClassName="system-tool-tree-selector"
        treeData={categories.map(category => ({
        title: category.category,
        value: `category:${category.category}`,
        selectable: true,
        children: category.tools.map(tool => ({
          title: (
            <div style={{ padding: '4px 0' }}>
              <div style={{ fontWeight: 500, fontSize: '13px', color: '#2d2d2d' }}>
                {tool.schema.function.name}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', marginTop: '2px', lineHeight: '1.4' }}>
                {tool.schema.function.description}
              </div>
            </div>
          ),
          label: tool.schema.function.name,
          value: tool.name,
          selectable: true
        }))
      }))}
      treeCheckable
      showCheckedStrategy={TreeSelect.SHOW_CHILD}
      placeholder={placeholder || t('components.systemToolTreeSelector.placeholder')}
      allowClear
      maxTagCount="responsive"
      loading={loading}
      style={{ fontSize: '14px', ...style }}
      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
      onChange={handleChange}
      switcherIcon={(props: any) => {
        if (props.isLeaf) return null;
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: '14px',
              color: 'rgba(139, 115, 85, 0.75)',
              transition: 'transform 0.2s ease',
              transform: props.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              fontWeight: 'bold'
            }}
          >
            &gt;
          </span>
        );
      }}
      tagRender={(props) => {
        const { value: tagValue, closable, onClose } = props;
        // 从所有工具中找到对应的工具显示名称
        let toolDisplayName = tagValue as string;
        categories.forEach(category => {
          const tool = category.tools.find(t => t.name === tagValue);
          if (tool) {
            toolDisplayName = tool.schema.function.name;
          }
        });

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
            {toolDisplayName}
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
      treeDefaultExpandAll={false}
      />
    </>
  );
};

export default SystemToolTreeSelector;
