// src/components/common/CodeBlockPreview.tsx
import React, { useState, useEffect } from 'react';
import { Button, Tooltip, message } from 'antd';
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

  const handlePreview = () => {
    // 创建新窗口显示HTML或Mermaid内容
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      message.error('无法打开新窗口，请检查浏览器设置');
      return;
    }

    if (language === 'html') {
      // 渲染HTML内容
      newWindow.document.write(content);
      newWindow.document.close();
    } else if (language === 'svg') {
      // 渲染SVG内容
      const svgHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>SVG图像预览</title>
            <style>
              body { 
                margin: 20px; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #fff;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 90vh;
              }
              .svg-container {
                max-width: 100%;
                max-height: 100%;
                text-align: center;
                border: 1px solid #e1e4e8;
                border-radius: 6px;
                padding: 20px;
                background: #fafafa;
              }
              svg {
                max-width: 100%;
                max-height: 80vh;
                height: auto;
              }
              .error {
                color: #ff4d4f;
                padding: 20px;
                border: 1px solid #ff4d4f;
                border-radius: 4px;
                background: #fff2f0;
              }
            </style>
          </head>
          <body>
            <div class="svg-container">
              ${content}
            </div>
          </body>
        </html>
      `;
      newWindow.document.write(svgHtml);
      newWindow.document.close();
    } else if (language === 'mermaid') {
      // 渲染Mermaid图表
      const mermaidHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mermaid图表预览</title>
            <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
            <style>
              body { 
                margin: 20px; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #fff;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 90vh;
              }
              .mermaid {
                max-width: 100%;
                text-align: center;
              }
              .error {
                color: #ff4d4f;
                padding: 20px;
                border: 1px solid #ff4d4f;
                border-radius: 4px;
                background: #fff2f0;
              }
            </style>
          </head>
          <body>
            <div class="mermaid">
              ${content}
            </div>
            <script>
              try {
                mermaid.initialize({ 
                  startOnLoad: true,
                  theme: 'default',
                  securityLevel: 'loose',
                  fontFamily: 'Segoe UI, Arial, sans-serif'
                });
              } catch (error) {
                document.body.innerHTML = '<div class="error">图表渲染失败: ' + error.message + '</div>';
              }
            </script>
          </body>
        </html>
      `;
      newWindow.document.write(mermaidHtml);
      newWindow.document.close();
    }
  };

  // 检查是否支持预览
  const supportsPreview = isReady && (language === 'html' || language === 'mermaid' || language === 'svg');

  if (!supportsPreview) {
    return null;
  }

  return (
    <Tooltip title="在新窗口中预览">
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