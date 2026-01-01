// src/hooks/useSSEConnection.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import {
  ConversationService,
  generateMongoId
} from '../services/conversationService';
import {
  GraphExecuteRequest,
  AgentRunRequest,
  SSEMessage,
  ConversationMode,
  StreamingBlock,
  StreamingBlockType,
  EnhancedStreamingState
} from '../types/conversation';
import { useConversationStore } from '../store/conversationStore';

interface SSEConnectionOptions {
  mode: ConversationMode;
  conversationId?: string;
  onMessage?: (message: SSEMessage) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onConversationCreated?: (conversationId: string) => void;
  onTitleUpdate?: (data: { title?: string; tags?: string[]; conversation_id?: string }) => void;
}


export function useSSEConnection() {
  // 流式状态，支持分块渲染
  const [enhancedStreamingState, setEnhancedStreamingState] = useState<EnhancedStreamingState>({
    isStreaming: false,
    blocks: [],
    error: null,
    nodeInfo: null
  });

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { showNotification } = useConversationStore();

  const resetStreamingState = useCallback(() => {
    setEnhancedStreamingState({
      isStreaming: false,
      blocks: [],
      error: null,
      nodeInfo: null
    });
  }, []);

  const closeConnection = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    setEnhancedStreamingState(prev => ({ ...prev, isStreaming: false }));
  }, []);


  // 生成唯一的块ID
  const generateBlockId = useCallback(() => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 创建新的流式块
  const createStreamingBlock = useCallback((type: StreamingBlockType, content: string = '', toolCalls?: any[], toolCallId?: string): StreamingBlock => {
    const block: StreamingBlock = {
      id: generateBlockId(),
      type,
      content,
      toolCalls,
      toolCallId,
      isComplete: false,
      timestamp: Date.now()
    };

    // 如果是节点块类型，添加默认的节点信息结构
    if (type === 'node_start') {
      block.nodeInfo = {
        nodeName: '',
        level: 0,
        status: 'pending'
      };
    }

    return block;
  }, [generateBlockId]);

  // 处理SSE数据流
  const processSSEData = useCallback((data: string, options: SSEConnectionOptions & Record<string, any>) => {
    if (data.trim() === 'data: [DONE]') {
      // 流结束时，标记所有未完成的块为完成状态
      setEnhancedStreamingState(prev => ({
        ...prev,
        blocks: prev.blocks.map(block => ({ ...block, isComplete: true })),
        isStreaming: false
      }));
      closeConnection();
      options.onComplete?.();
      return;
    }

    if (data.startsWith('data: ')) {
      try {
        const jsonData = data.slice(6); // 移除 'data: ' 前缀
        if (jsonData.trim() === '[DONE]') {
          // 流结束时，标记所有未完成的块为完成状态
          setEnhancedStreamingState(prev => ({
            ...prev,
            blocks: prev.blocks.map(block => ({ ...block, isComplete: true })),
            isStreaming: false
          }));
          closeConnection();
          options.onComplete?.();
          return;
        }

        const message: SSEMessage = JSON.parse(jsonData);

        // 调用外部回调
        options.onMessage?.(message);

        // 处理通知消息
        if (message.error) {
          showNotification(message.error.message, 'error');
        }
        if (message.type === 'graph_complete') {
          showNotification('Graph执行完成', 'success');
        }

        // 更新流式状态，支持分块渲染
        setEnhancedStreamingState(prev => {
          const newState = { ...prev };
          let blocks = [...prev.blocks]; // 浅拷贝数组

          // 处理错误消息
          if (message.error) {
            newState.error = message.error.message;
            return newState;
          }

          // 处理标题更新事件
          if (message.type === 'title_update') {
            console.log('Title updated:', message.title, message.tags);
            // 通过回调通知外部更新标题和标签
            options.onTitleUpdate?.({
              title: message.title,
              tags: message.tags,
              conversation_id: message.conversation_id
            });
            return { ...newState, blocks };
          }

          // 处理graph对话创建事件
          if (message.type === 'conversation_created') {
            console.log('Graph conversation created:', message.conversation_id);
            // 通过options回调通知外部更新conversationId
            if (message.conversation_id) {
              options.onConversationCreated?.(message.conversation_id);
            }
            return { ...newState, blocks };
          }

          // 处理 Task 开始事件
          if (message.type === 'task_start') {
            console.log('Task started:', message.task_id, message.agent_name);
            // 创建新的 Task 块
            const taskBlock: StreamingBlock = {
              id: generateBlockId(),
              type: 'task',
              content: message.task_description || '',
              isComplete: false,
              timestamp: Date.now(),
              taskId: message.task_id!,
              taskStatus: 'running'
            };
            blocks = [...blocks, taskBlock];
            return { ...newState, blocks };
          }

          // 处理 Task 完成事件
          if (message.type === 'task_complete') {
            console.log('Task completed:', message.task_id, message.success);
            // 更新 Task 状态为 completed
            blocks = blocks.map(block => {
              if (block.type === 'task' && block.taskId === message.task_id) {
                return {
                  ...block,
                  taskStatus: 'completed',
                  isComplete: true,
                  content: message.result || block.content
                };
              }
              return block;
            });
            return { ...newState, blocks };
          }

          // 处理 Task 错误事件
          if (message.type === 'task_error') {
            console.log('Task failed:', message.task_id, message.error);
            // 更新 Task 状态为 failed
            blocks = blocks.map(block => {
              if (block.type === 'task' && block.taskId === message.task_id) {
                return {
                  ...block,
                  taskStatus: 'failed',
                  isComplete: true,
                  content: message.error?.message || 'Task failed'
                };
              }
              return block;
            });
            return { ...newState, blocks };
          }

          // 处理节点事件（Graph执行模式）
          if (message.type === 'node_start') {
            // 在开始新节点之前，确保所有之前的块都已完成
            blocks = blocks.map(block =>
              !block.isComplete ? { ...block, isComplete: true } : block
            );

            // 创建新的节点块
            const nodeBlock = createStreamingBlock('node_start', '', [], undefined);
            if (nodeBlock.nodeInfo) {
              nodeBlock.nodeInfo.nodeName = message.node_name || '';
              nodeBlock.nodeInfo.level = message.level || 0;
              nodeBlock.nodeInfo.status = 'running';
            }
            blocks = [...blocks, nodeBlock];

            // 同时更新全局节点信息用于兼容
            newState.nodeInfo = {
              nodeName: message.node_name,
              level: message.level,
              status: 'running'
            };
            return { ...newState, blocks };
          }

          if (message.type === 'node_end') {
            // 节点结束时，完成所有未完成的块
            blocks = blocks.map(block => {
              if (!block.isComplete) {
                // 如果是节点块，更新状态为完成
                if (block.type === 'node_start' && block.nodeInfo) {
                  return {
                    ...block,
                    isComplete: true,
                    nodeInfo: {
                      ...block.nodeInfo,
                      status: 'completed'
                    }
                  };
                }
                // 其他类型的块直接标记为完成
                return { ...block, isComplete: true };
              }
              return block;
            });

            // 同时更新全局节点信息用于兼容
            if (newState.nodeInfo) {
              newState.nodeInfo.status = 'completed';
            }
            return { ...newState, blocks };
          }

          if (message.type === 'graph_complete') {
            return { ...newState, blocks };
          }

          // 处理带 task_id 的普通消息（Sub Agent 的思考和工具调用）
          if (message.task_id && message.choices && message.choices[0]) {
            const delta = message.choices[0].delta;

            // 处理 Sub Agent 的 reasoning_content 和 reasoning
            if (delta?.reasoning_content || delta?.reasoning) {
              const reasoningText = delta?.reasoning_content || delta?.reasoning || '';
              const currentReasoningBlockIndex = blocks.findIndex(block =>
                block.type === 'reasoning' && !block.isComplete && block.taskId === message.task_id
              );

              if (currentReasoningBlockIndex === -1) {
                // 创建新的推理块（属于 Task）
                const newReasoningBlock = createStreamingBlock('reasoning', reasoningText);
                newReasoningBlock.taskId = message.task_id;
                blocks = [...blocks, newReasoningBlock];
              } else {
                // 更新现有推理块
                blocks = blocks.map((block, index) =>
                  index === currentReasoningBlockIndex
                    ? { ...block, content: block.content + reasoningText }
                    : block
                );
              }
            }

            // 处理 Sub Agent 的 content
            if (delta?.content) {
              const currentContentBlockIndex = blocks.findIndex(block =>
                block.type === 'content' && !block.isComplete && block.taskId === message.task_id
              );

              if (currentContentBlockIndex === -1) {
                // 创建新的内容块（属于 Task）
                const newContentBlock = createStreamingBlock('content', delta.content);
                newContentBlock.taskId = message.task_id;
                blocks = [...blocks, newContentBlock];
              } else {
                // 更新现有内容块
                blocks = blocks.map((block, index) =>
                  index === currentContentBlockIndex
                    ? { ...block, content: block.content + delta.content }
                    : block
                );
              }
            }

            // 处理 Sub Agent 的 tool_calls
            if (delta?.tool_calls) {
              // 如果有其他类型的块正在进行，先完成它们
              blocks = blocks.map(block =>
                !block.isComplete && (block.type === 'reasoning' || block.type === 'content') && block.taskId === message.task_id
                  ? { ...block, isComplete: true }
                  : block
              );

              // 处理工具调用增量
              delta.tool_calls.forEach(toolCall => {
                const currentToolCallBlockIndex = blocks.findIndex(block =>
                  block.type === 'tool_calls' && !block.isComplete && block.taskId === message.task_id
                );

                if (currentToolCallBlockIndex === -1) {
                  // 创建新的工具调用块（属于 Task）
                  const newToolCallBlock = createStreamingBlock('tool_calls', '', [toolCall]);
                  newToolCallBlock.taskId = message.task_id;
                  blocks = [...blocks, newToolCallBlock];
                } else {
                  // 更新现有工具调用块
                  blocks = blocks.map((block, index) => {
                    if (index !== currentToolCallBlockIndex) return block;

                    const toolCalls = block.toolCalls || [];
                    const existingIndex = toolCalls.findIndex(
                      tc => tc.index === toolCall.index
                    );

                    let updatedToolCalls;
                    if (existingIndex >= 0) {
                      // 更新现有工具调用
                      updatedToolCalls = toolCalls.map((tc, tcIndex) => {
                        if (tcIndex !== existingIndex) return tc;
                        return {
                          ...tc,
                          function: {
                            name: (tc.function.name || '') + (toolCall.function?.name || ''),
                            arguments: (tc.function.arguments || '') + (toolCall.function?.arguments || '')
                          }
                        };
                      });
                    } else {
                      // 添加新的工具调用
                      updatedToolCalls = [...toolCalls, {
                        index: toolCall.index,
                        id: toolCall.id,
                        type: 'function' as const,
                        function: {
                          name: toolCall.function?.name || '',
                          arguments: toolCall.function?.arguments || ''
                        }
                      }];
                    }

                    return { ...block, toolCalls: updatedToolCalls };
                  });
                }
              });
            }

            const finalState = { ...newState, blocks };
            return finalState;
          }

          // 处理OpenAI格式的流式消息 - 分块处理（主线程消息，不带 task_id）
          if (message.choices && message.choices[0]) {
            const delta = message.choices[0].delta;

            // 处理reasoning_content和reasoning（推理内容）
            if (delta?.reasoning_content || delta?.reasoning) {
              const reasoningText = delta?.reasoning_content || delta?.reasoning || '';
              const currentReasoningBlockIndex = blocks.findIndex(block =>
                block.type === 'reasoning' && !block.isComplete
              );

              if (currentReasoningBlockIndex === -1) {
                // 创建新的推理块
                const newReasoningBlock = createStreamingBlock('reasoning', reasoningText);
                blocks = [...blocks, newReasoningBlock];
              } else {
                // 更新现有推理块
                blocks = blocks.map((block, index) =>
                  index === currentReasoningBlockIndex
                    ? { ...block, content: block.content + reasoningText }
                    : block
                );
              }
            }

            // 处理content（普通内容）
            if (delta?.content) {
              // 移除强制完成推理块的逻辑，允许reasoning和content块并行存在
              // 这样可以保持SSE消息的原始顺序

              const currentContentBlockIndex = blocks.findIndex(block =>
                block.type === 'content' && !block.isComplete
              );

              if (currentContentBlockIndex === -1) {
                // 创建新的内容块
                const newContentBlock = createStreamingBlock('content', delta.content);
                blocks = [...blocks, newContentBlock];
              } else {
                // 更新现有内容块
                blocks = blocks.map((block, index) =>
                  index === currentContentBlockIndex
                    ? { ...block, content: block.content + delta.content }
                    : block
                );
              }
            }

            // 处理tool_calls（工具调用）
            if (delta?.tool_calls) {
              // 如果有其他类型的块正在进行，先完成它们
              blocks = blocks.map(block =>
                !block.isComplete && (block.type === 'reasoning' || block.type === 'content')
                  ? { ...block, isComplete: true }
                  : block
              );

              // 处理工具调用增量
              delta.tool_calls.forEach(toolCall => {
                const currentToolCallBlockIndex = blocks.findIndex(block =>
                  block.type === 'tool_calls' && !block.isComplete
                );

                if (currentToolCallBlockIndex === -1) {
                  // 创建新的工具调用块
                  const newToolCallBlock = createStreamingBlock('tool_calls', '', [toolCall]);
                  blocks = [...blocks, newToolCallBlock];
                } else {
                  // 更新现有工具调用块
                  blocks = blocks.map((block, index) => {
                    if (index !== currentToolCallBlockIndex) return block;

                    const toolCalls = block.toolCalls || [];
                    const existingIndex = toolCalls.findIndex(
                      tc => tc.index === toolCall.index
                    );

                    let updatedToolCalls;
                    if (existingIndex >= 0) {
                      // 更新现有工具调用
                      updatedToolCalls = toolCalls.map((tc, tcIndex) => {
                        if (tcIndex !== existingIndex) return tc;
                        return {
                          ...tc,
                          function: {
                            name: (tc.function.name || '') + (toolCall.function?.name || ''),
                            arguments: (tc.function.arguments || '') + (toolCall.function?.arguments || '')
                          }
                        };
                      });
                    } else {
                      // 添加新的工具调用
                      updatedToolCalls = [...toolCalls, {
                        index: toolCall.index,
                        id: toolCall.id,
                        type: 'function' as const,
                        function: {
                          name: toolCall.function?.name || '',
                          arguments: toolCall.function?.arguments || ''
                        }
                      }];
                    }

                    return { ...block, toolCalls: updatedToolCalls };
                  });
                }
              });
            }
          }

          // 处理工具执行结果 - 不创建独立的块，而是更新工具调用块的结果
          if (message.role === 'tool' && message.tool_call_id) {
            // 找到对应的工具调用块并添加结果（可能属于主线程或 Task）
            const toolCallBlockIndex = blocks.findIndex(block =>
              block.type === 'tool_calls' &&
              block.toolCalls?.some((tc: any) => tc.id === message.tool_call_id) &&
              // 如果消息带有 task_id，则只匹配相同 task_id 的块
              (message.task_id ? block.taskId === message.task_id : !block.taskId)
            );

            if (toolCallBlockIndex !== -1) {
              blocks = blocks.map((block, index) => {
                if (index !== toolCallBlockIndex) return block;

                // 将工具结果存储到块的数据中，供 ToolCallDisplay 使用
                let results: Record<string, string> = {};
                try {
                  results = block.content ? JSON.parse(block.content) : {};
                } catch {
                  results = {};
                }

                if (message.tool_call_id) {
                  results[message.tool_call_id] = message.content || '';
                }

                return {
                  ...block,
                  content: JSON.stringify(results),
                  isComplete: true
                };
              });
            }
          }

          const finalState = { ...newState, blocks };

          return finalState;
        });

      } catch (error) {
        console.error('解析SSE消息失败:', error);
        setEnhancedStreamingState((prev: EnhancedStreamingState) => ({
          ...prev,
          error: '消息解析失败'
        }));
      }
    }
  }, [closeConnection, showNotification, createStreamingBlock]);

  const startConnection = useCallback(async (
    inputText: string,
    options: SSEConnectionOptions & Record<string, any>
  ) => {
    // 关闭之前的连接
    closeConnection();

    // 重置状态
    resetStreamingState();

    const conversationId = options.conversationId || generateMongoId();

    try {
      let reader: ReadableStreamDefaultReader<Uint8Array>;

      // 根据模式创建不同的SSE连接
      console.log('SSE Connection - Mode:', options.mode, 'ConversationId:', conversationId);

      switch (options.mode) {
        case 'agent': {
          console.log('Creating Agent Invoke SSE connection');
          const request: AgentRunRequest = {
            agent_name: options.agent_name,
            user_prompt: options.user_prompt || inputText,
            conversation_id: conversationId,
            model_name: options.model_name,
            system_prompt: options.system_prompt,
            mcp_servers: options.mcp_servers || [],
            system_tools: options.system_tools || [],
            max_iterations: options.max_iterations,
            files: options.files || [] // 添加文件支持
          };
          reader = await ConversationService.createAgentRunSSE(request);
          break;
        }

        case 'graph': {
          console.log('Creating Graph Execute SSE connection');
          const request: GraphExecuteRequest = {
            graph_name: options.graph_name,
            input_text: inputText,
            // 只有继续现有对话时才传递conversation_id
            conversation_id: options.conversationId, // 使用传入的conversationId，新对话时为undefined
            continue_from_checkpoint: options.continue_from_checkpoint || false
          };
          reader = await ConversationService.createGraphSSE(request);
          break;
        }

        default:
          throw new Error(`不支持的模式: ${options.mode}`);
      }

      readerRef.current = reader;
      setEnhancedStreamingState((prev: EnhancedStreamingState) => ({ ...prev, isStreaming: true }));

      // 创建一个AbortController来管理取消
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 开始读取流数据
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done || abortController.signal.aborted) {
            break;
          }

          // 解码数据并添加到缓冲区
          buffer += decoder.decode(value, { stream: true });

          // 按行分割数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个不完整的行

          // 处理每一行
          // 使用 flushSync 确保每次更新都立即渲染，避免 React 18 的自动批处理
          for (const line of lines) {
            if (line.trim()) {
              flushSync(() => {
                processSSEData(line, options);
              });
            }
          }
        }
      } catch (readError) {
        if (!abortController.signal.aborted) {
          console.error('读取流数据失败:', readError);
          const errorMessage = '数据流读取失败';
          setEnhancedStreamingState((prev: EnhancedStreamingState) => ({
            ...prev,
            error: errorMessage,
            isStreaming: false
          }));
          options.onError?.(errorMessage);
        }
      }

      return conversationId;

    } catch (error) {
      console.error('创建SSE连接失败:', error);
      const errorMessage = error instanceof Error ? error.message : '连接失败';
      setEnhancedStreamingState((prev: EnhancedStreamingState) => ({
        ...prev,
        error: errorMessage
      }));
      options.onError?.(errorMessage);
      throw error;
    }
  }, [closeConnection, resetStreamingState, processSSEData]);

  // 清理函数
  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  return {
    streamingState: enhancedStreamingState, // 为了向后兼容，保持接口名称
    enhancedStreamingState,
    startConnection,
    closeConnection,
    resetStreamingState
  };
}