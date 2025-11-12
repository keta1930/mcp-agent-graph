// src/pages/ModelManager.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Popconfirm, Select, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useModelStore } from '../store/modelStore';
import { ModelConfig } from '../types/model';
import ModelForm from '../components/model-manager/ModelForm';
import ErrorMessage from '../components/common/ErrorMessage';
import * as modelService from '../services/modelService';
import * as userSettingsService from '../services/userSettingsService';

const { Title, Text } = Typography;

const ModelManager: React.FC = () => {
  const { models, loading, error, fetchModels, addModel, updateModel, deleteModel } = useModelStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('添加模型');
  const [editLoading, setEditLoading] = useState(false);
  const [titleGenerationModel, setTitleGenerationModel] = useState<string | null>(null);
  const [titleModelLoading, setTitleModelLoading] = useState(false);

  useEffect(() => {
    fetchModels();
    loadTitleGenerationModel();
  }, [fetchModels]);

  const loadTitleGenerationModel = async () => {
    try {
      const config = await userSettingsService.getTitleGenerationModel();
      setTitleGenerationModel(config.model_name);
    } catch (error) {
      console.error('加载标题生成模型配置失败:', error);
    }
  };

  const handleTitleModelChange = async (modelName: string | null) => {
    if (!modelName) {
      message.warning('请选择一个模型');
      return;
    }

    setTitleModelLoading(true);
    try {
      await userSettingsService.setTitleGenerationModel(modelName);
      setTitleGenerationModel(modelName);
      message.success(`标题生成模型已设置为: ${modelName}`);
    } catch (error) {
      console.error('设置标题生成模型失败:', error);
      message.error('设置失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTitleModelLoading(false);
    }
  };

  const showAddModal = () => {
    setCurrentModel(undefined);
    setModalTitle('添加模型');
    setModalVisible(true);
  };

  const showEditModal = async (model: ModelConfig) => {
    setEditLoading(true);
    try {
      // 获取完整的模型配置用于编辑
      const response = await modelService.getModelForEdit(model.name);
      if (response.status === 'success') {
        setCurrentModel(response.data);
      } else {
        // 如果获取失败，使用基本信息
        console.warn('获取完整模型配置失败，使用基本信息');
        setCurrentModel(model);
      }
    } catch (error) {
      // 如果获取完整配置失败，使用基本信息
      console.warn('获取完整模型配置失败，使用基本信息:', error);
      setCurrentModel(model);
      message.warning('无法加载完整的模型配置，仅显示基本信息');
    } finally {
      setEditLoading(false);
      setModalTitle('编辑模型');
      setModalVisible(true);
    }
  };

  const handleFormSubmit = async (formData: ModelConfig) => {
    try {
      if (currentModel) {
        await updateModel(currentModel.name, formData);
        message.success(`模型 "${formData.name}" 更新成功`);
      } else {
        await addModel(formData);
        message.success(`模型 "${formData.name}" 添加成功`);
      }
      setModalVisible(false);
    } catch (err) {
      message.error('操作失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDelete = async (modelName: string) => {
    try {
      await deleteModel(modelName);
      message.success(`模型 "${modelName}" 删除成功`);
    } catch (err) {
      message.error('删除失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          {name === titleGenerationModel && (
            <StarFilled style={{ color: '#faad14' }} title="标题生成模型" />
          )}
          {name}
        </Space>
      ),
    },
    {
      title: '基础URL',
      dataIndex: 'base_url',
      key: 'base_url',
    },
    {
      title: '模型标识',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ModelConfig) => (
        <Space size="middle">
          <Button
            className="action-btn-edit"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            loading={editLoading}
          >
            编辑
          </Button>
          <Popconfirm
            title="您确定要删除这个模型吗？"
            onConfirm={() => handleDelete(record.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              className="action-btn-delete"
              icon={<DeleteOutlined />}
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && <ErrorMessage className="error-message" message={error} />}

      {/* 标题生成模型选择器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Text strong>标题生成模型:</Text>
          </Col>
          <Col flex="auto">
            <Select
              style={{ width: '100%', maxWidth: 400 }}
              placeholder="选择用于生成会话标题的模型"
              value={titleGenerationModel}
              onChange={handleTitleModelChange}
              loading={titleModelLoading}
              allowClear={false}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={models.map(model => ({
                label: model.name,
                value: model.name,
              }))}
            />
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {titleGenerationModel ? (
                <>选中的模型将用于自动生成新对话的标题</>
              ) : (
                <>未配置标题生成模型，将不会自动生成标题</>
              )}
            </Text>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={models}
        columns={columns}
        rowKey="name"
        loading={loading}
      />

      {/* Add Model button at bottom left with new styling */}
      <div className="mt-6">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showAddModal}
          className="add-model-btn"
        >
          添加模型
        </Button>
      </div>

      <ModelForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleFormSubmit}
        initialValues={currentModel}
        title={modalTitle}
      />
    </div>
  );
};

export default ModelManager;