// src/components/chat/AgentXMLRenderer.tsx
import React, { useState } from 'react';
import { Typography, Tag, Button } from 'antd';
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
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
}

interface AgentXMLRendererProps {
  content: string;
  generationType: 'mcp' | 'graph';
}

// 解析XML标签
const parseXMLTags = (content: string): XMLTag[] => {
  const xmlTags: XMLTag[] = [];
  
  // 匹配XML标签的正则表达式
  const xmlRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
  
  let match;
  while ((match = xmlRegex.exec(content)) !== null) {
    const [, tagName, attributesStr, tagContent] = match;
    
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
      attributes
    });
  }
  
  return xmlTags;
};

// XML标签渲染组件
interface XMLTagRendererProps {
  tag: XMLTag;
  generationType: 'mcp' | 'graph';
}

const XMLTagRenderer: React.FC<XMLTagRendererProps> = ({ tag, generationType }) => {
  const [expanded, setExpanded] = useState(false);
  
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
        <SyntaxHighlighter
          language="python"
          style={tomorrow}
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
      );
    }
    
    // JSON节点配置
    if (tag.tagName === 'node') {
      try {
        // 使用智能格式化
        const formatted = formatJSONForDisplay(tag.content, 70);
        return (
          <div className="json-content-wrapper">
            <SyntaxHighlighter
              language="json"
              style={tomorrow}
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
          </div>
        );
      } catch (e) {
        // 如果不是有效JSON，直接显示
        return (
          <div className="json-content-wrapper">
            <SyntaxHighlighter
              language="json"
              style={tomorrow}
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
          </div>
        );
      }
    }
    
    // Markdown内容
    if (tag.tagName === 'analysis' || tag.tagName === 'todo' || tag.tagName === 'readme') {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={tomorrow}
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
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {tag.content}
        </ReactMarkdown>
      );
    }
    
    // 普通文本内容
    return (
      <Paragraph>
        <Text>{tag.content}</Text>
      </Paragraph>
    );
  };
  
  return (
    <div className="xml-tag-container glass-card" data-tag={tag.tagName}>
      <div 
        className="xml-tag-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="xml-tag-info">
          {getTagIcon()}
          <Text strong>{getTagTitle()}</Text>
          <Tag color={getTagColor()} size="small">{tag.tagName}</Tag>
        </div>
        <Button
          type="text"
          size="small"
          icon={expanded ? <DownOutlined /> : <RightOutlined />}
        />
      </div>
      
      {expanded && (
        <div className="xml-tag-content">
          {renderContent()}
        </div>
      )}
    </div>
  );
};

const AgentXMLRenderer: React.FC<AgentXMLRendererProps> = ({ content, generationType }) => {
  const xmlTags = parseXMLTags(content);
  
  console.log('AgentXMLRenderer:', { content, generationType, xmlTagsCount: xmlTags.length, xmlTags });
  
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
                style={tomorrow}
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
              <code className={className} {...props}>
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
    <div className="agent-xml-renderer">
      {xmlTags.map((tag, index) => (
        <XMLTagRenderer
          key={`${tag.tagName}-${index}`}
          tag={tag}
          generationType={generationType}
        />
      ))}
    </div>
  );
};

export default AgentXMLRenderer;