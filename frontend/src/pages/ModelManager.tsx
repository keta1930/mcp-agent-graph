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
  const [modalTitle, setModalTitle] = useState('Add Model');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const showAddModal = () => {
    setCurrentModel(undefined);
    setModalTitle('Add Model');
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
        console.warn('Failed to get full model config, using basic info');
        setCurrentModel(model);
      }
    } catch (error) {
      // 如果获取完整配置失败，使用基本信息
      console.warn('Failed to get full model config, using basic info:', error);
      setCurrentModel(model);
      message.warning('Could not load full model configuration, showing basic info only');
    } finally {
      setEditLoading(false);
      setModalTitle('Edit Model');
      setModalVisible(true);
    }
  };

  const handleFormSubmit = async (formData: ModelConfig) => {
    try {
      if (currentModel) {
        await updateModel(currentModel.name, formData);
        message.success(`Model "${formData.name}" updated successfully`);
      } else {
        await addModel(formData);
        message.success(`Model "${formData.name}" added successfully`);
      }
      setModalVisible(false);
    } catch (err) {
      message.error('Operation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDelete = async (modelName: string) => {
    try {
      await deleteModel(modelName);
      message.success(`Model "${modelName}" deleted successfully`);
    } catch (err) {
      message.error('Delete failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Base URL',
      dataIndex: 'base_url',
      key: 'base_url',
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ModelConfig) => (
        <Space size="middle">
          <Button
            className="action-btn-edit"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            loading={editLoading}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this model?"
            onConfirm={() => handleDelete(record.name)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              className="action-btn-delete"
              icon={<DeleteOutlined />}
              danger
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold model-manager-title">Model Manager</h1>
      </div>

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
          Add Model
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