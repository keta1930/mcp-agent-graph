import React, { useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Input,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Select,
  Dropdown,
  Modal,
  Form,
  App,
  Empty,
  Spin,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, LayoutGrid } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useT } from '../i18n/hooks';
import { useI18n } from '../i18n/I18nContext';
import { projectService } from '../services/projectService';
import { ProjectListItem } from '../types/project';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

type SortKey = 'activity' | 'name';

const Projects: React.FC = () => {
  const t = useT();
  const { locale } = useI18n();
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('activity');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null);
  const [form] = Form.useForm();

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await projectService.listProjects();
      setProjects(response.projects || []);
    } catch (error: any) {
      message.error(t('pages.projects.loadFailed', { error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const filtered = keyword
      ? projects.filter((project) => project.name.toLowerCase().includes(keyword))
      : projects;

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      const ta = new Date(a.updated_at).getTime() || 0;
      const tb = new Date(b.updated_at).getTime() || 0;
      return tb - ta;
    });

    return sorted;
  }, [projects, searchText, sortBy]);

  const openCreateModal = () => {
    setEditingProject(null);
    form.setFieldsValue({ name: '', instruction: '' });
    setModalOpen(true);
  };

  const openEditModal = async (project: ProjectListItem) => {
    setEditingProject(project);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const detail = await projectService.getProjectDetail(project.project_id, false);
      form.setFieldsValue({
        name: detail.name,
        instruction: detail.instruction || '',
      });
    } catch (error: any) {
      message.error(t('pages.projects.loadDetailFailed', { error: error.message }));
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setEditingProject(null);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingProject) {
        await projectService.updateProject(editingProject.project_id, {
          name: values.name,
          instruction: values.instruction,
        });
        message.success(t('pages.projects.updateSuccess', { name: values.name }));
      } else {
        await projectService.createProject({
          name: values.name,
          instruction: values.instruction,
        });
        message.success(t('pages.projects.createSuccess', { name: values.name }));
      }
      handleModalCancel();
      loadProjects();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(t('pages.projects.saveFailed', { error: error.message }));
    }
  };

  const handleDelete = (project: ProjectListItem) => {
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
          loadProjects();
        } catch (error: any) {
          message.error(t('pages.projects.deleteFailed', { error: error.message }));
        }
      },
    });
  };

  const renderUpdatedText = (project: ProjectListItem) => {
    if (!project.updated_at) return t('pages.projects.updatedUnknown');
    const timeAgo = formatDistanceToNow(new Date(project.updated_at), {
      addSuffix: true,
      locale: dateLocale,
    });
    return t('pages.projects.updatedAt', { time: timeAgo });
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
          <Space size="large">
            <LayoutGrid size={26} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{ margin: 0, color: '#2d2d2d', fontWeight: 500 }}>
              {t('pages.projects.title')}
            </Title>
          </Space>
          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={1.6} />}
            onClick={openCreateModal}
            style={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c41e3a, #8b0000)',
              boxShadow: '0 6px 16px rgba(196, 30, 58, 0.25)',
              border: 'none',
              height: '36px',
              padding: '0 18px',
              fontWeight: 500,
            }}
          >
            {t('pages.projects.newProject')}
          </Button>
        </div>
      </Header>

      <Content style={{ padding: '28px 48px 40px', overflow: 'auto' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(196, 30, 58, 0.12)',
            boxShadow: '0 4px 16px rgba(139, 115, 85, 0.08)',
            marginBottom: '24px',
          }}
        >
          <Row align="middle" gutter={[16, 16]}>
            <Col xs={24} md={18}>
              <Input
                prefix={<Search size={16} strokeWidth={1.6} style={{ color: 'rgba(45, 24, 16, 0.45)' }} />}
                placeholder={t('pages.projects.searchPlaceholder')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(196, 30, 58, 0.2)',
                  background: 'rgba(255, 255, 255, 0.9)',
                }}
              />
            </Col>
            <Col xs={24} md={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                <Text style={{ color: 'rgba(45, 24, 16, 0.65)' }}>{t('pages.projects.sortBy')}</Text>
                <Select
                  value={sortBy}
                  onChange={(value: SortKey) => setSortBy(value)}
                  style={{ minWidth: 140 }}
                  options={[
                    { label: t('pages.projects.sortActivity'), value: 'activity' },
                    { label: t('pages.projects.sortName'), value: 'name' },
                  ]}
                />
              </div>
            </Col>
          </Row>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Empty
            description={t('pages.projects.empty')}
            style={{ marginTop: '80px' }}
          />
        ) : (
          <Row gutter={[24, 24]}>
            {filteredProjects.map((project) => {
              const menuItems = [
                {
                  key: 'open',
                  label: t('pages.projects.open'),
                  onClick: () => navigate(`/workspace/projects/${project.project_id}`),
                },
                {
                  key: 'edit',
                  label: t('common.edit'),
                  onClick: () => openEditModal(project),
                },
                {
                  key: 'delete',
                  label: t('common.delete'),
                  onClick: () => handleDelete(project),
                },
              ];

              return (
                <Col key={project.project_id} xs={24} sm={12} lg={12} xl={8}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/workspace/projects/${project.project_id}`)}
                    style={{
                      borderRadius: '18px',
                      border: '1px solid rgba(196, 30, 58, 0.12)',
                      background: 'rgba(255, 255, 255, 0.85)',
                      boxShadow: '0 8px 24px rgba(139, 115, 85, 0.1)',
                      minHeight: '140px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: '20px 22px' }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                      }}
                    >
                      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                        <Button
                          type="text"
                          icon={<MoreHorizontal size={16} strokeWidth={1.6} />}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            height: '32px',
                            width: '32px',
                            borderRadius: '8px',
                            color: 'rgba(45, 24, 16, 0.65)',
                          }}
                        />
                      </Dropdown>
                    </div>

                    <Title level={5} style={{ marginBottom: '8px', color: '#2d2d2d' }}>
                      {project.name}
                    </Title>
                    <Text style={{ color: 'rgba(45, 24, 16, 0.65)', fontSize: '13px' }}>
                      {renderUpdatedText(project)}
                    </Text>
                    <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                      <Text style={{ color: 'rgba(45, 24, 16, 0.75)', fontSize: '13px' }}>
                        {t('pages.projects.conversationsCount', { count: project.conversation_count })}
                      </Text>
                      <Text style={{ color: 'rgba(45, 24, 16, 0.75)', fontSize: '13px' }}>
                        {t('pages.projects.filesCount', { count: project.total_files })}
                      </Text>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Content>

      <Modal
        open={modalOpen}
        title={editingProject ? t('pages.projects.editProjectTitle') : t('pages.projects.createProjectTitle')}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
        okText={editingProject ? t('common.save') : t('common.create')}
        cancelText={t('common.cancel')}
        confirmLoading={modalLoading}
        centered
      >
        {modalLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label={t('pages.projects.nameLabel')}
              rules={[{ required: true, message: t('pages.projects.nameRequired') }]}
            >
              <Input placeholder={t('pages.projects.namePlaceholder')} />
            </Form.Item>
            <Form.Item name="instruction" label={t('pages.projects.instructionLabel')}>
              <Input.TextArea
                rows={5}
                placeholder={t('pages.projects.instructionPlaceholder')}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Layout>
  );
};

export default Projects;
