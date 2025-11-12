import React, { useState, useEffect } from 'react';
import { List, Card, Typography, Space, Button, Tag, message, Spin, Modal, Divider } from 'antd';
import {
  HistoryOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DiffOutlined,
} from '@ant-design/icons';
import conversationFileService from '../../services/conversationFileService';
import { FileVersion, FileVersionDetail } from '../../types/conversationFile';
import { formatFileSize } from '../../utils/fileUtils';
import * as Diff from 'diff';

const { Text, Paragraph } = Typography;

interface FileVersionHistoryProps {
  filename: string;
  conversationId: string;
  versions: FileVersion[];
  currentContent: string;
}

const FileVersionHistory: React.FC<FileVersionHistoryProps> = ({
  filename,
  conversationId,
  versions,
  currentContent,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<FileVersionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [diffModalVisible, setDiffModalVisible] = useState(false);

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  const getRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return formatTimestamp(timestamp);
    } catch {
      return timestamp;
    }
  };

  const handleViewVersion = async (version: FileVersion) => {
    setLoading(true);
    try {
      const response = await conversationFileService.getFileVersion(
        conversationId,
        filename,
        version.version_id
      );
      setSelectedVersion(response.file);
      setViewModalVisible(true);
    } catch (error: any) {
      message.error('加载版本失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareVersion = async (version: FileVersion) => {
    setLoading(true);
    try {
      const response = await conversationFileService.getFileVersion(
        conversationId,
        filename,
        version.version_id
      );
      setSelectedVersion(response.file);
      setDiffModalVisible(true);
    } catch (error: any) {
      message.error('加载版本失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDiff = () => {
    if (!selectedVersion) return null;

    const diff = Diff.diffLines(selectedVersion.content, currentContent);

    return (
      <pre style={{
        background: '#f5f5f5',
        padding: '16px',
        borderRadius: '4px',
        overflow: 'auto',
        maxHeight: '60vh',
        fontSize: '12px',
        lineHeight: '1.5',
      }}>
        {diff.map((part, index) => {
          const color = part.added ? '#b7eb8f' : part.removed ? '#ffa39e' : 'transparent';
          const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
          return (
            <div
              key={index}
              style={{
                background: color,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {part.value.split('\n').map((line, i) => (
                <div key={i}>{line ? `${prefix}${line}` : ''}</div>
              ))}
            </div>
          );
        })}
      </pre>
    );
  };

  // Sort versions by timestamp (newest first)
  const sortedVersions = [...versions].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Space>
            <HistoryOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
            <Text strong style={{ fontSize: '16px' }}>版本历史</Text>
            <Tag color="blue">{versions.length} 个版本</Tag>
          </Space>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin tip="加载中..." />
          </div>
        )}

        {!loading && sortedVersions.length === 0 && (
          <Card>
            <Text type="secondary">暂无历史版本</Text>
          </Card>
        )}

        {!loading && sortedVersions.length > 0 && (
          <List
            dataSource={sortedVersions}
            renderItem={(version, index) => {
              const isLatest = index === 0;
              return (
                <List.Item
                  key={version.version_id}
                  style={{
                    background: '#fff',
                    padding: '16px',
                    marginBottom: '8px',
                    borderRadius: '4px',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <ClockCircleOutlined style={{ color: '#1890ff' }} />
                          <Text strong>{formatTimestamp(version.timestamp)}</Text>
                          {isLatest && (
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                              当前版本
                            </Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            ({getRelativeTime(version.timestamp)})
                          </Text>
                        </Space>
                        <Space>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewVersion(version)}
                          >
                            查看
                          </Button>
                          {!isLatest && (
                            <Button
                              size="small"
                              icon={<DiffOutlined />}
                              onClick={() => handleCompareVersion(version)}
                            >
                              对比
                            </Button>
                          )}
                        </Space>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        版本ID: {version.version_id.substring(0, 8)}...
                      </Text>
                    </Space>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </Space>

      {/* View Version Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>查看历史版本</span>
            {selectedVersion?.is_current && <Tag color="green">当前版本</Tag>}
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedVersion(null);
        }}
        width="80%"
        footer={[
          <Button
            key="close"
            onClick={() => {
              setViewModalVisible(false);
              setSelectedVersion(null);
            }}
          >
            关闭
          </Button>,
        ]}
      >
        {selectedVersion && (
          <div>
            <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
              <div>
                <Text type="secondary">文件名: </Text>
                <Text strong>{selectedVersion.filename}</Text>
              </div>
              <div>
                <Text type="secondary">版本ID: </Text>
                <Text code>{selectedVersion.version_id}</Text>
              </div>
              <div>
                <Text type="secondary">描述: </Text>
                <Text>{selectedVersion.summary}</Text>
              </div>
              <div>
                <Text type="secondary">大小: </Text>
                <Text>{formatFileSize(new TextEncoder().encode(selectedVersion.content).length)}</Text>
              </div>
            </Space>
            <Divider />
            <div
              style={{
                background: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                maxHeight: '60vh',
                overflow: 'auto',
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedVersion.content}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* Diff Modal */}
      <Modal
        title={
          <Space>
            <DiffOutlined />
            <span>版本对比</span>
          </Space>
        }
        open={diffModalVisible}
        onCancel={() => {
          setDiffModalVisible(false);
          setSelectedVersion(null);
        }}
        width="90%"
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDiffModalVisible(false);
              setSelectedVersion(null);
            }}
          >
            关闭
          </Button>,
        ]}
      >
        {selectedVersion && (
          <div>
            <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
              <Text>
                对比 <Text type="secondary">{selectedVersion.version_id.substring(0, 8)}...</Text>{' '}
                与当前版本的差异
              </Text>
              <div style={{ fontSize: '12px' }}>
                <Tag color="red">- 删除的行</Tag>
                <Tag color="green">+ 新增的行</Tag>
                <Tag>  未变化的行</Tag>
              </div>
            </Space>
            <Divider />
            {renderDiff()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileVersionHistory;
