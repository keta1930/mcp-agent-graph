// 导出类型定义
export type { Locale, TranslationNamespace, TranslationResource, I18nContextValue } from './types';

// 导出 Context 和 Provider
export { I18nProvider, useI18n } from './I18nContext';

// 导出自定义 Hooks
export { useTranslation, useT } from './hooks';

// 导出翻译资源管理函数
export { getTranslation, getAllTranslations } from './translations';
