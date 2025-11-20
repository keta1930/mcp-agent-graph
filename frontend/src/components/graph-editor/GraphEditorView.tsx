// 图编辑器视图组件
import React from 'react';
import { Card, Button, Tooltip, Space, Typography, Drawer } from 'antd';
import { ReactFlowProvider } from 'reactflow';
import {
  Workflow,
  ArrowLeft,
  FileText,
  LayoutGrid,
  Plus,
  Settings,
  GitBranch,
  Save
} from 'lucide-react';
import GraphCanvas from './GraphCanvas';
import NodePropertiesPanel from './NodePropertiesPanel';
import { useT } from '../../i18n/hooks';
import { buttonStyles } from '../../utils/graphEditorConstants';

const { Text } = Typography;

interface GraphEditorViewProps {
  graphName: string;
  graphDescription?: string;
  hasUnsavedChanges: boolean;
  selectedNode: string | null;
  onBack: () => void;
  onSave: () => void;
  onViewReadme: () => void;
  onAutoLayout: () => void;
  onAddNode: () => void;
  onGraphSettings: () => void;
  onVersionManager: () => void;
  onCloseNodePanel: () => void;
}

/**
 * 图编辑器视图
 */
const GraphEditorView: React.FC<GraphEditorViewProps> = ({
  graphName,
  graphDescription,
  hasUnsavedChanges,
  selectedNode,
  onBack,
  onSave,
  onViewReadme,
  onAutoLayout,
  onAddNode,
  onGraphSettings,
  onVersionManager,
  onCloseNodePanel
}) => {
  const t = useT();

  return (
    <div style={{ background: '#faf8f5', minHeight: '100vh' }}>
      {/* 顶部工具栏 */}
      <div style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '16px 48px',
        borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 左侧：返回按钮 + 标题 */}
          <Space size="middle">
            <Tooltip title={t('pages.graphEditor.backToList')}>
              <Button
                icon={<ArrowLeft size={16} strokeWidth={1.5} />}
                onClick={onBack}
                style={{
                  ...buttonStyles.secondary,
                  padding: '4px 12px'
                }}
              >
                {t('pages.graphEditor.backToList')}
              </Button>
            </Tooltip>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Workflow size={24} color="#b85845" strokeWidth={1.5} />
              <div>
                <Text style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#2d2d2d',
                  display: 'block',
                  letterSpacing: '0.5px'
                }}>
                  {graphName}
                </Text>
                {graphDescription && (
                  <Text style={{
                    fontSize: '12px',
                    color: 'rgba(45, 45, 45, 0.65)'
                  }}>
                    {graphDescription}
                  </Text>
                )}
              </div>
            </div>
          </Space>

          {/* 右侧：工具按钮 */}
          <Space size="small">
            <Tooltip title={t('pages.graphEditor.readme')}>
              <Button
                type="text"
                icon={<FileText size={16} strokeWidth={1.5} />}
                onClick={onViewReadme}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.autoLayout')}>
              <Button
                type="text"
                icon={<LayoutGrid size={16} strokeWidth={1.5} />}
                onClick={onAutoLayout}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.addNode')}>
              <Button
                type="text"
                icon={<Plus size={16} strokeWidth={1.5} />}
                onClick={onAddNode}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.graphSettings')}>
              <Button
                type="text"
                icon={<Settings size={16} strokeWidth={1.5} />}
                onClick={onGraphSettings}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={t('pages.graphEditor.versionManager')}>
              <Button
                type="text"
                icon={<GitBranch size={16} strokeWidth={1.5} />}
                onClick={onVersionManager}
                style={{ color: '#8b7355' }}
              />
            </Tooltip>
            <Tooltip title={hasUnsavedChanges ? t('pages.graphEditor.saveChanges') : t('pages.graphEditor.saved')}>
              <Button
                type={hasUnsavedChanges ? 'primary' : 'text'}
                icon={<Save size={16} strokeWidth={1.5} />}
                onClick={onSave}
                disabled={!hasUnsavedChanges}
                style={hasUnsavedChanges ? {
                  ...buttonStyles.primary,
                  padding: '4px 16px',
                  height: 'auto'
                } : {
                  color: '#8b7355'
                }}
              >
                {t('common.save')}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* 画布区域 */}
      <div style={{ padding: '24px 48px' }}>
        <Card
          bodyStyle={{ padding: 0, height: '100%' }}
          className="overflow-hidden"
          style={{
            height: 'calc(100vh - 180px)',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          <ReactFlowProvider>
            <GraphCanvas />
          </ReactFlowProvider>
        </Card>
      </div>

      {/* Node properties drawer */}
      <Drawer
        title={t('pages.graphEditor.nodeProperties')}
        open={!!selectedNode}
        onClose={onCloseNodePanel}
        width={800}
        styles={{
          header: {
            background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.9))',
            borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '18px 28px'
          },
          body: {
            padding: '0',
            background: '#fff'
          }
        }}
        destroyOnClose={true}
      >
        <NodePropertiesPanel />
      </Drawer>
    </div>
  );
};

export default GraphEditorView;
