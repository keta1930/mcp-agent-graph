// 智能Markdown渲染器组件
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GlassCodeBlock from './GlassCodeBlock';

interface SmartMarkdownProps {
  content: string;
  isStreaming?: boolean;
  conversationId?: string;
}

/**
 * 智能Markdown渲染器
 * 支持流式输出时的代码块实时渲染
 */
const SmartMarkdown: React.FC<SmartMarkdownProps> = ({
  content,
  isStreaming = false,
  conversationId
}) => {
  // 解析内容中的代码块状态
  const parseCodeBlocks = (text: string) => {
    const codeBlocks: { type: string; content: string; isComplete: boolean; startIndex: number; endIndex: number }[] = [];
    const lines = text.split('\n');
    let currentBlock: { type: string; content: string; startIndex: number } | null = null;
    let currentLineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const currentPos = currentLineIndex;
      currentLineIndex += line.length + 1; // +1 for newline

      if (line.startsWith('```')) {
        if (currentBlock) {
          // 结束当前代码块
          codeBlocks.push({
            type: currentBlock.type,
            content: currentBlock.content,
            isComplete: true,
            startIndex: currentBlock.startIndex,
            endIndex: currentPos + line.length
          });
          currentBlock = null;
        } else {
          // 开始新代码块
          const type = line.slice(3).trim() || 'text';
          currentBlock = {
            type,
            content: '',
            startIndex: currentPos
          };
        }
      } else if (currentBlock) {
        // 添加到当前代码块
        currentBlock.content += (currentBlock.content ? '\n' : '') + line;
      }
    }

    // 如果有未完成的代码块（流式输出中）
    if (currentBlock) {
      codeBlocks.push({
        type: currentBlock.type,
        content: currentBlock.content,
        isComplete: false,
        startIndex: currentBlock.startIndex,
        endIndex: text.length
      });
    }

    return codeBlocks;
  };

  const parsed = parseCodeBlocks(content);
  const tail = parsed.length > 0 ? parsed[parsed.length - 1] : null;
  const hasIncompleteTail = isStreaming && tail && !tail.isComplete;

  // 渲染代码块的通用组件配置
  const codeComponent = ({ node, ...codeProps }: any) => {
    const { children: codeChildren, className: codeClassName, ...restProps } = codeProps;
    const match = /language-(\w+)/.exec(codeClassName || '');
    const lang = match ? match[1] : '';
    const inline = !match;
    return !inline ? (
      <GlassCodeBlock language={lang} isStreaming={false} conversationId={conversationId}>
        {String(codeChildren).replace(/\n$/, '')}
      </GlassCodeBlock>
    ) : (
      <code style={{
        background: 'rgba(139, 115, 85, 0.08)',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '0.9em',
        fontFamily: "'SF Mono', monospace",
        color: '#b85845'
      }} {...restProps}>
        {codeChildren}
      </code>
    );
  };

  if (hasIncompleteTail) {
    const before = content.slice(0, tail.startIndex);
    const language = tail.type || 'text';
    const codeText = tail.content || '';

    return (
      <div style={{
        fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif",
        fontSize: 'inherit'
      }}>
        {before && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ code: codeComponent }}
          >
            {before}
          </ReactMarkdown>
        )}
        <GlassCodeBlock language={language} isStreaming={true} conversationId={conversationId}>
          {codeText}
        </GlassCodeBlock>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif",
      fontSize: 'inherit'
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ code: codeComponent }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default SmartMarkdown;
