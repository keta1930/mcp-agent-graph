// src/components/chat/message/AgentXMLRenderer.tsx
import React, { useState } from 'react';
import { Typography, Tag } from 'antd';
import {
  FileTextOutlined,
  CodeOutlined,
  DeleteOutlined,
  FolderOutlined,
  ToolOutlined,
  NodeIndexOutlined,
  DownOutlined,
  RightOutlined,
  BookOutlined,
  OrderedListOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { Text, Paragraph } = Typography;

// JSON智能格式化函数
const formatJSONForDisplay = (jsonString: string, maxLineLength: number = 70): string => {
  try {
    const parsed = JSON.parse(jsonString);

    // 自定义格式化函数
    const formatValue = (value: any, indent: number = 0): string => {
      const spaces = '  '.repeat(indent);
      const nextSpaces = '  '.repeat(indent + 1);

      if (value === null) return 'null';
      if (typeof value === 'boolean') return value.toString();
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'string') {
        // 长字符串自动换行
        if (value.length > maxLineLength - indent * 2 - 10) {
          // 保持字符串完整性，但允许CSS处理换行
          return `"${value}"`;
        }
        return `"${value}"`;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';

        // 检查数组是否可以放在一行
        const oneLineArray = `[${value.map(v => formatValue(v, 0)).join(', ')}]`;
        if (oneLineArray.length <= maxLineLength - indent * 2) {
          return oneLineArray;
        }

        // 多行格式
        const items = value.map(v => `${nextSpaces}${formatValue(v, indent + 1)}`);
        return `[\n${items.join(',\n')}\n${spaces}]`;
      }

      if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';

        // 检查对象是否可以放在一行
        const oneLineObj = `{${keys.map(k => `"${k}": ${formatValue(value[k], 0)}`).join(', ')}}`;
        if (oneLineObj.length <= maxLineLength - indent * 2) {
          return oneLineObj;
        }

        // 多行格式
        const items = keys.map(key => {
          const formattedValue = formatValue(value[key], indent + 1);
          return `${nextSpaces}"${key}": ${formattedValue}`;
        });
        return `{\n${items.join(',\n')}\n${spaces}}`;
      }

      return String(value);
    };

    return formatValue(parsed);
  } catch (error) {
    // 如果解析失败，返回原始字符串
    return jsonString;
  }
};

interface XMLTag {
  tagName: string;
  content: string;
  attributes?: Record<string, string>;
  isIncomplete?: boolean;
}

interface AgentXMLRendererProps {
  content: string;
  generationType?: 'mcp' | 'graph'; // 可选的generationType，用于优化显示
  isStreaming?: boolean;
}

// 更智能的XML流式解析器
const parseXMLTags = (content: string, isStreaming: boolean = false): XMLTag[] => {
  const xmlTags: XMLTag[] = [];
  const processedPositions = new Set<number>();

  // 1. 首先处理所有完整的XML标签
  const completeTagRegex = /<(\w+)([^>]*?)>([\s\S]*?)<\/\1>/g;
  let match;

  while ((match = completeTagRegex.exec(content)) !== null) {
    const [fullMatch, tagName, attributesStr, tagContent] = match;
    const startPos = match.index;
    const endPos = match.index + fullMatch.length;

    // 记录已处理的位置
    for (let i = startPos; i < endPos; i++) {
      processedPositions.add(i);
    }

    // 解析属性
    const attributes: Record<string, string> = {};
    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }

    xmlTags.push({
      tagName,
      content: tagContent.trim(),
      attributes,
      isIncomplete: false
    });
  }

  // 2. 如果是流式模式，处理未完成的XML标签
  if (isStreaming) {
    // 查找未处理的开始标签
    const openTagRegex = /<(\w+)([^>]*?)>/g;
    let openMatch;

    while ((openMatch = openTagRegex.exec(content)) !== null) {
      const [fullOpenTag, tagName, attributesStr] = openMatch;
      const openTagStart = openMatch.index;
      const openTagEnd = openMatch.index + fullOpenTag.length;

      // 如果这个开始标签已经被处理过（属于完整标签），跳过
      if (processedPositions.has(openTagStart)) {
        continue;
      }

      // 查找对应的结束标签
      const remainingContent = content.slice(openTagEnd);
      const closeTagRegex = new RegExp(`<\\/${tagName}>`, 'i');
      const closeMatch = remainingContent.match(closeTagRegex);

      if (!closeMatch) {
        // 没有找到结束标签，这是一个未完成的标签
        const tagContent = remainingContent;

        // 解析属性
        const attributes: Record<string, string> = {};
        const attrRegex = /(\w+)=["']([^"']*)["']/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
          attributes[attrMatch[1]] = attrMatch[2];
        }

        xmlTags.push({
          tagName,
          content: tagContent.trim(),
          attributes,
          isIncomplete: true
        });
      }
    }
  }

  // 3. 按出现顺序排序
  return xmlTags.sort((a, b) => {
    const aIndex = content.indexOf(`<${a.tagName}`);
    const bIndex = content.indexOf(`<${b.tagName}`);
    return aIndex - bIndex;
  });
};

