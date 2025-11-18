// src/components/chat/sidebar/CollapsedSidebar.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, Clock, ChevronRight } from 'lucide-react';
import { useT } from '../../../i18n/hooks';

interface CollapsedSidebarProps {
  onExpand: () => void;
  onNewConversation?: () => void;
  currentUserDisplayName: string;
}

const CollapsedSidebar: React.FC<CollapsedSidebarProps> = ({
  onExpand,
  onNewConversation,
  currentUserDisplayName,
}) => {
  const navigate = useNavigate();
  const t = useT();

  const NavButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    onClick: () => void;
  }> = ({ icon, title, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: isHovered
              ? 'rgba(139, 115, 85, 0.06)'
              : 'transparent',
            border: 'none',
            color: isHovered ? '#8b7355' : 'rgba(45, 45, 45, 0.65)',
          }}
        >
          {icon}
        </button>
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              left: '52px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#ffffff',
              color: '#2d2d2d',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              border: '1px solid rgba(139, 115, 85, 0.12)',
              boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            {title}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: '56px',
        display: 'flex',
        flexDirection: 'column',
        background: '#faf8f5',
        borderRight: '1px solid rgba(139, 115, 85, 0.12)',
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
        }}
      >
        <button
          type="button"
          onClick={onExpand}
          title={t('components.collapsedSidebar.expandSidebar')}
          aria-label={t('components.collapsedSidebar.expandSidebar')}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            background: '#ffffff',
            border: '1px solid rgba(139, 115, 85, 0.12)',
            color: '#8b7355',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 115, 85, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.12)';
          }}
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* 主导航 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 0',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        {onNewConversation && (
          <NavButton
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            title={t('components.collapsedSidebar.newConversation')}
            onClick={onNewConversation}
          />
        )}

        <NavButton
          icon={<Clock size={18} strokeWidth={1.5} />}
          title={t('components.collapsedSidebar.taskCenter')}
          onClick={() => navigate('/tasks')}
        />
      </div>

      {/* 底部 */}
      <div
        style={{
          padding: '12px 0 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          borderTop: '1px solid rgba(139, 115, 85, 0.08)',
        }}
      >
        <NavButton
          icon={<User size={18} strokeWidth={1.5} />}
          title={t('components.collapsedSidebar.user', { name: currentUserDisplayName })}
          onClick={() => {}}
        />

        <NavButton
          icon={<Home size={18} strokeWidth={1.5} />}
          title={t('components.collapsedSidebar.backToHome')}
          onClick={() => navigate('/')}
        />
      </div>
    </div>
  );
};

export default CollapsedSidebar;
