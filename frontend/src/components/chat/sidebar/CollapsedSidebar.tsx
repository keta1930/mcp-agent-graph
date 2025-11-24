// src/components/chat/sidebar/CollapsedSidebar.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import { Home, Clock, ChevronRight, Plus } from 'lucide-react';
import { useT } from '../../../i18n/hooks';
import UserMenu from '../../common/UserMenu';

interface CollapsedSidebarProps {
  onExpand: () => void;
  onNewConversation?: () => void;
}

const CollapsedSidebar: React.FC<CollapsedSidebarProps> = ({
  onExpand,
  onNewConversation,
}) => {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div
      style={{
        width: '72px',
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #faf8f5 0%, #f5f3f0 100%)',
        borderRight: '1px solid rgba(139, 115, 85, 0.12)',
        boxShadow: '2px 0 8px rgba(139, 115, 85, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
          background: 'rgba(255, 255, 255, 0.5)',
          position: 'relative',
        }}
      >
        {/* Header decorative line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.25) 50%, transparent)',
          }}
        />
        <button
          type="button"
          onClick={onExpand}
          title={t('components.collapsedSidebar.expandSidebar')}
          aria-label={t('components.collapsedSidebar.expandSidebar')}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(45, 45, 45, 0.65)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* 主导航 */}
      <div
        style={{
          flex: 1,
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {onNewConversation && (
          <Tooltip
            title={t('components.collapsedSidebar.newConversation')}
            placement="right"
          >
            <Button
              type="text"
              icon={<Plus size={20} strokeWidth={1.5} />}
              onClick={onNewConversation}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '8px',
                color: 'rgba(45, 45, 45, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 115, 85, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            />
          </Tooltip>
        )}

        <Tooltip
          title={t('components.collapsedSidebar.taskCenter')}
          placement="right"
        >
          <Button
            type="text"
            icon={<Clock size={20} strokeWidth={1.5} />}
            onClick={() => navigate('/tasks')}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '8px',
              color: 'rgba(45, 45, 45, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 115, 85, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
        </Tooltip>
      </div>

      {/* 底部 */}
      <div
        style={{
          padding: '20px 12px',
          borderTop: '1px solid rgba(139, 115, 85, 0.08)',
          background: 'rgba(255, 255, 255, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Footer decorative line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.25) 50%, transparent)',
          }}
        />

        {/* 用户头像下拉菜单 */}
        <UserMenu collapsed={true} placement="topLeft" />

        {/* 前往工作台按钮 */}
        <Tooltip
          title={t('components.collapsedSidebar.goToWorkspace')}
          placement="right"
        >
          <Button
            type="text"
            icon={<Home size={16} strokeWidth={1.5} />}
            onClick={() => navigate('/workspace')}
            style={{
              color: 'rgba(45, 45, 45, 0.65)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default CollapsedSidebar;
