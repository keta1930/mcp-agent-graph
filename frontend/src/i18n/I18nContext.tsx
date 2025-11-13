import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Locale, I18nContextValue } from './types';
import { getTranslation } from './translations';

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// 从 localStorage 获取保存的语言设置
const getSavedLocale = (): Locale => {
  const saved = localStorage.getItem('app_locale');
  if (saved === 'en' || saved === 'zh') {
    return saved;
  }
  
  // 根据浏览器语言自动选择
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale());

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('app_locale', newLocale);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getTranslation(locale, key);
    
    if (!params) {
      return translation;
    }
    
    // 替换参数占位符 {{paramName}}
    return translation.replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
      return params[paramName]?.toString() || match;
    });
  };

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
