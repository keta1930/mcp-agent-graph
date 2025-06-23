// src/pages/ModelManager.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useModelStore } from '../store/modelStore';
import { ModelConfig } from '../types/model';
import ModelForm from '../components/model-manager/ModelForm';
import ErrorMessage from '../components/common/ErrorMessage';
import * as modelService from '../services/modelService';

const ModelManager: React.FC = () => {
  const { models, loading, error, fetchModels, addModel, updateModel, deleteModel } = useModelStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('添加模型');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

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