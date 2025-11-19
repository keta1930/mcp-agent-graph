import React from 'react';
import { Dropdown, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n';
import type { MenuProps } from 'antd';

interface LanguageSwitcherProps {
  showLabel?: boolean; // 是否显示文字标签，默认为 true
}

/**
 * 语言切换器组件
 * 允许用户在英文和中文之间切换界面语言
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ showLabel = true }) => {
  const { locale, setLocale, t } = useI18n();

  const items: MenuProps['items'] = [
    {
      key: 'en',
      label: t('components.languageSwitcher.english'),
      onClick: () => setLocale('en'),
    },
    {
      key: 'zh',
      label: t('components.languageSwitcher.chinese'),
      onClick: () => setLocale('zh'),
    },
  ];

  const currentLanguageLabel = locale === 'en' 
    ? t('components.languageSwitcher.english')
    : t('components.languageSwitcher.chinese');

  return (
    <Dropdown 
      menu={{ items, selectedKeys: [locale] }} 
      placement="bottomRight"
      trigger={['click']}
    >
      <Button icon={<GlobalOutlined />} type="text">
        {showLabel ? currentLanguageLabel : null}
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
