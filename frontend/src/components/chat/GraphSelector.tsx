// src/components/chat/GraphSelector.tsx
import React from 'react';
import { Select } from 'antd';
import { DownOutlined } from '@ant-design/icons';

const { Option } = Select;

/**
 * 图选择器组件属性
 */
interface GraphSelectorProps {
  /** 当前选中的图 */
  value: string;
  /** 图变更回调 */
  onChange: (value: string) => void;
  /** 可用的图列表 */
  availableGraphs: string[];
  /** 占位符文本 */
  placeholder?: string;
  /** 组件大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * 图选择器组件
 *
 * 用于在对话输入区域选择 Graph 工作流。
 * 提供搜索功能，支持按图名称过滤。
 */
const GraphSelector: React.FC<GraphSelectorProps> = ({
  value,
  onChange,
  availableGraphs,
  placeholder = '点击选择Graph',
  size = 'small',
  className = 'graph-select-dropdown'
}) => {
  return (
    <div className="graph-selector-new">
      <Select
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        size={size}
        bordered={false}
        className={className}
        suffixIcon={<DownOutlined />}
        showSearch
        placement="topRight"
        dropdownStyle={{ minWidth: '220px' }}
        filterOption={(input, option) =>
          (option?.children as string)
            ?.toLowerCase()
            .indexOf(input.toLowerCase()) >= 0
        }
      >
        {availableGraphs && availableGraphs.length > 0 && (
          availableGraphs.map(graph => (
            <Option key={graph} value={graph}>
              {graph}
            </Option>
          ))
        )}
      </Select>
    </div>
  );
};

export default GraphSelector;
