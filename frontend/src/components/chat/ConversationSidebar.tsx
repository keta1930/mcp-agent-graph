// src/components/chat/ConversationSidebar.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Input, 
  Menu, 
  Dropdown, 
  Button, 
  Modal, 
  Tag, 
  Badge,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import {
  SearchOutlined,
  MoreOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  EditOutlined,
  TagOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useConversationStore } from '../../store/conversationStore';
import { ConversationSummary } from '../../types/conversation';
import { getCurrentUserDisplayName, setUserConfig, getUserConfig } from '../../config/user';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const { TextArea } = Input;

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ 
  conversation, 
  isActive, 
  onClick 
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);
  const [newTags, setNewTags] = useState(conversation.tags.join(', '));

  const {
    updateConversationStatus,
    updateConversationTitle,
    updateConversationTags,
    deleteConversationPermanent,
    showNotification
  } = useConversationStore();

  const getStatusColor = () => {
    switch (conversation.status) {
      case 'active':
        return '#52c41a'; // 绿色
      case 'favorite':
        return '#fa8c16'; // 橙色
      case 'deleted':
        return '#f5222d'; // 红色
      default:
        return '#d9d9d9';
    }
  };

  const getTypeIcon = () => {
    switch (conversation.type) {
      case 'chat':
        return '💬';
      case 'agent':
        return '🤖';
      case 'graph':
        return '📊';
      default:
        return '💬';
    }
  };

  const handleStatusToggle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newStatus = conversation.status === 'favorite' ? 'active' : 'favorite';
      await updateConversationStatus(conversation._id, newStatus);
      showNotification(`已${newStatus === 'favorite' ? '收藏' : '取消收藏'}`, 'success');
    } catch (error) {
      console.error('Status toggle failed:', error);
      showNotification('操作失败', 'error');
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (conversation.status === 'deleted') {
        setDeleteModalVisible(true);
      } else {
        await updateConversationStatus(conversation._id, 'deleted');
        showNotification('已移除到回收站', 'success');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      showNotification('删除失败', 'error');
    }
  };

  const handleEditTitle = async () => {
    if (newTitle.trim() && newTitle !== conversation.title) {
      await updateConversationTitle(conversation._id, newTitle.trim());
    }
    setEditModalVisible(false);
  };

  const handleEditTags = async () => {
    const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean);
    await updateConversationTags(conversation._id, tags);
    setTagsModalVisible(false);
  };

  const handlePermanentDelete = async () => {
    await deleteConversationPermanent(conversation._id);
    setDeleteModalVisible(false);
    showNotification('对话已永久删除', 'success');
  };

  const menuItems = [
    {
      key: 'star',
      icon: conversation.status === 'favorite' ? <StarFilled /> : <StarOutlined />,
      label: conversation.status === 'favorite' ? '取消收藏' : '收藏',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        handleStatusToggle();
      }
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑标题',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        setEditModalVisible(true);
      }
    },
    {
      key: 'tags',
      icon: <TagOutlined />,
      label: '编辑标签',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        setTagsModalVisible(true);
      }
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: conversation.status === 'deleted' ? '永久删除' : '删除',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        handleDelete();
      },
      danger: true
    }
  ];

  // 悬停时显示的详细信息
  const hoverContent = (
    <div className="conversation-hover-details">
      <div className="hover-meta">
        <div><strong>类型:</strong> {conversation.type}</div>
        <div><strong>创建时间:</strong> {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true, locale: zhCN })}</div>
        <div><strong>更新时间:</strong> {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true, locale: zhCN })}</div>
        <div><strong>轮次:</strong> {conversation.round_count}</div>
        <div><strong>Token使用:</strong> {conversation.total_token_usage.total_tokens}</div>
      </div>
      {conversation.tags.length > 0 && (
        <div className="hover-tags">
          <div><strong>标签:</strong></div>
          <div className="tags-list">
            {conversation.tags.map(tag => (
              <Tag key={tag} size="small">{tag}</Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Tooltip 
        title={hoverContent} 
        placement="right"
        overlayClassName="conversation-hover-tooltip"
      >
        <div
          className={`conversation-item ${isActive ? 'active' : ''}`}
          onClick={onClick}
        >
          <div className="conversation-header">
            <div className="conversation-status">
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor() }}
              />
            </div>
            
            <div className="conversation-info">
              <div className="conversation-title">{conversation.title}</div>
              <div className="conversation-type-simple">{conversation.type}</div>
            </div>

            <Dropdown 
              menu={{ items: menuItems }} 
              trigger={['click']}
              onClick={(e) => e.stopPropagation()}
            >
              <Button 
                type="text" 
                size="small" 
                icon={<MoreOutlined />}
                className="conversation-menu"
              />
            </Dropdown>
          </div>
        </div>
      </Tooltip>

      {/* 编辑标题模态框 */}
      <Modal
        title="编辑对话标题"
        open={editModalVisible}
        onOk={handleEditTitle}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="请输入新标题"
          maxLength={100}
        />
      </Modal>

      {/* 编辑标签模态框 */}
      <Modal
        title="编辑对话标签"
        open={tagsModalVisible}
        onOk={handleEditTags}
        onCancel={() => setTagsModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <TextArea
          value={newTags}
          onChange={(e) => setNewTags(e.target.value)}
          placeholder="请输入标签，用逗号分隔"
          rows={3}
        />
      </Modal>

      {/* 永久删除确认模态框 */}
      <Modal
        title="确认永久删除"
        open={deleteModalVisible}
        onOk={handlePermanentDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要永久删除这个对话吗？此操作不可撤销。</p>
        <p><strong>{conversation.title}</strong></p>
      </Modal>
    </>
  );
};

interface ConversationSidebarProps {
  onConversationSelect: (conversationId: string) => void;
  onNewConversation?: () => void;
  activeConversationId?: string;
  onUserNameUpdate?: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  onConversationSelect,
  onNewConversation,
  activeConversationId,
  onUserNameUpdate
}) => {
  const navigate = useNavigate();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [userEditModalVisible, setUserEditModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState(getCurrentUserDisplayName());
  const listRef = useRef<HTMLDivElement>(null);
  const {
    conversations,
    loading,
    searchQuery,
    statusFilter,
    typeFilter,
    sidebarCollapsed,
    theme,
    setSearchQuery,
    setStatusFilter,
    setTypeFilter,
    toggleSidebar,
    setTheme,
    loadConversations,
    silentUpdateConversations,
    showNotification
  } = useConversationStore();

  // 保存滚动位置
  const saveScrollPosition = () => {
    if (listRef.current) {
      setScrollPosition(listRef.current.scrollTop);
    }
  };

  // 恢复滚动位置
  const restoreScrollPosition = () => {
    if (listRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = scrollPosition;
        }
      });
    }
  };

  useEffect(() => {
    loadConversations();
    
    // 定期静默更新对话列表（不显示loading状态，不重置滚动位置）
    const interval = setInterval(() => {
      saveScrollPosition(); // 保存当前滚动位置
      silentUpdateConversations();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadConversations, silentUpdateConversations]);

  // 监听conversations变化，在静默更新后恢复滚动位置
  useEffect(() => {
    if (!loading && conversations.length > 0) {
      restoreScrollPosition();
    }
  }, [conversations, loading]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // 状态筛选 - 现在statusFilter总是有具体值
      if (conv.status !== statusFilter) {
        return false;
      }
      
      // 类型筛选 - 现在typeFilter总是有具体值
      if (conv.type !== typeFilter) {
        return false;
      }
      
      // 搜索筛选
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return conv.title.toLowerCase().includes(query) ||
               conv.tags.some(tag => tag.toLowerCase().includes(query));
      }
      
      return true;
    });
  }, [conversations, searchQuery, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    return conversations.reduce((acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [conversations]);

  const typeCounts = useMemo(() => {
    return conversations.reduce((acc, conv) => {
      acc[conv.type] = (acc[conv.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [conversations]);

  // 处理用户名编辑
  const handleUserNameEdit = () => {
    setNewUserName(currentUserDisplayName);
    setUserEditModalVisible(true);
  };

  const handleUserNameSave = () => {
    if (newUserName.trim()) {
      const currentConfig = getUserConfig();
      setUserConfig({
        ...currentConfig,
        displayName: newUserName.trim()
      });
      // 更新本地状态以触发重新渲染
      setCurrentUserDisplayName(newUserName.trim());
      showNotification('用户名已更新', 'success');
      setUserEditModalVisible(false);
      // 通知父组件用户名已更新
      onUserNameUpdate?.();
    }
  };

  if (sidebarCollapsed) {
    return (
      <div className="conversation-sidebar collapsed">
        <Button
          type="text"
          icon={<MenuUnfoldOutlined />}
          onClick={toggleSidebar}
          className="sidebar-toggle"
        />
      </div>
    );
  }

  return (
    <div className="conversation-sidebar">
      {/* 侧边栏头部 */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <h3>对话列表</h3>
          <div className="header-actions">
            {onNewConversation && (
              <Tooltip title="新建对话">
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={onNewConversation}
                  className="new-conversation-btn"
                />
              </Tooltip>
            )}
            <Button
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={toggleSidebar}
              className="sidebar-toggle"
            />
          </div>
        </div>
        
        <div className="search-section">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="filter-section">
        {/* 第一排：状态筛选 */}
        <div className="filter-tabs status-filters">
          {[
            { key: 'active', label: '普通', count: statusCounts.active || 0 },
            { key: 'favorite', label: '收藏', count: statusCounts.favorite || 0 },
            { key: 'deleted', label: '移除', count: statusCounts.deleted || 0 }
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              type={statusFilter === key ? 'primary' : 'text'}
              size="small"
              onClick={() => setStatusFilter(key as any)}
              className="filter-tab"
            >
              {label} ({count})
            </Button>
          ))}
        </div>

        {/* 第二排：类型筛选 */}
        <div className="filter-tabs type-filters">
          {[
            { key: 'chat', label: 'Chat', count: typeCounts.chat || 0 },
            { key: 'agent', label: 'Agent', count: typeCounts.agent || 0 },
            { key: 'graph', label: 'Graph', count: typeCounts.graph || 0 }
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              type={typeFilter === key ? 'primary' : 'text'}
              size="small"
              onClick={() => setTypeFilter(key as any)}
              className="filter-tab"
            >
              {label} ({count})
            </Button>
          ))}
        </div>
      </div>

      {/* 对话列表 */}
      <div className="conversation-list" ref={listRef} onScroll={saveScrollPosition}>
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <Empty
            description={searchQuery ? "没有找到匹配的对话" : "暂无对话"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          filteredConversations.map(conversation => (
            <ConversationItem
              key={conversation._id}
              conversation={conversation}
              isActive={conversation._id === activeConversationId}
              onClick={() => onConversationSelect(conversation._id)}
            />
          ))
        )}
      </div>

      {/* 底部操作区 */}
      <div className="sidebar-footer">
        <div className="user-info" onClick={handleUserNameEdit} style={{ cursor: 'pointer' }}>
          <UserOutlined />
          <span>{currentUserDisplayName}</span>
        </div>
        
        <div className="footer-actions">
          <Tooltip title={`切换到${theme === 'light' ? '暗色' : '亮色'}模式`}>
            <Button
              type="text"
              icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            />
          </Tooltip>
          
          <Tooltip title="返回主页">
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
            />
          </Tooltip>
        </div>
      </div>

      {/* 用户名编辑模态框 */}
      <Modal
        title="编辑用户名"
        open={userEditModalVisible}
        onOk={handleUserNameSave}
        onCancel={() => setUserEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          placeholder="请输入用户名"
          maxLength={50}
        />
      </Modal>
    </div>
  );
};

export default ConversationSidebar;