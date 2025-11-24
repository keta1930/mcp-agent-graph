// src/components/memory-manager/MemoryDetailDrawer.tsx
import React, { useState, useEffect } from 'react';
import { Drawer, Button, Spin, Empty, Modal, Input, Select, message } from 'antd';
import { Plus } from 'lucide-react';
import { MemoryDetail } from '../../types/memory';
import { getOwnerMemories, addMemoryItem, updateMemoryItem, batchDeleteItems, batchDeleteCategories } from '../../services/memoryService';
import CategoryPanel from './CategoryPanel';
import { useT } from '../../i18n/hooks';

const { TextArea } = Input;

interface MemoryDetailDrawerProps {
  visible: boolean;
  owner: { type: string; id: string } | null;
  onClose: () => void;
  onRefresh: () => void;
}

const MemoryDetailDrawer: React.FC<MemoryDetailDrawerProps> = ({
  visible,
  owner,
  onClose,
  onRefresh,
}) => {
  const t = useT();
  const [memoryData, setMemoryData] = useState<MemoryDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [addForm, setAddForm] = useState({
    category: '',
    newCategory: '',
    content: '',
  });

  useEffect(() => {
    if (visible && owner) {
      fetchMemoryDetail();
    }
  }, [visible, owner]);

  const fetchMemoryDetail = async () => {
    if (!owner) return;

    setLoading(true);
    try {
      const response = await getOwnerMemories(owner.type, owner.id);
      if (response.status === 'success') {
        setMemoryData(response.data);
      } else {
        message.error(t('pages.memoryManager.loadFailed', { error: '' }));
      }
    } catch (error) {
      console.error('Failed to load memory detail:', error);
      message.error(t('pages.memoryManager.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = () => {
    setAddForm({ category: '', newCategory: '', content: '' });
    setAddModalVisible(true);
  };

  const handleAddSubmit = async () => {
    if (!owner) return;

    const category = addForm.category === '__new__' ? addForm.newCategory : addForm.category;
    if (!category || !addForm.content) {
      message.warning(t('pages.memoryManager.fillRequired'));
      return;
    }

    try {
      const response = await addMemoryItem(owner.type, owner.id, category, {
        content: addForm.content,
      });

      if (response.status === 'success') {
        message.success(t('pages.memoryManager.addSuccess'));
        setAddModalVisible(false);
        fetchMemoryDetail();
        onRefresh();
      } else {
        message.error(t('pages.memoryManager.addFailed', { error: response.message || '' }));
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
      message.error(t('pages.memoryManager.addError'));
    }
  };

  const handleUpdateItem = async (category: string, itemId: string, content: string) => {
    if (!owner) return;

    try {
      const response = await updateMemoryItem(owner.type, owner.id, category, itemId, {
        content,
      });

      if (response.status === 'success') {
        message.success(t('pages.memoryManager.updateSuccess'));
        fetchMemoryDetail();
        onRefresh();
      } else {
        message.error(t('pages.memoryManager.updateFailed', { error: response.message || '' }));
      }
    } catch (error) {
      console.error('Failed to update memory:', error);
      message.error(t('pages.memoryManager.updateError'));
    }
  };

  const handleDeleteItems = async (category: string, itemIds: string[]) => {
    if (!owner) return;

    try {
      const response = await batchDeleteItems(owner.type, owner.id, category, itemIds);

      if (response.status === 'success') {
        message.success(t('pages.memoryManager.deleteSuccess'));
        fetchMemoryDetail();
        onRefresh();
      } else if (response.status === 'partial_success') {
        message.warning(t('pages.memoryManager.deletePartialSuccess', {
          success: response.data?.deleted_count || 0,
          failed: response.data?.failed_count || 0,
        }));
        fetchMemoryDetail();
        onRefresh();
      } else {
        message.error(t('pages.memoryManager.deleteFailed', { error: response.message || '' }));
      }
    } catch (error) {
      console.error('Failed to delete items:', error);
      message.error(t('pages.memoryManager.deleteError'));
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!owner) return;

    try {
      const response = await batchDeleteCategories(owner.type, owner.id, [category]);

      if (response.status === 'success') {
        message.success(t('pages.memoryManager.deleteCategorySuccess'));
        fetchMemoryDetail();
        onRefresh();
      } else {
        message.error(t('pages.memoryManager.deleteCategoryFailed', { error: response.message || '' }));
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      message.error(t('pages.memoryManager.deleteCategoryError'));
    }
  };

  const categories = memoryData?.memories ? Object.keys(memoryData.memories) : [];
  const categoryOptions = [
    { label: t('pages.memoryManager.newCategory'), value: '__new__' },
    ...categories.map((cat) => ({ label: cat, value: cat })),
  ];

  return (
    <>
      <Drawer
        title={
          <div style={{ fontSize: '16px', fontWeight: 500, color: '#2d2d2d' }}>
            {owner ? `${owner.type === 'user' ? t('pages.memoryManager.user') : t('pages.memoryManager.agent')}: ${owner.id}` : ''}
          </div>
        }
        placement="right"
        width={720}
        onClose={onClose}
        open={visible}
        styles={{
          body: { padding: '24px', background: '#faf8f5' },
        }}
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={1.5} />}
            onClick={handleAddMemory}
            style={{
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
            }}
          >
            {t('pages.memoryManager.addMemory')}
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : !memoryData || categories.length === 0 ? (
          <Empty
            description={t('pages.memoryManager.noMemories')}
            style={{ marginTop: '60px' }}
          />
        ) : (
          <div>
            {categories.map((category) => (
              <CategoryPanel
                key={category}
                category={category}
                items={memoryData.memories[category].items}
                ownerType={owner?.type || ''}
                ownerId={owner?.id || ''}
                onUpdate={(itemId, content) => handleUpdateItem(category, itemId, content)}
                onDelete={(itemIds) => handleDeleteItems(category, itemIds)}
                onDeleteCategory={() => handleDeleteCategory(category)}
              />
            ))}
          </div>
        )}
      </Drawer>

      <Modal
        title={t('pages.memoryManager.addMemory')}
        open={addModalVisible}
        onOk={handleAddSubmit}
        onCancel={() => setAddModalVisible(false)}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: 500,
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            color: '#8b7355',
            fontWeight: 500
          }
        }}
      >
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#2d2d2d' }}>
              {t('pages.memoryManager.selectCategory')}
            </label>
            <Select
              value={addForm.category}
              onChange={(value) => setAddForm({ ...addForm, category: value })}
              options={categoryOptions}
              placeholder={t('pages.memoryManager.selectCategory')}
              style={{ width: '100%' }}
            />
          </div>

          {addForm.category === '__new__' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#2d2d2d' }}>
                {t('pages.memoryManager.categoryName')}
              </label>
              <Input
                value={addForm.newCategory}
                onChange={(e) => setAddForm({ ...addForm, newCategory: e.target.value })}
                placeholder={t('pages.memoryManager.categoryName')}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#2d2d2d' }}>
              {t('pages.memoryManager.memoryContent')}
            </label>
            <TextArea
              value={addForm.content}
              onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
              placeholder={t('pages.memoryManager.memoryContent')}
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MemoryDetailDrawer;
