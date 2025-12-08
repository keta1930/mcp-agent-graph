// 流式块显示组件
import React from 'react';
import { StreamingBlock } from '../../../types/conversation';
import ReasoningDisplay from './ReasoningDisplay';
import SmartMarkdown from './SmartMarkdown';
import ToolCallDisplay from './ToolCallDisplay';
import NodeExecutionInfo from './NodeExecutionInfo';

interface StreamingBlockDisplayProps {
  block: StreamingBlock;
  renderingMode: 'agent' | 'graph';
  toolResults?: Record<string, string>;
  conversationId?: string;
}

/**
 * 流式块显示组件
 * 根据块类型渲染不同的内容
 */
const StreamingBlockDisplay: React.FC<StreamingBlockDisplayProps> = ({
  block,
  renderingMode,
  toolResults = {},
  conversationId
}) => {
  switch (block.type) {
    case 'reasoning':
      return <ReasoningDisplay content={block.content} />;

    case 'content':
      return (
        <div>
          <div style={{ position: 'relative' }}>
            <SmartMarkdown
              content={block.content}
              isStreaming={!block.isComplete}
              conversationId={conversationId}
            />
            {!block.isComplete && (
              <span style={{
                marginLeft: '2px',
                color: '#b85845',
                fontWeight: 'bold',
                animation: 'typingCursor 1s infinite'
              }}>▋</span>
            )}
          </div>
        </div>
      );

    case 'tool_calls':
      // 从块内容中解析工具结果
      let blockToolResults: Record<string, string> = {};
      try {
        if (block.content) {
          blockToolResults = JSON.parse(block.content);
        }
      } catch {
        // 解析失败时使用空对象
      }

      // 合并外部传入的工具结果和块内部的工具结果
      const combinedToolResults = { ...toolResults, ...blockToolResults };

      return (
        <div className="tool-calls-block">
          {block.toolCalls?.map((toolCall: any, index: number) => (
            <ToolCallDisplay
              key={toolCall.id || index}
              toolCall={toolCall}
              result={toolCall.id ? combinedToolResults[toolCall.id] : undefined}
              conversationId={conversationId}
              isStreaming={!block.isComplete}
            />
          ))}
        </div>
      );

    case 'node_start':
      // 渲染节点信息
      if (block.nodeInfo) {
        return (
          <NodeExecutionInfo
            nodeName={block.nodeInfo.nodeName}
            level={block.nodeInfo.level}
            status={block.nodeInfo.status}
          />
        );
      }
      return null;

    case 'task':
      // Task blocks are handled separately in the main render logic
      return null;

    default:
      return null;
  }
};

export default StreamingBlockDisplay;