// 智能检测内容类型（MCP或Graph）
const detectContentType = (xmlTags: XMLTag[]): 'mcp' | 'graph' | 'unknown' => {
  // MCP相关的标签
  const mcpTags = ['folder_name', 'script_file', 'delete_script_file', 'dependencies', 'readme'];
  // Graph相关的标签
  const graphTags = ['graph_name', 'graph_description', 'node', 'delete_node', 'end_template'];

  const tagNames = xmlTags.map(tag => tag.tagName);

  const hasMcpTags = mcpTags.some(tag => tagNames.includes(tag));
  const hasGraphTags = graphTags.some(tag => tagNames.includes(tag));

  if (hasMcpTags && !hasGraphTags) {
    return 'mcp';
  } else if (hasGraphTags && !hasMcpTags) {
    return 'graph';
  } else if (hasMcpTags && hasGraphTags) {
    // 如果两种都有，根据数量判断
    const mcpCount = mcpTags.filter(tag => tagNames.includes(tag)).length;
    const graphCount = graphTags.filter(tag => tagNames.includes(tag)).length;
    return mcpCount >= graphCount ? 'mcp' : 'graph';
  }

  return 'unknown';
};

// XML标签渲染组件
interface XMLTagRendererProps {
  tag: XMLTag;
  contentType: 'mcp' | 'graph' | 'unknown';
}

