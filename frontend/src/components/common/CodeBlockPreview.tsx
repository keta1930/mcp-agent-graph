// src/components/common/CodeBlockPreview.tsx
import React, { useState, useEffect } from 'react';
import { Button, Tooltip, message } from 'antd';
import { previewService } from '../../services/previewService';
import { EyeOutlined } from '@ant-design/icons';

interface CodeBlockPreviewProps {
  language: string;
  content: string;
  className?: string;
  isStreaming?: boolean; // 新增：是否正在流式传输
  conversationId?: string; // 新增：对话ID，用于持久化状态
}

const CodeBlockPreview: React.FC<CodeBlockPreviewProps> = ({ language, content, className, isStreaming = false, conversationId }) => {
  const [isReady, setIsReady] = useState(false);
  const [hasBeenReady, setHasBeenReady] = useState(false);

  // 使用更稳定的存储键，基于内容长度而不是内容本身，避免频繁变化
  const storageKey = `preview_ready_${conversationId}_${language}_${content.length}`;

  useEffect(() => {
    // 检查localStorage中是否已经标记为ready
    const wasReady = localStorage.getItem(storageKey) === 'true';
    
    if (wasReady) {
      // 如果之前已经ready，设置状态
      setIsReady(true);
      setHasBeenReady(true);
    } else if (!isStreaming && content.trim()) {
      // 只有在不是流式输出且有内容时才设置为ready
      // 对于支持预览的语言，确保内容有意义（不只是空字符串）
      const hasValidContent = 
        (language === 'html' && content.includes('<')) ||
        (language === 'mermaid' )||
        (language === 'svg' && content.includes('<svg'));
      
      if (hasValidContent) {
        const timer = setTimeout(() => {
          setIsReady(true);
          setHasBeenReady(true);
          localStorage.setItem(storageKey, 'true');
        }, 300); // 稍微延长等待时间，确保内容稳定

        return () => clearTimeout(timer);
      }
    } else if (isStreaming) {
      // 流式传输时，如果之前没有ready过，则不显示
      if (!hasBeenReady) {
        setIsReady(false);
      }
      // 如果之前已经ready过，保持显示状态
    }
  }, [isStreaming, storageKey, content, language, hasBeenReady]);

  const handlePreview = async () => {
    // 调用后端生成短链ID，打开短链预览页面
    try {
      const resp = await previewService.createShare({
        lang: language || 'text',
        content,
        title: `${(language || 'text').toUpperCase()} 预览`
      });

      const origin = window.location.origin;
      const shareUrl = `${origin}/preview?id=${encodeURIComponent(resp.id)}`;
      const win = window.open(shareUrl, '_blank');
      if (!win) {
        message.error('无法打开预览窗口，请检查浏览器设置');
      } else {
        message.success('短链已生成，可分享该链接');
      }
    } catch (e: any) {
      message.error('生成短链失败：' + (e?.message || String(e)));
    }
  };

  // 检查是否支持预览
  const supportsPreview = isReady && (language === 'html' || language === 'mermaid' || language === 'svg');

  if (!supportsPreview) {
    return null;
  }

  return (
    <Tooltip title="在新窗口中预览（可分享链接）">
      <Button
        type="text"
        size="small"
        icon={<EyeOutlined />}
        onClick={handlePreview}
        className="preview-button"
      />
    </Tooltip>
  );
};

export default CodeBlockPreview;