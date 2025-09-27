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
  Spin,
  Checkbox
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
  UserOutlined,
  PlusOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  SelectOutlined
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
  isBatchMode?: boolean;
  isSelected?: boolean;
  onSelect?: (conversationId: string, selected: boolean) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  isBatchMode = false,
  isSelected = false,
  onSelect
}) => {
  const navigate = useNavigate();
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
          className={`conversation-item ${isActive ? 'active' : ''} ${isBatchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={isBatchMode ? () => onSelect?.(conversation._id, !isSelected) : onClick}
        >
          <div className="conversation-header">
            {isBatchMode && (
              <div className="conversation-checkbox">
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelect?.(conversation._id, e.target.checked);
                  }}
                />
              </div>
            )}
            <div className="conversation-info">
              <div className="conversation-title">{conversation.title}</div>
            </div>

            {!isBatchMode && (
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
            )}
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
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const {
    conversations,
    loading,
    searchQuery,
    statusFilter,
    typeFilter,
    sidebarCollapsed,
    setSearchQuery,
    setStatusFilter,
    setTypeFilter,
    toggleSidebar,
    loadConversations,
    silentUpdateConversations,
    showNotification,
    batchDeleteConversations
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

  // 批量选择相关处理函数
  const handleBatchModeToggle = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedConversations(new Set());
  };

  const handleConversationSelect = (conversationId: string, selected: boolean) => {
    const newSelected = new Set(selectedConversations);
    if (selected) {
      newSelected.add(conversationId);
    } else {
      newSelected.delete(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredConversations.map(conv => conv._id));
    setSelectedConversations(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedConversations(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedConversations.size === 0) return;
    
    console.log('开始批量删除，选中的对话:', Array.from(selectedConversations));
    
    try {
      const selectedIds = Array.from(selectedConversations);
      const isPermanent = statusFilter === 'deleted';
      
      console.log(`执行${isPermanent ? '永久' : '软'}删除模式`);
      
      const result = await batchDeleteConversations(selectedIds, isPermanent);
      
      // 显示结果通知
      if (result.success > 0) {
        const message = isPermanent 
          ? `已永久删除 ${result.success} 个对话` 
          : `已将 ${result.success} 个对话移至回收站`;
        showNotification(message, 'success');
      }
      
      if (result.failed > 0) {
        showNotification(`${result.failed} 个对话删除失败`, 'error');
      }
      
      console.log(`批量删除完成: 成功 ${result.success} 个，失败 ${result.failed} 个`);
      
      setSelectedConversations(new Set());
      setIsBatchMode(false);
    } catch (error) {
      console.error('Batch delete failed:', error);
      showNotification('批量删除失败', 'error');
    }
  };

  if (sidebarCollapsed) {
    const favoriteCount = statusCounts.favorite || 0;
    const totalCount = conversations.length;

    return (
      <div className="conversation-sidebar collapsed">
        {/* 顶部区域 */}
        <div className="collapsed-header">
          <button
            onClick={toggleSidebar}
            className="collapsed-nav-item collapsed-expand-button"
            title="展开侧边栏"
          >
            <img src="/starstar.png" alt="展开" style={{ width: 16, height: 16 }} />
            <div className="collapsed-tooltip">展开侧边栏</div>
          </button>
        </div>

        {/* 主导航区域 */}
        <div className="collapsed-navigation">
          {/* Chat对话 - 狐狸 */}
          <button
            className={`collapsed-nav-item ${typeFilter === 'chat' ? 'active' : ''}`}
            onClick={() => setTypeFilter('chat')}
            title="Chat对话"
          >
            <span className="animal-icon">🦊</span>
            {typeCounts.chat > 0 && (
              <span className="collapsed-badge">{typeCounts.chat}</span>
            )}
            <div className="collapsed-tooltip">Chat对话 ({typeCounts.chat || 0})</div>
          </button>

          {/* Agent对话 - 猫咪 */}
          <button
            className={`collapsed-nav-item ${typeFilter === 'agent' ? 'active' : ''}`}
            onClick={() => setTypeFilter('agent')}
            title="Agent对话"
          >
            <span className="animal-icon">🐱</span>
            {typeCounts.agent > 0 && (
              <span className="collapsed-badge">{typeCounts.agent}</span>
            )}
            <div className="collapsed-tooltip">Agent对话 ({typeCounts.agent || 0})</div>
          </button>

          {/* Graph对话 - 浣熊 */}
          <button
            className={`collapsed-nav-item ${typeFilter === 'graph' ? 'active' : ''}`}
            onClick={() => setTypeFilter('graph')}
            title="Graph对话"
          >
            <span className="animal-icon">🦝</span>
            {typeCounts.graph > 0 && (
              <span className="collapsed-badge">{typeCounts.graph}</span>
            )}
            <div className="collapsed-tooltip">Graph对话 ({typeCounts.graph || 0})</div>
          </button>

          {/* 新建对话 */}
          {onNewConversation && (
            <button
              className="collapsed-nav-item"
              onClick={onNewConversation}
              title="新建对话"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <div className="collapsed-tooltip">新建对话</div>
            </button>
          )}

          {/* 任务中心 */}
          <button
            className="collapsed-nav-item"
            onClick={() => navigate('/tasks')}
            title="任务中心"
          >
            <ClockCircleOutlined />
            <div className="collapsed-tooltip">任务中心</div>
          </button>
        </div>

        {/* 底部区域 */}
        <div className="collapsed-footer">
          {/* 状态指示器 */}
          <div className="collapsed-status-indicator" title="系统在线"></div>

          {/* 用户信息 */}
          <button
            className="collapsed-nav-item"
            onClick={handleUserNameEdit}
            title={`用户: ${currentUserDisplayName}`}
          >
            <UserOutlined />
            <div className="collapsed-tooltip">用户: {currentUserDisplayName}</div>
          </button>

          {/* 回到主页 */}
          <button
            className="collapsed-nav-item"
            onClick={() => navigate('/')}
            title="返回主页"
          >
            <HomeOutlined />
            <div className="collapsed-tooltip">返回主页</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-sidebar">
      {/* 侧边栏头部 */}
      <div className="sidebar-header">
        <div className="search-and-actions">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ flex: 1 }}
          />
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
            <Dropdown
              open={filterDropdownVisible}
              onOpenChange={setFilterDropdownVisible}
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'status',
                    label: '按状态筛选',
                    type: 'group',
                    children: [
                      {
                        key: 'active',
                        label: `普通 (${statusCounts.active || 0})`,
                        onClick: () => setStatusFilter('active')
                      },
                      {
                        key: 'favorite',
                        label: `收藏 (${statusCounts.favorite || 0})`,
                        onClick: () => setStatusFilter('favorite')
                      },
                      {
                        key: 'deleted',
                        label: `移除 (${statusCounts.deleted || 0})`,
                        onClick: () => setStatusFilter('deleted')
                      }
                    ]
                  },
                  {
                    type: 'divider'
                  },
                  {
                    key: 'type',
                    label: '按类型筛选',
                    type: 'group',
                    children: [
                      {
                        key: 'chat',
                        label: `Chat (${typeCounts.chat || 0})`,
                        onClick: () => setTypeFilter('chat')
                      },
                      {
                        key: 'agent',
                        label: `Agent (${typeCounts.agent || 0})`,
                        onClick: () => setTypeFilter('agent')
                      },
                      {
                        key: 'graph',
                        label: `Graph (${typeCounts.graph || 0})`,
                        onClick: () => setTypeFilter('graph')
                      }
                    ]
                  }
                ]
              }}
            >
              <Tooltip title="筛选对话">
                <Button
                  type="text"
                  className="filter-btn"
                  icon={
                    <div style={{ position: 'relative' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 6h16M7 12h10m-7 6h4"/>
                      </svg>
                      {(statusFilter !== 'active' || typeFilter !== 'chat') && (
                        <span className="filter-active-dot"></span>
                      )}
                    </div>
                  }
                />
              </Tooltip>
            </Dropdown>
            <Button
              type="text"
              onClick={toggleSidebar}
              className="sidebar-toggle"
            >
              <img src="/starstar.png" alt="折叠" style={{ width: 16, height: 16 }} />
            </Button>
          </div>
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {isBatchMode && (
        <div className="batch-toolbar">
          <div className="batch-info">
            <span>已选择 {selectedConversations.size} 个对话</span>
          </div>
          <div className="batch-actions">
            <Button
              type="text"
              size="small"
              onClick={handleSelectAll}
              disabled={selectedConversations.size === filteredConversations.length}
            >
              全选
            </Button>
            <Button
              type="text"
              size="small"
              onClick={handleDeselectAll}
              disabled={selectedConversations.size === 0}
            >
              取消全选
            </Button>
            <Button
              type="primary"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              disabled={selectedConversations.size === 0}
            >
              {statusFilter === 'deleted' ? '永久删除' : '删除'}
            </Button>
          </div>
        </div>
      )}

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
              isBatchMode={isBatchMode}
              isSelected={selectedConversations.has(conversation._id)}
              onSelect={handleConversationSelect}
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
          <Tooltip title={isBatchMode ? "退出批量选择" : "批量选择"}>
            <div 
              className={`modern-batch-btn ${isBatchMode ? 'active' : ''}`}
              onClick={handleBatchModeToggle}
            >
              {isBatchMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c0 1.66-.41 3.22-1.14 4.58-.73 1.36-1.85 2.48-3.21 3.21C15.22 20.59 13.66 21 12 21s-3.22-.41-4.58-1.14c-1.36-.73-2.48-1.85-3.21-3.21C3.41 15.22 3 13.66 3 12s.41-3.22 1.14-4.58c.73-1.36 1.85-2.48 3.21-3.21C8.78 3.41 10.34 3 12 3s3.22.41 4.58 1.14c1.36.73 2.48 1.85 3.21 3.21C20.59 8.78 21 10.34 21 12z"/>
                </svg>
              )}
              {selectedConversations.size > 0 && (
                <span className="selection-count">{selectedConversations.size}</span>
              )}
            </div>
          </Tooltip>
          <Tooltip title="任务中心">
            <Button
              type="text"
              icon={<ClockCircleOutlined />}
              onClick={() => navigate('/tasks')}
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