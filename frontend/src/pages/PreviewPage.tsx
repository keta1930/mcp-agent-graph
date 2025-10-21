// src/pages/PreviewPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Space, Typography, message, Tooltip, Alert } from 'antd';
import { previewService } from '../services/previewService';

const { Title, Text } = Typography;

// 将 URL 参数中的内容进行解码
const decodeParam = (value: string | null): string => {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value || '';
  }
};

const PreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const shareId = searchParams.get('id');
  const paramLang = (searchParams.get('lang') || 'text').toLowerCase();
  const paramTitle = searchParams.get('title') || '内容预览';
  const paramContent = useMemo(() => decodeParam(searchParams.get('c')), [searchParams]);

  const [lang, setLang] = useState<string>(paramLang);
  const [title, setTitle] = useState<string>(paramTitle);
  const [content, setContent] = useState<string>(paramContent);
  const [loading, setLoading] = useState<boolean>(false);

  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyLink = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(window.location.href);
      message.success('分享链接已复制到剪贴板');
    } catch (e: any) {
      message.error('复制失败：' + (e?.message || String(e)));
    } finally {
      setCopying(false);
    }
  };

  // 通过短链ID加载内容（如有），否则使用URL参数
  useEffect(() => {
    const load = async () => {
      if (!shareId) {
        setLang(paramLang);
        setTitle(paramTitle);
        setContent(paramContent);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await previewService.getShare(shareId);
        setLang(res.lang?.toLowerCase() || 'text');
        setTitle(res.title || '内容预览');
        setContent(res.content || '');
      } catch (e: any) {
        setError('加载短链内容失败：' + (e?.message || String(e)));
        // 回退为参数内容（如果存在）
        setLang(paramLang);
        setTitle(paramTitle);
        setContent(paramContent);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  // Mermaid 渲染：通过 CDN 注入脚本并进行初始化
  useEffect(() => {
    if (lang !== 'mermaid') return;
    setError(null);

    const scriptId = 'mermaid-cdn-script';
    const renderMermaid = () => {
      try {
        // @ts-ignore
        const mermaid = (window as any).mermaid;
        if (!mermaid) {
          setError('Mermaid 未加载');
          return;
        }
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Segoe UI, Arial, sans-serif'
        });
        // 基于页面上的 .mermaid 元素渲染
        mermaid.init(undefined, '.mermaid');
      } catch (e: any) {
        setError('图表渲染失败：' + (e?.message || String(e)));
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.async = true;
      script.onload = renderMermaid;
      script.onerror = () => setError('Mermaid 资源加载失败');
      document.head.appendChild(script);
    } else {
      renderMermaid();
    }
  }, [lang, content]);

  const renderContent = () => {
    if (!content?.trim()) {
      return <Alert type="info" message="没有可预览的内容" showIcon />;
    }

    if (lang === 'html') {
      return (
        <iframe
          title="HTML 预览"
          srcDoc={content}
          sandbox="allow-scripts allow-popups allow-same-origin"
          style={{ width: '100%', height: '80vh', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
        />
      );
    }

    if (lang === 'svg') {
      const svgDoc = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:16px;background:#fff;">${content}</body></html>`;
      return (
        <iframe
          title="SVG 预览"
          srcDoc={svgDoc}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', height: '80vh', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
        />
      );
    }

    if (lang === 'mermaid') {
      return (
        <div style={{ width: '100%', minHeight: '60vh', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />
          )}
          <div className="mermaid" style={{ overflow: 'auto' }}>
            {content}
          </div>
        </div>
      );
    }

    // 默认：纯文本显示
    return (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
        {content}
      </pre>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        <Space>
          <Tooltip title="复制当前分享链接">
            <Button onClick={handleCopyLink} loading={copying}>
              复制分享链接
            </Button>
          </Tooltip>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </Space>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">类型：{lang}</Text>
        {loading && (
          <span style={{ marginLeft: 8 }}><Text type="secondary">加载中...</Text></span>
        )}
      </div>

      {renderContent()}
    </div>
  );
};

export default PreviewPage;