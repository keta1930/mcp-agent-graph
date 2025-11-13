// 支持的语言类型
export type Locale = 'en' | 'zh';

// 翻译键的命名空间
export type TranslationNamespace = 
  | 'common'
  | 'pages'
  | 'components'
  | 'messages'
  | 'errors';

// 翻译资源结构
export interface TranslationResource {
  common: {
    appName: string;
    welcome: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filter: string;
    loading: string;
    success: string;
    error: string;
    confirm: string;
    back: string;
    next: string;
    submit: string;
    reset: string;
    [key: string]: string;
  };
  pages: {
    home: {
      title: string;
      description: string;
    };
    login: {
      title: string;
      username: string;
      password: string;
      loginButton: string;
      registerLink: string;
    };
    workspace: {
      title: string;
      agentManager: string;
      graphEditor: string;
      modelManager: string;
      mcpManager: string;
      promptManager: string;
      systemTools: string;
      fileManager: string;
    };
    [key: string]: any;
  };
  components: {
    languageSwitcher: {
      title: string;
      english: string;
      chinese: string;
    };
    navigation: {
      home: string;
      chat: string;
      tasks: string;
      export: string;
      workspace: string;
      admin: string;
    };
    [key: string]: any;
  };
  messages: {
    loginSuccess: string;
    loginFailed: string;
    saveSuccess: string;
    saveFailed: string;
    deleteConfirm: string;
    deleteSuccess: string;
    deleteFailed: string;
    [key: string]: string;
  };
  errors: {
    networkError: string;
    unauthorized: string;
    notFound: string;
    serverError: string;
    [key: string]: string;
  };
}

// I18n Context 接口
export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
