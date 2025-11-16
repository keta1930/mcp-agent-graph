// src/components/chat/controls/ModelSelector.tsx
import React from 'react';
import { Select } from 'antd';
import { ChevronDown } from 'lucide-react';

const { Option } = Select;

/**
 * 模型选择器组件属性
 */
interface ModelSelectorProps {
  /** 当前选中的模型 */
  value: string;
  /** 模型变更回调 */
  onChange: (value: string) => void;
  /** 可用的模型列表 */
  availableModels: Array<{ name: string; alias?: string }>;
  /** 占位符文本 */
  placeholder?: string;
  /** 组件大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * 模型选择器组件
 *
 * 用于在对话输入区域选择 AI 模型。
 * 提供搜索功能，支持按模型名称或别名过滤。
 */
const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  availableModels,
  placeholder = '点击选择AI模型',
  size = 'small',
  className = 'model-select-dropdown'
}) => {
  return (
    <div className="model-selector-new">
      <Select
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        size={size}
        bordered={false}
        className={className}
        suffixIcon={<ChevronDown size={14} strokeWidth={1.5} />}
        showSearch
        placement="topRight"
        dropdownStyle={{ minWidth: '220px' }}
        filterOption={(input, option) =>
          (option?.children as string)
            ?.toLowerCase()
            .indexOf(input.toLowerCase()) >= 0
        }
      >
        {availableModels && availableModels.length > 0 && (
          availableModels.map(model => (
            <Option key={model.name} value={model.name}>
              {model.alias || model.name}
            </Option>
          ))
        )}
      </Select>
    </div>
  );
};

export default ModelSelector;