const XMLTagRenderer: React.FC<XMLTagRendererProps> = ({ tag, contentType }) => {
  // 未完成的标签自动展开，完成的标签默认折叠
  const [expanded, setExpanded] = useState(tag.isIncomplete || false);

  // 监听标签完成状态的变化
  React.useEffect(() => {
    if (tag.isIncomplete) {
      setExpanded(true); // 未完成的标签保持展开
    }
  }, [tag.isIncomplete]);

  const getTagIcon = () => {
    switch (tag.tagName) {
      case 'analysis':
        return <InfoCircleOutlined className="tag-icon" />;
      case 'todo':
        return <OrderedListOutlined className="tag-icon" />;
      case 'script_file':
        return <CodeOutlined className="tag-icon" />;
      case 'delete_script_file':
        return <DeleteOutlined className="tag-icon" />;
      case 'folder_name':
        return <FolderOutlined className="tag-icon" />;
      case 'dependencies':
        return <ToolOutlined className="tag-icon" />;
      case 'readme':
        return <BookOutlined className="tag-icon" />;
      case 'graph_name':
        return <NodeIndexOutlined className="tag-icon" />;
      case 'graph_description':
        return <FileTextOutlined className="tag-icon" />;
      case 'node':
        return <NodeIndexOutlined className="tag-icon" />;
      case 'delete_node':
        return <DeleteOutlined className="tag-icon" />;
      case 'end_template':
        return <FileTextOutlined className="tag-icon" />;
      default:
        return <FileTextOutlined className="tag-icon" />;
    }
  };

  const getTagColor = () => {
    // 未完成的标签使用特殊颜色
    if (tag.isIncomplete) return 'processing';
    if (tag.tagName.includes('delete')) return 'red';
    if (tag.tagName === 'script_file' || tag.tagName === 'node') return 'blue';
    if (tag.tagName === 'analysis') return 'purple';
    if (tag.tagName === 'todo') return 'orange';
    return 'default';
  };

  const getTagTitle = () => {
    switch (tag.tagName) {
      case 'analysis':
        return '需求分析';
      case 'todo':
        return '待办事项';
      case 'script_file':
        return `脚本文件: ${tag.attributes?.name || '未命名'}`;
      case 'delete_script_file':
        return '删除脚本文件';
      case 'folder_name':
        return '文件夹名称';
      case 'dependencies':
        return '项目依赖';
      case 'readme':
        return 'README文档';
      case 'graph_name':
        return '图名称';
      case 'graph_description':
        return '图描述';
      case 'node':
        return '节点配置';
      case 'delete_node':
        return '删除节点';
      case 'end_template':
        return '输出模板';
      default:
        return tag.tagName;
    }
  };

  const renderContent = () => {
    // Python代码文件
    if (tag.tagName === 'script_file') {
      return (
        <div className={`code-content-wrapper ${tag.isIncomplete ? 'streaming' : ''}`}>
          <SyntaxHighlighter
            language="python"
            style={oneLight}
            customStyle={{
              background: 'transparent',
              padding: '12px',
              fontSize: '13px',
              borderRadius: '4px',
              maxWidth: '100%',
              width: '100%',
              margin: '0',
              boxSizing: 'border-box',
              overflowX: 'auto'
            }}
          >
            {tag.content}
          </SyntaxHighlighter>
          {tag.isIncomplete && (
            <div className="streaming-cursor">|</div>
          )}
        </div>
      );
    }

    // JSON节点配置
    if (tag.tagName === 'node') {
      try {
        // 使用智能格式化
        const formatted = formatJSONForDisplay(tag.content, 70);
        return (
          <div className={`json-content-wrapper ${tag.isIncomplete ? 'streaming' : ''}`}>
            <SyntaxHighlighter
              language="json"
              style={oneLight}
              customStyle={{
                background: 'transparent',
                padding: '12px',
                fontSize: '13px',
                borderRadius: '4px',
                margin: '0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {formatted}
            </SyntaxHighlighter>
            {tag.isIncomplete && (
              <div className="streaming-cursor">|</div>
            )}
          </div>
        );
      } catch (e) {
        // 如果不是有效JSON，直接显示
        return (
          <div className={`json-content-wrapper ${tag.isIncomplete ? 'streaming' : ''}`}>
            <SyntaxHighlighter
              language="json"
              style={oneLight}
              customStyle={{
                background: 'transparent',
                padding: '12px',
                fontSize: '13px',
                borderRadius: '4px',
                margin: '0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {tag.content}
            </SyntaxHighlighter>
            {tag.isIncomplete && (
              <div className="streaming-cursor">|</div>
            )}
          </div>
        );
      }
    }

    // Markdown内容
    if (tag.tagName === 'analysis' || tag.tagName === 'todo' || tag.tagName === 'readme') {
      return (
        <div className={`markdown-content-wrapper ${tag.isIncomplete ? 'streaming' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneLight}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      background: 'transparent',
                      maxWidth: '100%',
                      width: '100%',
                      margin: '0',
                      boxSizing: 'border-box',
                      overflowX: 'auto'
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code style={{
                    background: 'rgba(139, 115, 85, 0.08)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '0.9em',
                    fontFamily: "'SF Mono', monospace",
                    color: '#b85845'
                  }} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {tag.content}
          </ReactMarkdown>
          {tag.isIncomplete && (
            <div className="streaming-cursor">|</div>
          )}
        </div>
      );
    }

    // 普通文本内容
    return (
      <div className={`text-content-wrapper ${tag.isIncomplete ? 'streaming' : ''}`}>
        <Paragraph>
          <Text>{tag.content}</Text>
        </Paragraph>
        {tag.isIncomplete && (
          <div className="streaming-cursor">|</div>
        )}
      </div>
    );
  };

  const getIconColor = () => {
    if (tag.tagName.includes('delete')) return '#b85845';
    if (tag.tagName === 'analysis') return '#b85845';
    if (tag.tagName === 'todo') return '#d4a574';
    if (tag.tagName === 'script_file' || tag.tagName === 'node') return '#a0826d';
    return '#8b7355';
  };

  const getTagStyle = () => {
    if (tag.tagName.includes('delete')) {
      return {
        background: 'rgba(184, 88, 69, 0.08)',
        color: '#b85845',
        border: '1px solid rgba(184, 88, 69, 0.25)'
      };
    }
    if (tag.tagName === 'analysis') {
      return {
        background: 'rgba(184, 88, 69, 0.08)',
        color: '#b85845',
        border: '1px solid rgba(184, 88, 69, 0.25)'
      };
    }
    if (tag.tagName === 'todo') {
      return {
        background: 'rgba(212, 165, 116, 0.08)',
        color: '#d4a574',
        border: '1px solid rgba(212, 165, 116, 0.25)'
      };
    }
    return {
      background: 'rgba(160, 130, 109, 0.08)',
      color: '#a0826d',
      border: '1px solid rgba(160, 130, 109, 0.2)'
    };
  };

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '6px',
      background: 'rgba(255, 255, 255, 0.85)',
      border: '1px solid rgba(139, 115, 85, 0.15)',
      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
      opacity: tag.isIncomplete ? 0.95 : 1
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: getIconColor(), fontSize: '16px' }}>
            {getTagIcon()}
          </span>
          <Text strong style={{ color: '#2d2d2d', fontSize: '14px' }}>{getTagTitle()}</Text>
          <Tag style={{
            ...getTagStyle(),
            borderRadius: '6px',
            fontWeight: 500,
            padding: '2px 10px',
            fontSize: '12px'
          }}>
            {tag.tagName}
          </Tag>
          {tag.isIncomplete && (
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '2px 10px',
              fontSize: '12px'
            }}>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>生成中</span>
            </Tag>
          )}
        </div>
        {expanded ? (
          <DownOutlined style={{ color: '#8b7355', fontSize: '14px' }} />
        ) : (
          <RightOutlined style={{ color: '#8b7355', fontSize: '14px' }} />
        )}
      </div>

      {expanded && (
        <div style={{
          padding: '0 14px 12px',
          borderTop: '1px solid rgba(139, 115, 85, 0.15)',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <div style={{ marginTop: '12px' }}>
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
};

const AgentXMLRenderer: React.FC<AgentXMLRendererProps> = ({ content, generationType, isStreaming = false }) => {
  const xmlTags = parseXMLTags(content, isStreaming);

  // 智能检测内容类型，优先使用传入的generationType
  const detectedContentType = detectContentType(xmlTags);
  const effectiveContentType = generationType || detectedContentType;

  console.log('AgentXMLRenderer:', {
    content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    generationType,
    detectedContentType,
    effectiveContentType,
    isStreaming,
    xmlTagsCount: xmlTags.length,
    xmlTags: xmlTags.map(tag => ({ tagName: tag.tagName, isIncomplete: tag.isIncomplete }))
  });

  if (xmlTags.length === 0) {
    // 如果没有XML标签，显示普通内容
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneLight}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  background: 'rgba(0,0,0,0.1)',
                  maxWidth: '100%',
                  width: '100%',
                  margin: '0',
                  boxSizing: 'border-box',
                  overflowX: 'auto'
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code style={{
                background: 'rgba(139, 115, 85, 0.08)',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.9em',
                fontFamily: "'SF Mono', monospace",
                color: '#b85845'
              }} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {xmlTags.map((tag, index) => (
        <XMLTagRenderer
          key={`${tag.tagName}-${index}`}
          tag={tag}
          contentType={effectiveContentType}
        />
      ))}
    </div>
  );
};

export default AgentXMLRenderer;