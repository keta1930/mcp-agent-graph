import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Layout,
  Typography,
  Space,
  Button,
  Card,
  Row,
  Col,
  List,
  Empty,
  Modal,
  Form,
  Input,
  App,
  Spin,
  Tag,
  Select,
  Popconfirm,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, Plus, Upload, Link2, FileText, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useT } from '../i18n/hooks';
import { useI18n } from '../i18n/I18nContext';
import { projectService } from '../services/projectService';
import projectFileService from '../services/projectFileService';
import conversationFileService from '../services/conversationFileService';
import { ConversationService } from '../services/conversationService';
import FileViewModal from '../components/conversation-file/FileViewModal';
import { ProjectDetail as ProjectDetailType, ProjectConversationSummary } from '../types/project';
import { ConversationSummary } from '../types/conversation';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const ProjectDetail: React.FC = () => {
  const t = useT();
  const { locale } = useI18n();
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form] = Form.useForm();
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [createFileLoading, setCreateFileLoading] = useState(false);
  const [createFileForm] = Form.useForm();
  const [pushFileOpen, setPushFileOpen] = useState(false);
  const [pushFileLoading, setPushFileLoading] = useState(false);
  const [pushFileForm] = Form.useForm();
  const [conversationFiles, setConversationFiles] = useState<string[]>([]);
  const [conversationFilesLoading, setConversationFilesLoading] = useState(false);
  const [addConversationOpen, setAddConversationOpen] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');
  const [allConversations, setAllConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProject = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const detail = await projectService.getProjectDetail(projectId, true);
      setProject(detail);
      if (detail.files) {
        setProjectFiles(detail.files);
      }
    } catch (error: any) {
      message.error(t('pages.projectDetail.loadFailed', { error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const loadProjectFiles = async () => {
    if (!projectId) return;
    setFilesLoading(true);
    try {
      const response = await projectFileService.listFiles(projectId);
      setProjectFiles(response.files || []);
    } catch (error: any) {
      message.error(t('pages.projectDetail.filesLoadFailed', { error: error.message }));
    } finally {
      setFilesLoading(false);
    }
  };

  const loadAllConversations = async () => {
    setConversationsLoading(true);
    try {
      const response = await ConversationService.getConversations();
      setAllConversations(response.conversations || []);
    } catch (error: any) {
      message.error(t('pages.projectDetail.conversationsLoadFailed', { error: error.message }));
    } finally {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    loadProjectFiles();
  }, [projectId]);

  const openEditModal = () => {
    if (!project) return;
    form.setFieldsValue({
      name: project.name,
      instruction: project.instruction || '',
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!project) return;
    try {
      const values = await form.validateFields();
      setEditLoading(true);
      await projectService.updateProject(project.project_id, {
        name: values.name,
        instruction: values.instruction,
      });
      message.success(t('pages.projects.updateSuccess', { name: values.name }));
      setEditOpen(false);
      loadProject();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(t('pages.projects.saveFailed', { error: error.message }));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = () => {
    if (!project) return;
    Modal.confirm({
      title: t('pages.projects.deleteConfirmTitle'),
      content: t('pages.projects.deleteConfirmMessage', { name: project.name }),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await projectService.deleteProject(project.project_id);
          message.success(t('pages.projects.deleteSuccess', { name: project.name }));
          navigate('/workspace/projects');
        } catch (error: any) {
          message.error(t('pages.projects.deleteFailed', { error: error.message }));
        }
      },
    });
  };

  const openAddConversationModal = async () => {
    setAddConversationOpen(true);
    setConversationSearch('');
    if (allConversations.length === 0) {
      await loadAllConversations();
    }
  };

  const handleAddConversation = async (conversationId: string) => {
    if (!project) return;
    try {
      await projectService.moveConversationToProject(conversationId, project.project_id);
      message.success(t('pages.projectDetail.conversationAdded'));
      await loadProject();
      await loadAllConversations();
    } catch (error: any) {
      message.error(t('pages.projectDetail.conversationAddFailed', { error: error.message }));
    }
  };

  const handleRemoveConversation = async (conversationId: string) => {
    if (!project) return;
    try {
      await projectService.moveConversationToProject(conversationId, null);
      message.success(t('pages.projectDetail.conversationRemoved'));
      await loadProject();
      await loadAllConversations();
    } catch (error: any) {
      message.error(t('pages.projectDetail.conversationRemoveFailed', { error: error.message }));
    }
  };

  const openCreateFileModal = () => {
    createFileForm.resetFields();
    setCreateFileOpen(true);
  };

  const handleCreateFile = async () => {
    if (!projectId) return;
    try {
      const values = await createFileForm.validateFields();
      setCreateFileLoading(true);
      await projectFileService.createFile(projectId, {
        filename: values.filename,
        summary: values.summary || '',
        content: values.content || '',
        log: values.log || t('pages.projectDetail.fileCreateLog'),
      });
      message.success(t('pages.projectDetail.fileCreateSuccess'));
      setCreateFileOpen(false);
      loadProjectFiles();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(t('pages.projectDetail.fileCreateFailed', { error: error.message }));
    } finally {
      setCreateFileLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectId) return;
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;
    setFilesLoading(true);
    try {
      await Promise.all(files.map((file) => projectFileService.uploadFile(projectId, file)));
      message.success(t('pages.projectDetail.fileUploadSuccess', { count: files.length }));
      loadProjectFiles();
    } catch (error: any) {
      message.error(t('pages.projectDetail.fileUploadFailed', { error: error.message }));
    } finally {
      setFilesLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenFile = (filename: string) => {
    setSelectedFile(filename);
    setFileModalOpen(true);
  };

  const handleDeleteFile = async (filename: string) => {
    if (!projectId) return;
    try {
      await projectFileService.deleteFile(projectId, filename);
      message.success(t('pages.projectDetail.fileDeleteSuccess'));
      loadProjectFiles();
    } catch (error: any) {
      message.error(t('pages.projectDetail.fileDeleteFailed', { error: error.message }));
    }
  };

  const openPushFileModal = async () => {
    pushFileForm.resetFields();
    setConversationFiles([]);
    setPushFileOpen(true);
    if (allConversations.length === 0) {
      await loadAllConversations();
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    setConversationFilesLoading(true);
    try {
      const response = await conversationFileService.listFiles(conversationId);
      setConversationFiles(response.files || []);
      pushFileForm.setFieldsValue({ filename: undefined });
    } catch (error: any) {
      message.error(t('pages.projectDetail.fileLoadConversationFailed', { error: error.message }));
    } finally {
      setConversationFilesLoading(false);
    }
  };

  const handlePushFile = async () => {
    if (!projectId) return;
    try {
      const values = await pushFileForm.validateFields();
      setPushFileLoading(true);
      await projectFileService.pushFileFromConversation(projectId, {
        conversation_id: values.conversationId,
        filename: values.filename,
      });
      message.success(t('pages.projectDetail.filePushSuccess'));
      setPushFileOpen(false);
      loadProjectFiles();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(t('pages.projectDetail.filePushFailed', { error: error.message }));
    } finally {
      setPushFileLoading(false);
    }
  };

  const conversations = useMemo<ProjectConversationSummary[]>(() => {
    return project?.conversations || [];
  }, [project]);

  const availableConversations = useMemo(() => {
    const keyword = conversationSearch.trim().toLowerCase();
    const projectConversationIds = new Set(conversations.map((item) => item.conversation_id));
    return allConversations
      .filter((conv) => !projectConversationIds.has(conv.conversation_id))
      .filter((conv) => (keyword ? conv.title.toLowerCase().includes(keyword) : true));
  }, [allConversations, conversations, conversationSearch]);

  const renderTimeAgo = (value?: string) => {
    if (!value) return t('pages.projectDetail.updatedUnknown');
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: dateLocale });
  };

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      <Header
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.85), rgba(245, 243, 240, 0.6))',
          backdropFilter: 'blur(20px)',
          padding: '0 48px',
          borderBottom: 'none',
          boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Space size="middle">
            <Button
              type="text"
              icon={<ArrowLeft size={16} strokeWidth={1.6} />}
              onClick={() => navigate('/workspace/projects')}
              style={{ color: 'rgba(45, 24, 16, 0.65)' }}
            >
              {t('pages.projectDetail.back')}
            </Button>
            <Title level={4} style={{ margin: 0, color: '#2d2d2d', fontWeight: 500 }}>
              {project?.name || t('pages.projectDetail.title')}
            </Title>
          </Space>
          <Space>
            <Button onClick={openEditModal}>{t('common.edit')}</Button>
            <Button danger onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '28px 48px 40px', overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : !project ? (
          <Empty description={t('pages.projectDetail.notFound')} style={{ marginTop: '80px' }} />
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={15} xl={16}>
              <Card
                style={{
                  borderRadius: '18px',
                  border: '1px solid rgba(196, 30, 58, 0.12)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 8px 24px rgba(139, 115, 85, 0.1)',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <Space align="center">
                    <MessageSquareText size={20} color="#b85845" strokeWidth={1.6} />
                    <Title level={5} style={{ margin: 0 }}>
                      {t('pages.projectDetail.conversations')}
                    </Title>
                  </Space>
                  <Button
                    type="primary"
                    icon={<Plus size={14} />}
                    onClick={openAddConversationModal}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #c41e3a, #8b0000)',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(196, 30, 58, 0.25)',
                      fontWeight: 500,
                    }}
                  >
                    {t('pages.projectDetail.addConversation')}
                  </Button>
                </div>

                {conversations.length === 0 ? (
                  <Empty description={t('pages.projectDetail.noConversations')} />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={conversations}
                    renderItem={(item) => (
                      <List.Item
                        style={{
                          padding: '12px 8px',
                          cursor: 'pointer',
                          borderRadius: '10px',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={() => navigate(`/chat/${item.conversation_id}`)}
                        actions={[
                          <Button
                            key="remove"
                            type="text"
                            icon={<Trash2 size={14} />}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveConversation(item.conversation_id);
                            }}
                            style={{ color: '#b85845' }}
                          >
                            {t('pages.projectDetail.removeConversation')}
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Text style={{ color: '#2d2d2d', fontWeight: 500 }}>
                              {item.title || item.conversation_id}
                            </Text>
                          }
                          description={
                            <Text style={{ color: 'rgba(45, 24, 16, 0.65)' }}>
                              {t('pages.projectDetail.updatedAt', {
                                time: renderTimeAgo(item.updated_at || item.created_at),
                              })}
                            </Text>
                          }
                        />
                        <Text style={{ color: 'rgba(45, 24, 16, 0.45)' }}>
                          {item.conversation_id.slice(-6)}
                        </Text>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={9} xl={8}>
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <Card
                  style={{
                    borderRadius: '18px',
                    border: '1px solid rgba(196, 30, 58, 0.12)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 8px 24px rgba(139, 115, 85, 0.1)',
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  <Space style={{ marginBottom: '12px' }}>
                    <Text style={{ fontWeight: 600, color: '#2d2d2d' }}>
                      {t('pages.projectDetail.instructions')}
                    </Text>
                  </Space>
                  {project.instruction ? (
                    <Paragraph style={{ color: 'rgba(45, 24, 16, 0.75)', whiteSpace: 'pre-wrap' }}>
                      {project.instruction}
                    </Paragraph>
                  ) : (
                    <Empty description={t('pages.projectDetail.noInstructions')} />
                  )}
                </Card>

                <Card
                  style={{
                    borderRadius: '18px',
                    border: '1px solid rgba(196, 30, 58, 0.12)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 8px 24px rgba(139, 115, 85, 0.1)',
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <Space align="center">
                      <Text style={{ fontWeight: 600, color: '#2d2d2d' }}>
                        {t('pages.projectDetail.files')}
                      </Text>
                      <Tag color="gold">{projectFiles.length}</Tag>
                    </Space>
                    <Space size={8}>
                      <Button
                        type="text"
                        icon={<FileText size={14} />}
                        onClick={openCreateFileModal}
                        style={{ color: '#b85845' }}
                      >
                        {t('pages.projectDetail.newFile')}
                      </Button>
                      <Button
                        type="text"
                        icon={<Upload size={14} />}
                        onClick={handleUploadClick}
                        style={{ color: '#8b7355' }}
                      >
                        {t('pages.projectDetail.uploadFile')}
                      </Button>
                      <Button
                        type="text"
                        icon={<Link2 size={14} />}
                        onClick={openPushFileModal}
                        style={{ color: '#8b7355' }}
                      >
                        {t('pages.projectDetail.pushFile')}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        multiple
                        onChange={handleUploadFiles}
                      />
                    </Space>
                  </div>
                  {filesLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                      <Spin />
                    </div>
                  ) : projectFiles.length > 0 ? (
                    <List
                      size="small"
                      dataSource={projectFiles}
                      renderItem={(file) => (
                        <List.Item
                          style={{
                            padding: '8px 0',
                            borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
                          }}
                          actions={[
                            <Button
                              key="open"
                              type="link"
                              onClick={() => handleOpenFile(file)}
                              style={{ padding: 0, color: '#b85845' }}
                            >
                              {t('pages.projectDetail.openFile')}
                            </Button>,
                            <Popconfirm
                              key="delete"
                              title={t('pages.projectDetail.fileDeleteConfirmTitle')}
                              description={t('pages.projectDetail.fileDeleteConfirmMessage', { filename: file })}
                              onConfirm={() => handleDeleteFile(file)}
                              okText={t('common.delete')}
                              cancelText={t('common.cancel')}
                            >
                              <Button type="link" danger style={{ padding: 0 }}>
                                {t('common.delete')}
                              </Button>
                            </Popconfirm>,
                          ]}
                        >
                          <Text style={{ color: 'rgba(45, 24, 16, 0.75)' }}>{file}</Text>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description={t('pages.projectDetail.noFiles')} />
                  )}
                </Card>
              </Space>
            </Col>
          </Row>
        )}
      </Content>

      <Modal
        open={editOpen}
        title={t('pages.projects.editProjectTitle')}
        onCancel={() => setEditOpen(false)}
        onOk={handleEditSave}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={editLoading}
        centered
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('pages.projects.nameLabel')}
            rules={[{ required: true, message: t('pages.projects.nameRequired') }]}
          >
            <Input placeholder={t('pages.projects.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="instruction" label={t('pages.projects.instructionLabel')}>
            <Input.TextArea rows={5} placeholder={t('pages.projects.instructionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={addConversationOpen}
        title={t('pages.projectDetail.addConversationTitle')}
        onCancel={() => setAddConversationOpen(false)}
        footer={null}
        centered
      >
        <Input
          placeholder={t('pages.projectDetail.searchConversations')}
          value={conversationSearch}
          onChange={(event) => setConversationSearch(event.target.value)}
          style={{ marginBottom: '16px' }}
        />
        {conversationsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Spin />
          </div>
        ) : availableConversations.length === 0 ? (
          <Empty description={t('pages.projectDetail.noAvailableConversations')} />
        ) : (
          <List
            dataSource={availableConversations}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="add"
                    type="primary"
                    onClick={() => handleAddConversation(item.conversation_id)}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #c41e3a, #8b0000)',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(196, 30, 58, 0.2)',
                      fontWeight: 500,
                    }}
                  >
                    {t('pages.projectDetail.add')}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Text style={{ color: '#2d2d2d' }}>{item.title || item.conversation_id}</Text>}
                  description={<Text style={{ color: 'rgba(45, 24, 16, 0.65)' }}>{item.conversation_id}</Text>}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

      <Modal
        open={createFileOpen}
        title={t('pages.projectDetail.createFileTitle')}
        onCancel={() => setCreateFileOpen(false)}
        onOk={handleCreateFile}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
        confirmLoading={createFileLoading}
        centered
      >
        <Form form={createFileForm} layout="vertical">
          <Form.Item
            name="filename"
            label={t('pages.projectDetail.fileNameLabel')}
            rules={[{ required: true, message: t('pages.projectDetail.fileNameRequired') }]}
          >
            <Input placeholder={t('pages.projectDetail.fileNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="summary" label={t('pages.projectDetail.fileSummaryLabel')}>
            <Input placeholder={t('pages.projectDetail.fileSummaryPlaceholder')} />
          </Form.Item>
          <Form.Item name="content" label={t('pages.projectDetail.fileContentLabel')}>
            <Input.TextArea rows={6} placeholder={t('pages.projectDetail.fileContentPlaceholder')} />
          </Form.Item>
          <Form.Item name="log" label={t('pages.projectDetail.fileLogLabel')}>
            <Input placeholder={t('pages.projectDetail.fileLogPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={pushFileOpen}
        title={t('pages.projectDetail.pushFileTitle')}
        onCancel={() => setPushFileOpen(false)}
        onOk={handlePushFile}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        confirmLoading={pushFileLoading}
        centered
      >
        <Form form={pushFileForm} layout="vertical">
          <Form.Item
            name="conversationId"
            label={t('pages.projectDetail.selectConversation')}
            rules={[{ required: true, message: t('pages.projectDetail.selectConversationRequired') }]}
          >
            <Select
              showSearch
              placeholder={t('pages.projectDetail.selectConversationPlaceholder')}
              options={allConversations.map((conv) => ({
                label: conv.title || conv.conversation_id,
                value: conv.conversation_id,
              }))}
              onChange={handleConversationSelect}
              filterOption={(input, option) =>
                (option?.label as string).toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="filename"
            label={t('pages.projectDetail.selectFile')}
            rules={[{ required: true, message: t('pages.projectDetail.selectFileRequired') }]}
          >
            <Select
              placeholder={t('pages.projectDetail.selectFilePlaceholder')}
              loading={conversationFilesLoading}
              options={conversationFiles.map((file) => ({ label: file, value: file }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {projectId && (
        <FileViewModal
          visible={fileModalOpen}
          filename={selectedFile}
          resourceId={projectId}
          onClose={() => {
            setFileModalOpen(false);
            setSelectedFile(null);
          }}
          onSave={loadProjectFiles}
          onDelete={loadProjectFiles}
          fileService={projectFileService}
          allowDownload={false}
        />
      )}
    </Layout>
  );
};

export default ProjectDetail;
