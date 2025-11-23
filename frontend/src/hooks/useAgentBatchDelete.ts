import { useState } from 'react';
import { App, message } from 'antd';
import { useT } from '../i18n/hooks';

interface AgentGroup {
  category: string;
  agents: Array<{
    name: string;
    tags?: string[];
  }>;
}

/**
 * 批量删除智能体的自定义 Hook
 */
export const useAgentBatchDelete = (
  filteredGroups: AgentGroup[],
  handleDeleteAgent: (agentName: string) => Promise<boolean | void>
) => {
  const t = useT();
  const { modal } = App.useApp();
  const [visible, setVisible] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  /**
   * 打开批量删除抽屉
   */
  const openDrawer = () => {
    setVisible(true);
  };

  /**
   * 关闭批量删除抽屉
   */
  const closeDrawer = () => {
    setVisible(false);
    setSelectedAgents([]);
  };

  /**
   * 切换选中状态
   */
  const toggleSelection = (agentName: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentName)
        ? prev.filter(name => name !== agentName)
        : [...prev, agentName]
    );
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    const allAgentNames = filteredGroups.flatMap(group => 
      group.agents.map(agent => agent.name)
    );
    if (selectedAgents.length === allAgentNames.length && allAgentNames.length > 0) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(allAgentNames);
    }
  };

  /**
   * 执行批量删除
   */
  const confirmDelete = async () => {
    if (selectedAgents.length === 0) {
      message.warning(t('pages.agentManager.batchDelete.selectWarning'));
      return;
    }

    modal.confirm({
      title: t('pages.agentManager.batchDelete.confirmTitle'),
      content: t('pages.agentManager.batchDelete.confirmMessage', { 
        count: selectedAgents.length 
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeleting(true);
        let successCount = 0;
        let failCount = 0;

        for (const agentName of selectedAgents) {
          try {
            await handleDeleteAgent(agentName);
            successCount++;
          } catch (error) {
            failCount++;
            console.error(`Failed to delete agent ${agentName}:`, error);
          }
        }

        setDeleting(false);
        setSelectedAgents([]);
        setVisible(false);

        if (failCount === 0) {
          message.success(t('pages.agentManager.batchDelete.success', { 
            count: successCount 
          }));
        } else {
          message.warning(t('pages.agentManager.batchDelete.partial', { 
            success: successCount, 
            failed: failCount 
          }));
        }
      }
    });
  };

  return {
    visible,
    selectedAgents,
    deleting,
    openDrawer,
    closeDrawer,
    toggleSelection,
    toggleSelectAll,
    confirmDelete
  };
};
