// src/components/chat/controls/ProjectSelector.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { FolderKanban, CheckCircle } from 'lucide-react';
import { projectService } from '../../../services/projectService';
import { ProjectListItem } from '../../../types/project';
import { useT } from '../../../i18n/hooks';

const { Text } = Typography;

/**
 * 项目选择器组件属性
 */
interface ProjectSelectorProps {
  /** 当前选中的项目 ID */
  selectedProjectId: string | null;
  /** 项目选择变更回调 */
  onProjectChange: (projectId: string | null, projectName: string | null) => void;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
}

/**
 * 项目选择器组件
 *
 * 用于在对话输入区域选择项目。
 * 提供一个下拉面板，显示所有可用的项目，
 * 用户点击后可以选择或取消选择项目。
 */
const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProjectId,
  onProjectChange,
  size = 'small'
}) => {
  const t = useT();
  const [showPanel, setShowPanel] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find(p => p.project_id === selectedProjectId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await projectService.listProjects();
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (!showPanel && projects.length === 0) {
      loadProjects();
    }
    setShowPanel(!showPanel);
  };

  const handleSelectProject = (projectId: string | null) => {
    if (projectId === null) {
      onProjectChange(null, null);
    } else {
      const project = projects.find(p => p.project_id === projectId);
      onProjectChange(projectId, project?.name || null);
    }
    setShowPanel(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <Tooltip title={selectedProject ? selectedProject.name : t('components.projectSelector.selectProject')}>
        <Button
          type="text"
          icon={<FolderKanban size={14} strokeWidth={1.5} />}
          onClick={handleButtonClick}
          size={size}
          loading={loading}
          style={{
            color: selectedProjectId ? '#b85845' : 'rgba(139, 115, 85, 0.75)',
            border: 'none',
            background: showPanel || selectedProjectId ? 'rgba(184, 88, 69, 0.08)' : 'transparent',
            transition: 'all 0.2s ease',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: selectedProjectId ? '0 1px 3px rgba(184, 88, 69, 0.15)' : 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = selectedProjectId ? '#b85845' : 'rgba(139, 115, 85, 0.75)';
            e.currentTarget.style.background = showPanel || selectedProjectId ? 'rgba(184, 88, 69, 0.08)' : 'transparent';
          }}
        />
      </Tooltip>

      {showPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '8px',
          minWidth: '280px',
          maxWidth: '360px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* 顶部装饰线 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(184, 88, 69, 0.3) 50%, transparent)'
          }} />

          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text strong style={{
              color: '#2d2d2d',
              fontSize: '14px',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              {t('components.projectSelector.selectProject')}
            </Text>
            {selectedProjectId && (
              <Button
                type="text"
                size="small"
                onClick={() => handleSelectProject(null)}
                style={{
                  fontSize: '12px',
                  color: '#b85845',
                  padding: '2px 8px',
                  height: 'auto',
                  fontWeight: 500
                }}
              >
                {t('components.projectSelector.clearSelection')}
              </Button>
            )}
          </div>
          <div style={{
            padding: '10px',
            maxHeight: '380px',
            overflowY: 'auto'
          }}>
            {projects.length === 0 ? (
              <div style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: 'rgba(45, 45, 45, 0.45)',
                fontSize: '13px',
                letterSpacing: '0.3px'
              }}>
                <FolderKanban size={32} strokeWidth={1.5} style={{
                  marginBottom: '12px',
                  color: 'rgba(139, 115, 85, 0.3)'
                }} />
                <div>{t('components.projectSelector.noProjects')}</div>
              </div>
            ) : (
              projects.map(project => (
                <div
                  key={project.project_id}
                  onClick={() => handleSelectProject(project.project_id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                    border: selectedProjectId === project.project_id
                      ? '1px solid rgba(184, 88, 69, 0.4)'
                      : '1px solid rgba(139, 115, 85, 0.15)',
                    background: selectedProjectId === project.project_id
                      ? 'rgba(184, 88, 69, 0.05)'
                      : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: selectedProjectId === project.project_id
                      ? '0 2px 6px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                      : '0 1px 2px rgba(139, 115, 85, 0.04)',
                    marginBottom: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProjectId !== project.project_id) {
                      e.currentTarget.style.background = 'rgba(245, 243, 240, 0.8)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                      e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProjectId !== project.project_id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <FolderKanban
                        size={14}
                        strokeWidth={1.5}
                        style={{
                          color: selectedProjectId === project.project_id ? '#b85845' : '#8b7355',
                          flexShrink: 0
                        }}
                      />
                      <Text strong style={{
                        fontSize: '13px',
                        color: selectedProjectId === project.project_id ? '#b85845' : '#2d2d2d',
                        letterSpacing: '0.3px',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {project.name}
                      </Text>
                      {selectedProjectId === project.project_id && (
                        <CheckCircle
                          size={14}
                          strokeWidth={2}
                          style={{
                            color: '#b85845',
                            flexShrink: 0
                          }}
                        />
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(139, 115, 85, 0.6)',
                      flexShrink: 0
                    }}>
                      {project.conversation_count} {t('components.projectSelector.conversations')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
