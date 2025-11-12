import React, { useState, useEffect } from 'react';
import { List, Card, Typography, Space, Button, Tag, message, Spin, Modal, Divider } from 'antd';
import {
  History,
  Eye,
  CheckCircle,
  Clock,
  Diff as DiffIcon,
} from 'lucide-react';
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
        background: 'linear-gradient(135deg, rgba(250, 248, 245, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%)',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: 'inset 0 1px 3px rgba(139, 115, 85, 0.08)',
        overflow: 'auto',
        maxHeight: '60vh',
        fontSize: '13px',
        lineHeight: '1.6',
        fontFamily: 'Monaco, Courier New, monospace',
        color: '#2d2d2d'
      }}>
        {diff.map((part, index) => {
          const color = part.added ? 'rgba(183, 235, 143, 0.3)' : part.removed ? 'rgba(255, 163, 158, 0.3)' : 'transparent';
          const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
          const textColor = part.added ? '#52c41a' : part.removed ? '#ff4d4f' : '#2d2d2d';
          return (
            <div
              key={index}
              style={{
                background: color,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: textColor,
                paddingLeft: '4px',
                marginBottom: '1px'
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
    <div style={{ padding: '0' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
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
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
                    padding: '20px 24px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 115, 85, 0.15)',
                    boxShadow: '0 1px 4px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 115, 85, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.7)';
                  }}
                >
                  <div style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <Space size="middle" style={{ flex: 1 }}>
                      <Clock size={14} style={{ color: '#b85845', flexShrink: 0 }} />
                      <Text style={{
                        fontWeight: 500,
                        color: '#2d2d2d',
                        fontSize: '13px',
                        letterSpacing: '0.3px'
                      }}>{formatTimestamp(version.timestamp)}</Text>
                      <Text type="secondary" style={{
                        fontSize: '12px',
                        color: 'rgba(45, 45, 45, 0.45)',
                        letterSpacing: '0.2px'
                      }}>
                        {getRelativeTime(version.timestamp)}
                      </Text>
                      {isLatest && (
                        <Tag icon={<CheckCircle size={12} />} style={{
                          background: 'rgba(82, 196, 26, 0.08)',
                          color: '#52c41a',
                          border: '1px solid rgba(82, 196, 26, 0.25)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          padding: '0 8px',
                          height: '20px',
                          lineHeight: '18px'
                        }}>
                          当前
                        </Tag>
                      )}
                    </Space>
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<Eye size={14} />}
                        onClick={() => handleViewVersion(version)}
                        style={{
                          borderRadius: '4px',
                          border: '1px solid rgba(139, 115, 85, 0.25)',
                          color: '#8b7355',
                          fontSize: '12px',
                          height: '28px',
                          padding: '0 12px'
                        }}
                      >
                        查看
                      </Button>
                      {!isLatest && (
                        <Button
                          size="small"
                          icon={<DiffIcon size={14} />}
                          onClick={() => handleCompareVersion(version)}
                          style={{
                            borderRadius: '4px',
                            border: '1px solid rgba(139, 115, 85, 0.25)',
                            color: '#8b7355',
                            fontSize: '12px',
                            height: '28px',
                            padding: '0 12px'
                          }}
                        >
                          对比
                        </Button>
                      )}
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
          <Space size="middle">
            <Eye size={18} style={{ color: '#b85845' }} />
            <span style={{ fontWeight: 500, letterSpacing: '1px' }}>查看历史版本</span>
            {selectedVersion?.is_current && (
              <Tag style={{
                background: 'rgba(82, 196, 26, 0.08)',
                color: '#52c41a',
                border: '1px solid rgba(82, 196, 26, 0.25)',
                borderRadius: '6px',
                fontWeight: 500
              }}>当前版本</Tag>
            )}
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedVersion(null);
        }}
        width="80%"
        styles={{
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
            padding: '24px 32px'
          },
          body: {
            padding: '32px',
            background: 'rgba(250, 248, 245, 0.3)'
          },
          footer: {
            borderTop: '1px solid rgba(139, 115, 85, 0.15)',
            padding: '20px 32px',
            background: 'rgba(250, 248, 245, 0.5)'
          }
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setViewModalVisible(false);
              setSelectedVersion(null);
            }}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              color: '#8b7355',
              fontWeight: 500,
              letterSpacing: '0.5px'
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
                background: 'linear-gradient(135deg, rgba(250, 248, 245, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%)',
                padding: '24px',
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                boxShadow: 'inset 0 1px 3px rgba(139, 115, 85, 0.08)',
                maxHeight: '60vh',
                overflow: 'auto',
              }}
            >
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'Monaco, Courier New, monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#2d2d2d'
              }}>
                {selectedVersion.content}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* Diff Modal */}
      <Modal
        title={
          <Space size="middle">
            <DiffIcon size={18} style={{ color: '#b85845' }} />
            <span style={{ fontWeight: 500, letterSpacing: '1px' }}>版本对比</span>
          </Space>
        }
        open={diffModalVisible}
        onCancel={() => {
          setDiffModalVisible(false);
          setSelectedVersion(null);
        }}
        width="90%"
        styles={{
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
            padding: '24px 32px'
          },
          body: {
            padding: '32px',
            background: 'rgba(250, 248, 245, 0.3)'
          },
          footer: {
            borderTop: '1px solid rgba(139, 115, 85, 0.15)',
            padding: '20px 32px',
            background: 'rgba(250, 248, 245, 0.5)'
          }
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDiffModalVisible(false);
              setSelectedVersion(null);
            }}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              color: '#8b7355',
              fontWeight: 500,
              letterSpacing: '0.5px'
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
                <Tag style={{
                  background: 'rgba(255, 77, 79, 0.08)',
                  color: '#ff4d4f',
                  border: '1px solid rgba(255, 77, 79, 0.25)',
                  borderRadius: '6px',
                  fontWeight: 500
                }}>- 删除的行</Tag>
                <Tag style={{
                  background: 'rgba(82, 196, 26, 0.08)',
                  color: '#52c41a',
                  border: '1px solid rgba(82, 196, 26, 0.25)',
                  borderRadius: '6px',
                  fontWeight: 500
                }}>+ 新增的行</Tag>
                <Tag style={{
                  background: 'rgba(139, 115, 85, 0.05)',
                  color: 'rgba(45, 45, 45, 0.6)',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  borderRadius: '6px',
                  fontWeight: 500
                }}>  未变化的行</Tag>
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
