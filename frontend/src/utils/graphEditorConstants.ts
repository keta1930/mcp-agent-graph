// 图编辑器常量定义

/**
 * 视图模式枚举
 */
export type ViewMode = 'list' | 'editor';

/**
 * 按钮样式配置
 */
export const buttonStyles = {
  // 主要按钮样式
  primary: {
    background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontWeight: 500,
    fontSize: '14px',
    letterSpacing: '0.3px',
    boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 20px'
  },

  // 次要按钮样式
  secondary: {
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.85)',
    color: '#8b7355',
    fontWeight: 500,
    fontSize: '14px',
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 16px'
  },

  // 模态框确认按钮
  modalOk: {
    height: '40px',
    background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontWeight: 500,
    fontSize: '14px',
    letterSpacing: '0.3px',
    boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    padding: '0 24px'
  },

  // 模态框取消按钮
  modalCancel: {
    height: '40px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.85)',
    color: '#8b7355',
    fontWeight: 500,
    fontSize: '14px',
    letterSpacing: '0.3px',
    padding: '0 24px'
  }
};

/**
 * 输入框样式配置
 */
export const inputStyles = {
  // 标准输入框
  standard: {
    height: '40px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
    color: '#2d2d2d',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
  },

  // 文本域
  textarea: {
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
    color: '#2d2d2d',
    lineHeight: '1.6',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
  }
};

/**
 * 模态框样式配置
 */
export const modalStyles = {
  content: {
    borderRadius: '10px',
    boxShadow: '0 12px 40px rgba(139, 115, 85, 0.2)',
    padding: 0,
    overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.9))',
    borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
    padding: '18px 28px',
    marginBottom: 0
  },
  body: {
    padding: '28px 28px 20px',
    background: '#fff'
  },
  footer: {
    borderTop: '1px solid rgba(139, 115, 85, 0.12)',
    padding: '16px 28px',
    background: 'rgba(250, 248, 245, 0.3)',
    marginTop: 0
  }
};
