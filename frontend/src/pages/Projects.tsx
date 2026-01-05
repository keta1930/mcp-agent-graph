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
  Modal,
  Form,
  App,
  Empty,
  Spin,
  Tag,
  Popconfirm,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, LayoutGrid, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useT } from '../i18n/hooks';
import { useI18n } from '../i18n/I18nContext';
import { projectService } from '../services/projectService';
import { ProjectListItem } from '../types/project';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// 样式常量 - 与 PromptManager 保持一致
const HEADER_STYLES = {
  container: {
    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
    backdropFilter: 'blur(20px)',
    padding: '0 48px',
    borderBottom: 'none',
    boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
    position: 'relative' as const,
  },
  decorativeLine: {
    position: 'absolute' as const,
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '1px',
    background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)',
  },
  title: {
    margin: 0,
    color: '#2d2d2d',
    fontWeight: 500,
    letterSpacing: '2px',
    fontSize: '18px',
  },
};

const TAG_STYLES = {
  primary: {
    background: 'rgba(184, 88, 69, 0.08)',
    color: '#b85845',
    border: '1px solid rgba(184, 88, 69, 0.25)',
    borderRadius: '6px',
    fontWeight: 500,
    padding: '4px 12px',
    fontSize: '13px',
  },
};

const BUTTON_STYLES = {
  primary: {
    background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.3px',
    boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
  },
};

const INPUT_STYLES = {
  search: {
    width: 240,
    height: '40px',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.85)',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    color: '#2d2d2d',
    letterSpacing: '0.3px',
    transition: 'all 0.3s ease',
  },
};

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
    form.setFieldsValue({ name: '', instruction: '' });
    setModalOpen(true);
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      await projectService.createProject({
        name: values.name,
        instruction: values.instruction,
      });
      message.success(t('pages.projects.createSuccess', { name: values.name }));
      handleModalCancel();
      loadProjects();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(t('pages.projects.saveFailed', { error: error.message }));
    }
  };

  const handleDelete = async (project: ProjectListItem) => {
    try {
      await projectService.deleteProject(project.project_id);
      message.success(t('pages.projects.deleteSuccess', { name: project.name }));
      loadProjects();
    } catch (error: any) {
      message.error(t('pages.projects.deleteFailed', { error: error.message }));
    }
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
      <Header style={HEADER_STYLES.container}>
        <div style={HEADER_STYLES.decorativeLine} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Space size="large">
            <LayoutGrid size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={HEADER_STYLES.title}>
              {t('pages.projects.title')}
            </Title>
            <Tag style={TAG_STYLES.primary}>
              {t('pages.projects.totalCount', { count: projects.length })}
            </Tag>
          </Space>

          <Space>
            <Input
              placeholder={t('pages.projects.searchPlaceholder')}
              prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={INPUT_STYLES.search}
              allowClear
            />
            <Select
              value={sortBy}
              onChange={(value: SortKey) => setSortBy(value)}
              style={{ minWidth: 140 }}
              options={[
                { label: t('pages.projects.sortActivity'), value: 'activity' },
                { label: t('pages.projects.sortName'), value: 'name' },
              ]}
            />
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={openCreateModal}
              style={BUTTON_STYLES.primary}
            >
              {t('pages.projects.newProject')}
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ flex: 1, padding: '32px 48px', overflow: 'auto' }}>

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
          <Row gutter={[16, 16]}>
            {filteredProjects.map((project) => (
              <Col key={project.project_id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  onClick={() => navigate(`/workspace/projects/${project.project_id}`)}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 115, 85, 0.12)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06)',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  bodyStyle={{ padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <Title level={5} style={{ margin: 0, color: '#2d2d2d', fontSize: '14px', fontWeight: 600, flex: 1 }}>
                      {project.name}
                    </Title>
                    <Popconfirm
                      title={t('pages.projects.deleteConfirmTitle')}
                      description={t('pages.projects.deleteConfirmMessage', { name: project.name })}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDelete(project);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText={t('common.delete')}
                      cancelText={t('common.cancel')}
                      okButtonProps={{ style: { background: '#b85845', borderColor: '#b85845' } }}
                    >
                      <Button
                        type="text"
                        icon={<Trash2 size={13} strokeWidth={1.5} />}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          height: '24px',
                          width: '24px',
                          borderRadius: '4px',
                          color: 'rgba(139, 115, 85, 0.5)',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          flexShrink: 0,
                          marginLeft: '8px',
                        }}
                      />
                    </Popconfirm>
                  </div>

                  <Text style={{ color: 'rgba(45, 24, 16, 0.55)', fontSize: '12px' }}>
                    {renderUpdatedText(project)}
                  </Text>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '12px' }}>
                    <Text style={{ color: 'rgba(45, 24, 16, 0.65)', fontSize: '12px' }}>
                      {t('pages.projects.conversationsCount', { count: project.conversation_count })}
                    </Text>
                    <Text style={{ color: 'rgba(45, 24, 16, 0.65)', fontSize: '12px' }}>
                      {t('pages.projects.filesCount', { count: project.total_files })}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>

      <Modal
        open={modalOpen}
        title={t('pages.projects.createProjectTitle')}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
        okButtonProps={{
          style: BUTTON_STYLES.primary,
        }}
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
            <Input.TextArea
              rows={5}
              placeholder={t('pages.projects.instructionPlaceholder')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Projects;
