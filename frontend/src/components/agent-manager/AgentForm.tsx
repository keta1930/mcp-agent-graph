import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, AutoComplete, Row, Col, Tag } from 'antd';
import { AgentConfig, AgentCategoryItem } from '../../services/agentService';
import { ToolCategory } from '../../services/systemToolsService';
import { useT } from '../../i18n/hooks';
import { FORM_SECTION_STYLES } from '../../constants/agentManagerStyles';
import SystemToolTreeSelector from '../common/SystemToolTreeSelector';
import MCPSelector from '../common/MCPSelector';

const { TextArea } = Input;
const { Option } = Select;

interface AgentFormProps {
  form: any;
  initialValues?: AgentConfig;
  isEditing: boolean;
  models: string[];
  systemTools: string[];
  systemToolCategories: ToolCategory[];
  mcpServers: string[];
  categories: AgentCategoryItem[];
}

/**
 * Agent 表单组件
 * 用于创建和编辑 Agent 的表单
 */
const AgentForm: React.FC<AgentFormProps> = ({
  form,
  initialValues,
  isEditing,
  models,
  systemTools,
  systemToolCategories,
  mcpServers,
  categories
}) => {
  const t = useT();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.setFieldsValue({
        max_actions: 50,
        mcp: [],
        system_tools: [],
        tags: []
      });
    }
  }, [form, initialValues]);

  const inputFocusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#b85845';
    e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08)';
  };

  const inputBlurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
    e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
  };

  const baseInputStyle = {
    height: '40px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
    color: '#2d2d2d',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    transition: 'all 0.3s ease'
  };

  const textAreaStyle = {
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
    color: '#2d2d2d',
    lineHeight: '1.6',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
    transition: 'all 0.3s ease'
  };

  return (
    <Form form={form} layout="vertical">
      {/* 基础信息区块 */}
      <div style={FORM_SECTION_STYLES.container}>
        <div style={FORM_SECTION_STYLES.title}>
          {t('pages.agentManager.basicInfo')}
        </div>

        <Form.Item
          label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.agentName')}</span>}
          name="name"
          rules={[
            { required: true, message: t('pages.agentManager.agentNameRequired') },
            { pattern: /^[^/\\.]+$/, message: t('pages.agentManager.agentNameInvalid') }
          ]}
          style={{ marginBottom: '16px' }}
        >
          <Input
            placeholder={t('pages.agentManager.agentNamePlaceholder')}
            disabled={isEditing}
            style={baseInputStyle}
            onFocus={inputFocusStyle}
            onBlur={inputBlurStyle}
          />
        </Form.Item>

        <Form.Item
          label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.capability')}</span>}
          name="card"
          rules={[{ required: true, message: t('pages.agentManager.capabilityRequired') }]}
          style={{ marginBottom: '16px' }}
        >
          <TextArea
            rows={3}
            placeholder={t('pages.agentManager.capabilityPlaceholder')}
            style={textAreaStyle}
            onFocus={inputFocusStyle}
            onBlur={inputBlurStyle}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.category')}</span>}
              name="category"
              rules={[{ required: true, message: t('pages.agentManager.categoryRequired') }]}
              tooltip={{
                title: t('pages.agentManager.categoryTooltip'),
                styles: { root: { fontSize: '13px' } }
              }}
              style={{ marginBottom: '0' }}
            >
              <AutoComplete
                placeholder={t('pages.agentManager.categoryPlaceholder')}
                options={categories.map(cat => ({
                  value: cat.category,
                  label: `${cat.category} (${cat.agent_count}个)`
                }))}
                filterOption={(inputValue, option) =>
                  option?.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
                }
                style={{ height: '40px', fontSize: '14px' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.model')}</span>}
              name="model"
              rules={[{ required: true, message: t('pages.agentManager.modelRequired') }]}
              style={{ marginBottom: '0' }}
            >
              <Select
                placeholder={t('pages.agentManager.modelPlaceholder')}
                showSearch
                style={{ fontSize: '14px' }}
              >
                {models.map((model) => (
                  <Option key={model} value={model}>{model}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* 配置信息区块 */}
      <div style={FORM_SECTION_STYLES.container}>
        <div style={FORM_SECTION_STYLES.title}>
          {t('pages.agentManager.configuration')}
        </div>

        <Form.Item
          label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.instruction')}</span>}
          name="instruction"
          style={{ marginBottom: '16px' }}
        >
          <TextArea
            rows={4}
            placeholder={t('pages.agentManager.instructionPlaceholder')}
            style={{
              ...textAreaStyle,
              fontSize: '13px',
              fontFamily: 'Monaco, Courier New, monospace'
            }}
            onFocus={inputFocusStyle}
            onBlur={inputBlurStyle}
          />
        </Form.Item>

        <Form.Item
          label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.maxActions')}</span>}
          name="max_actions"
          style={{ marginBottom: '0' }}
        >
          <InputNumber
            min={1}
            max={200}
            placeholder="50"
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </Form.Item>
      </div>

      {/* 工具和服务区块 */}
      <div style={FORM_SECTION_STYLES.container}>
        <div style={FORM_SECTION_STYLES.title}>
          {t('pages.agentManager.toolsAndServices')}
        </div>

        {/* 系统工具和MCP服务器 - 两栏布局 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.systemTools')}</span>}
              name="system_tools"
              style={{ marginBottom: '16px' }}
            >
              <SystemToolTreeSelector
                categories={systemToolCategories}
                placeholder={t('pages.agentManager.systemToolsPlaceholder')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.mcpServers')}</span>}
              name="mcp"
              style={{ marginBottom: '16px' }}
            >
              <MCPSelector
                mcpServers={mcpServers}
                placeholder={t('pages.agentManager.mcpServersPlaceholder')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={<span style={FORM_SECTION_STYLES.label}>{t('pages.agentManager.tags')}</span>}
          name="tags"
          style={{ marginBottom: '0' }}
        >
          <Select
            mode="tags"
            placeholder={t('pages.agentManager.tagsPlaceholder')}
            tokenSeparators={[',']}
            maxTagCount="responsive"
            style={{ fontSize: '14px' }}
            tagRender={(props) => {
              const { label, closable, onClose } = props;
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
                  {label}
                </Tag>
              );
            }}
          />
        </Form.Item>
      </div>
    </Form>
  );
};

export default AgentForm;
