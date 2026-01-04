import React, { useEffect, useMemo, useState } from 'react';
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
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useT } from '../i18n/hooks';
import { useI18n } from '../i18n/I18nContext';
import { projectService } from '../services/projectService';
import { ProjectDetail as ProjectDetailType, ProjectConversationSummary } from '../types/project';

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

  const loadProject = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const detail = await projectService.getProjectDetail(projectId, true);
      setProject(detail);
    } catch (error: any) {
      message.error(t('pages.projectDetail.loadFailed', { error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
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

  const conversations = useMemo<ProjectConversationSummary[]>(() => {
    return project?.conversations || [];
  }, [project]);

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
                <Space align="center" style={{ marginBottom: '16px' }}>
                  <MessageSquareText size={20} color="#b85845" strokeWidth={1.6} />
                  <Title level={5} style={{ margin: 0 }}>
                    {t('pages.projectDetail.conversations')}
                  </Title>
                </Space>

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
                  <Space align="center" style={{ marginBottom: '12px' }}>
                    <Text style={{ fontWeight: 600, color: '#2d2d2d' }}>
                      {t('pages.projectDetail.files')}
                    </Text>
                    <Tag color="gold">{project.total_files}</Tag>
                  </Space>
                  {project.files && project.files.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {project.files.map((file) => (
                        <Tag key={file} color="geekblue">
                          {file}
                        </Tag>
                      ))}
                    </div>
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
    </Layout>
  );
};

export default ProjectDetail;
