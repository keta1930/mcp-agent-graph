import { useI18n } from './I18nContext';

/**
 * 获取翻译函数和当前语言的 Hook
 * @returns 包含 t 函数和 locale 的对象
 */
export const useTranslation = () => {
  const { t, locale } = useI18n();
  return { t, locale };
};

/**
 * 简化版 Hook，仅返回翻译函数
 * @returns 翻译函数 t
 */
export const useT = () => {
  const { t } = useI18n();
  return t;
};
