// src/pages/ModelManager.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Button, Select, Card, Row, Col, Typography, Input, Space, Tag as AntTag, Spin, App, Popconfirm, Tooltip } from 'antd';
import { Plus, Star, Edit, Trash2, Server, Globe, Tag, Search as SearchIcon, Settings } from 'lucide-react';
import { useModelStore } from '../store/modelStore';
import { ModelConfig } from '../types/model';
import ModelForm from '../components/model-manager/ModelForm';
import ErrorMessage from '../components/common/ErrorMessage';
import * as modelService from '../services/modelService';
import * as userSettingsService from '../services/userSettingsService';
import { useT } from '../i18n/hooks';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

const ModelManager: React.FC = () => {
  const t = useT();
  const { message } = App.useApp();
  const { models, loading, error, fetchModels, addModel, updateModel, deleteModel } = useModelStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState(t('pages.modelManager.createModel'));
  const [titleGenerationModel, setTitleGenerationModel] = useState<string | null>(null);
  const [titleModelLoading, setTitleModelLoading] = useState(false);
  const [titleModelModalVisible, setTitleModelModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredModels, setFilteredModels] = useState<ModelConfig[]>([]);

  useEffect(() => {
    fetchModels();
    loadTitleGenerationModel();
  }, [fetchModels]);

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredModels(models);
    } else {
      const keyword = searchText.toLowerCase();
      const filtered = models.filter(model =>
        model.name.toLowerCase().includes(keyword) ||
        model.base_url.toLowerCase().includes(keyword) ||
        model.model.toLowerCase().includes(keyword)
      );
      setFilteredModels(filtered);
    }
  }, [models, searchText]);

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
      message.warning(t('pages.modelManager.titleModelSelectWarning'));
      return;
    }

    setTitleModelLoading(true);
    try {
      await userSettingsService.setTitleGenerationModel(modelName);
      setTitleGenerationModel(modelName);
      message.success(t('pages.modelManager.titleModelSetSuccess', { name: modelName }));
    } catch (error) {
      console.error(t('pages.modelManager.titleModelLoadFailed'), error);
      message.error(t('pages.modelManager.titleModelSetFailed', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setTitleModelLoading(false);
    }
  };

  const showAddModal = () => {
    setCurrentModel(undefined);
    setModalTitle(t('pages.modelManager.createModel'));
    setModalVisible(true);
  };

  const showEditModal = async (model: ModelConfig) => {
    try {
      // 获取完整的模型配置用于编辑
      const response = await modelService.getModelForEdit(model.name);
      if (response.status === 'success') {
        setCurrentModel(response.data);
      } else {
        // 如果获取失败，使用基本信息
        console.warn(t('pages.modelManager.titleModelLoadWarning'));
        setCurrentModel(model);
      }
    } catch (error) {
      // 如果获取完整配置失败，使用基本信息
      console.warn(t('pages.modelManager.titleModelLoadWarning'), error);
      setCurrentModel(model);
      message.warning(t('pages.modelManager.titleModelLoadWarning'));
    } finally {
      setModalTitle(t('common.edit'));
      setModalVisible(true);
    }
  };

  const handleFormSubmit = async (formData: ModelConfig) => {
    try {
      if (currentModel) {
        await updateModel(currentModel.name, formData);
        message.success(t('pages.modelManager.updateSuccess', { name: formData.name }));
      } else {
        await addModel(formData);
        message.success(t('pages.modelManager.addSuccess', { name: formData.name }));
      }
      setModalVisible(false);
    } catch (err) {
      message.error(t('pages.modelManager.operationFailed', { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  const handleDelete = async (modelName: string) => {
    try {
      await deleteModel(modelName);
      message.success(t('pages.modelManager.deleteSuccess', { name: modelName }));
    } catch (err) {
      message.error(t('pages.modelManager.deleteFailed', { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      {error && <ErrorMessage message={error} />}

      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* 左侧：图标、标题和统计 */}
          <Space size="large">
            <Server size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              {t('pages.modelManager.title')}
            </Title>
            <AntTag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.modelManager.modelsCount', { count: models.length })}
            </AntTag>
            {titleGenerationModel && (
              <AntTag style={{
                background: 'rgba(139, 115, 85, 0.08)',
                color: '#8b7355',
                border: '1px solid rgba(139, 115, 85, 0.25)',
                borderRadius: '6px',
                fontWeight: 500,
                padding: '4px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Star size={12} strokeWidth={1.5} fill="#8b7355" />
                {t('pages.modelManager.titleModel', { name: titleGenerationModel })}
              </AntTag>
            )}
          </Space>

          {/* 右侧：搜索和操作按钮 */}
          <Space size={12}>
            <Input
              placeholder={t('pages.modelManager.searchPlaceholder')}
              allowClear
              prefix={<SearchIcon size={16} strokeWidth={1.5} style={{ color: '#8b7355', marginRight: '4px' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: 280,
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                color: '#2d2d2d',
                letterSpacing: '0.3px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#b85845';
                e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
              }}
            />
            <Button
              icon={<Settings size={16} strokeWidth={1.5} />}
              onClick={() => setTitleModelModalVisible(true)}
              style={{
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#8b7355',
                fontWeight: 500,
                fontSize: '14px',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 16px'
              }}
            >
              {t('pages.modelManager.titleModelSettings')}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={showAddModal}
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 500,
                fontSize: '14px',
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 20px'
              }}
            >
              {t('pages.modelManager.createModel')}
            </Button>
          </Space>
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <Spin size="large" tip={t('common.loading')} />
          </div>
        ) : filteredModels.length === 0 ? (
          searchText ? (
            <div style={{
              textAlign: 'center',
              marginTop: '120px',
              color: 'rgba(45, 45, 45, 0.45)',
              fontSize: '14px'
            }}>
              {t('pages.modelManager.noMatchingModels', { search: searchText })}
            </div>
          ) : (
            <Card
              style={{
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                background: 'rgba(250, 248, 245, 0.6)',
                textAlign: 'center',
                padding: '40px 20px'
              }}
            >
              <Server size={48} strokeWidth={1.5} style={{ color: 'rgba(139, 115, 85, 0.3)', margin: '0 auto 16px' }} />
              <Text style={{
                fontSize: '14px',
                color: 'rgba(45, 45, 45, 0.65)',
                display: 'block',
                marginBottom: '16px'
              }}>
                {t('pages.modelManager.noModels')}
              </Text>
              <Button
                style={{
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px 16px',
                  height: 'auto',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={showAddModal}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
              >
                <Plus size={16} strokeWidth={1.5} />
                {t('pages.modelManager.createFirstModel')}
              </Button>
            </Card>
          )
        ) : (
          <Row gutter={[16, 16]}>
            {filteredModels.map((model) => (
              <Col xs={24} sm={12} md={12} lg={8} xl={6} key={model.name}>
              <Card
                hoverable
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                styles={{ body: { padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' } }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                }}
              >
                {/* 标题区 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(139, 115, 85, 0.1)'
                }}>
                  {model.name === titleGenerationModel && (
                    <Star size={16} strokeWidth={1.5} style={{ color: '#b85845' }} fill="#b85845" />
                  )}
                  <Server size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                  <Text style={{
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#2d2d2d',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {model.name}
                  </Text>
                </div>

                {/* 内容区 */}
                <div style={{ flex: 1, marginBottom: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <Globe size={14} strokeWidth={1.5} style={{ color: '#8b7355', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{
                        fontSize: '12px',
                        color: 'rgba(45, 45, 45, 0.65)',
                        display: 'block',
                        marginBottom: '2px'
                      }}>
                        {t('pages.modelManager.baseUrl')}
                      </Text>
                      <Text style={{
                        fontSize: '13px',
                        color: '#2d2d2d',
                        wordBreak: 'break-all'
                      }}>
                        {model.base_url}
                      </Text>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <Tag size={14} strokeWidth={1.5} style={{ color: '#8b7355', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{
                        fontSize: '12px',
                        color: 'rgba(45, 45, 45, 0.65)',
                        display: 'block',
                        marginBottom: '2px'
                      }}>
                        {t('pages.modelManager.modelIdentifier')}
                      </Text>
                      <Text style={{
                        fontSize: '13px',
                        color: '#2d2d2d',
                        wordBreak: 'break-all'
                      }}>
                        {model.model}
                      </Text>
                    </div>
                  </div>
                </div>

                {/* 操作按钮区 */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(139, 115, 85, 0.1)'
                }}>
                  <div
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '4px',
                      color: '#8b7355',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '13px',
                      transition: 'all 0.2s ease',
                      background: 'transparent'
                    }}
                    onClick={() => showEditModal(model)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#b85845';
                      e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#8b7355';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Edit size={15} strokeWidth={1.5} />
                    {t('common.edit')}
                  </div>
                  <Popconfirm
                    title={t('pages.modelManager.deleteConfirmTitle')}
                    description={t('pages.modelManager.deleteConfirmMessage', { name: model.name })}
                    onConfirm={() => handleDelete(model.name)}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                    okButtonProps={{
                      style: {
                        background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontWeight: 500,
                        boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
                      }
                    }}
                    cancelButtonProps={{
                      style: {
                        borderRadius: '6px',
                        border: '1px solid rgba(139, 115, 85, 0.2)',
                        color: '#8b7355',
                        fontWeight: 500
                      }
                    }}
                    overlayStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(139, 115, 85, 0.2)'
                    }}
                  >
                    <Tooltip title={t('common.delete')}>
                      <div
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '4px',
                          color: '#8b7355',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontSize: '13px',
                          transition: 'all 0.2s ease',
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#b85845';
                          e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#8b7355';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                        {t('common.delete')}
                      </div>
                    </Tooltip>
                  </Popconfirm>
                </div>
              </Card>
            </Col>
            ))}
          </Row>
        )}
      </Content>

      {/* 标题模型设置 Modal */}
      {titleModelModalVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(45, 45, 45, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setTitleModelModalVisible(false)}
        >
          <Card
            style={{
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
              minWidth: '480px',
              maxWidth: '600px'
            }}
            styles={{ body: { padding: '24px' } }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Star size={18} strokeWidth={1.5} style={{ color: '#b85845' }} />
                <Text style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#2d2d2d'
                }}>
                  {t('pages.modelManager.titleModelModalTitle')}
                </Text>
              </div>
              <Text style={{
                fontSize: '13px',
                color: 'rgba(45, 45, 45, 0.65)'
              }}>
                {t('pages.modelManager.titleModelModalDescription')}
              </Text>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Select
                style={{
                  width: '100%'
                }}
                placeholder={t('pages.modelManager.titleModelSelectPlaceholder')}
                value={titleGenerationModel}
                onChange={handleTitleModelChange}
                loading={titleModelLoading}
                allowClear={false}
                showSearch
                size="large"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={models.map(model => ({
                  label: model.name,
                  value: model.name,
                }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: '#8b7355',
                  padding: '6px 16px',
                  height: 'auto'
                }}
                onClick={() => setTitleModelModalVisible(false)}
              >
                {t('pages.modelManager.close')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ModelForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleFormSubmit}
        initialValues={currentModel}
        title={modalTitle}
      />
    </Layout>
  );
};

export default ModelManager;