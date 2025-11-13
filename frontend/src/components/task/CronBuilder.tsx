import React, { useState, useEffect } from 'react';
import { Select, Input } from 'antd';
import { CronTemplate } from '../../types/task';
import { useT } from '../../i18n/hooks';

const { Option } = Select;

interface CronBuilderProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

const CronBuilder: React.FC<CronBuilderProps> = ({
  value = '0 9 * * *',
  onChange,
  disabled = false
}) => {
  const t = useT();
  const [minute, setMinute] = useState<string>('0');
  const [hour, setHour] = useState<string>('9');
  const [day, setDay] = useState<string>('*');
  const [month, setMonth] = useState<string>('*');
  const [dayOfWeek, setDayOfWeek] = useState<string>('*');
  const [customMode, setCustomMode] = useState<boolean>(false);

  // 预设的cron模板
  const CRON_TEMPLATES: CronTemplate[] = [
    { name: t('pages.taskManager.cronBuilder.templates.hourly'), description: '', expression: '0 * * * *' },
    { name: t('pages.taskManager.cronBuilder.templates.daily9am'), description: '', expression: '0 9 * * *' },
    { name: t('pages.taskManager.cronBuilder.templates.weekly'), description: '', expression: '0 9 * * 1' },
    { name: t('pages.taskManager.cronBuilder.templates.monthly'), description: '', expression: '0 9 1 * *' },
    { name: t('pages.taskManager.cronBuilder.templates.weekdays'), description: '', expression: '0 9 * * 1-5' },
    { name: t('pages.taskManager.cronBuilder.templates.twiceHourly'), description: '', expression: '15,45 * * * *' }
  ];

  // 解析cron表达式
  useEffect(() => {
    if (value) {
      const parts = value.split(' ');
      if (parts.length === 5) {
        setMinute(parts[0]);
        setHour(parts[1]);
        setDay(parts[2]);
        setMonth(parts[3]);
        setDayOfWeek(parts[4]);
      }
    }
  }, [value]);

  // 构建cron表达式
  const buildCronExpression = (
    m: string = minute,
    h: string = hour,
    d: string = day,
    mn: string = month,
    dow: string = dayOfWeek
  ) => {
    return `${m} ${h} ${d} ${mn} ${dow}`;
  };

  // 处理字段变化
  const handleFieldChange = (field: string, val: string) => {
    let newMinute = minute;
    let newHour = hour;
    let newDay = day;
    let newMonth = month;
    let newDayOfWeek = dayOfWeek;

    switch (field) {
      case 'minute':
        newMinute = val;
        setMinute(val);
        break;
      case 'hour':
        newHour = val;
        setHour(val);
        break;
      case 'day':
        newDay = val;
        setDay(val);
        break;
      case 'month':
        newMonth = val;
        setMonth(val);
        break;
      case 'dayOfWeek':
        newDayOfWeek = val;
        setDayOfWeek(val);
        break;
    }

    const cronExpression = buildCronExpression(newMinute, newHour, newDay, newMonth, newDayOfWeek);
    onChange?.(cronExpression);
  };

  // 处理模板选择
  const handleTemplateSelect = (template: CronTemplate) => {
    onChange?.(template.expression);
    setCustomMode(false);
  };

  // 生成数字选项
  const generateOptions = (start: number, end: number) => {
    const options = [];
    for (let i = start; i <= end; i++) {
      options.push(
        <Option key={i} value={i.toString()}>
          {i.toString().padStart(2, '0')}
        </Option>
      );
    }
    return options;
  };

  // 星期选项
  const dayOfWeekOptions = [
    { value: '*', label: t('pages.taskManager.cronBuilder.everyDay') },
    { value: '0', label: t('pages.taskManager.cronBuilder.weekdays.sunday') },
    { value: '1', label: t('pages.taskManager.cronBuilder.weekdays.monday') },
    { value: '2', label: t('pages.taskManager.cronBuilder.weekdays.tuesday') },
    { value: '3', label: t('pages.taskManager.cronBuilder.weekdays.wednesday') },
    { value: '4', label: t('pages.taskManager.cronBuilder.weekdays.thursday') },
    { value: '5', label: t('pages.taskManager.cronBuilder.weekdays.friday') },
    { value: '6', label: t('pages.taskManager.cronBuilder.weekdays.saturday') },
    { value: '1-5', label: t('pages.taskManager.cronBuilder.weekdays.weekdays') },
    { value: '0,6', label: t('pages.taskManager.cronBuilder.weekdays.weekend') }
  ];

  // 月份选项
  const monthOptions = [
    { value: '*', label: t('pages.taskManager.cronBuilder.everyMonth') },
    { value: '1', label: t('pages.taskManager.cronBuilder.months.january') },
    { value: '2', label: t('pages.taskManager.cronBuilder.months.february') },
    { value: '3', label: t('pages.taskManager.cronBuilder.months.march') },
    { value: '4', label: t('pages.taskManager.cronBuilder.months.april') },
    { value: '5', label: t('pages.taskManager.cronBuilder.months.may') },
    { value: '6', label: t('pages.taskManager.cronBuilder.months.june') },
    { value: '7', label: t('pages.taskManager.cronBuilder.months.july') },
    { value: '8', label: t('pages.taskManager.cronBuilder.months.august') },
    { value: '9', label: t('pages.taskManager.cronBuilder.months.september') },
    { value: '10', label: t('pages.taskManager.cronBuilder.months.october') },
    { value: '11', label: t('pages.taskManager.cronBuilder.months.november') },
    { value: '12', label: t('pages.taskManager.cronBuilder.months.december') }
  ];

  // 解析并描述cron表达式
  const describeCron = (cronExp: string): string => {
    const template = CRON_TEMPLATES.find(tmpl => tmpl.expression === cronExp);
    if (template) {
      return template.name;
    }

    const parts = cronExp.split(' ');
    if (parts.length !== 5) {
      return t('pages.taskManager.cronBuilder.invalidExpression');
    }

    const [m, h, d, mn, dow] = parts;
    const descParts: string[] = [];
    
    // 开始词
    descParts.push(t('pages.taskManager.cronBuilder.description.at'));

    // 月份
    if (mn !== '*') {
      if (mn.includes(',')) {
        const months = mn.split(',').join(', ');
        descParts.push(t('pages.taskManager.cronBuilder.description.monthOf', { months }));
      } else if (mn.includes('-')) {
        const [start, end] = mn.split('-');
        descParts.push(t('pages.taskManager.cronBuilder.description.monthRange', { start, end }));
      } else {
        descParts.push(t('pages.taskManager.cronBuilder.description.monthOf', { months: mn }));
      }
    }

    // 日期和星期
    if (d !== '*' && dow !== '*') {
      let weekday = '';
      if (dow === '1-5') weekday = t('pages.taskManager.cronBuilder.weekdays.weekdays');
      else if (dow === '0,6') weekday = t('pages.taskManager.cronBuilder.weekdays.weekend');
      else weekday = `${t('pages.taskManager.cronBuilder.dayOfWeek')} ${dow}`;
      descParts.push(t('pages.taskManager.cronBuilder.description.dayAndWeek', { day: d, weekday }));
    } else if (d !== '*') {
      descParts.push(t('pages.taskManager.cronBuilder.description.dayOf', { day: d }));
    } else if (dow !== '*') {
      if (dow === '1-5') {
        descParts.push(t('pages.taskManager.cronBuilder.weekdays.weekdays'));
      } else if (dow === '0,6') {
        descParts.push(t('pages.taskManager.cronBuilder.weekdays.weekend'));
      } else {
        descParts.push(`${t('pages.taskManager.cronBuilder.dayOfWeek')} ${dow}`);
      }
    }

    // 时间
    if (h !== '*' && m !== '*') {
      descParts.push(t('pages.taskManager.cronBuilder.description.atTime', { 
        hour: h, 
        minute: m.padStart(2, '0') 
      }));
    } else if (h !== '*') {
      descParts.push(t('pages.taskManager.cronBuilder.description.atHour', { hour: h }));
    } else if (m !== '*') {
      descParts.push(t('pages.taskManager.cronBuilder.description.atMinute', { minute: m }));
    }

    // 结束词
    descParts.push(t('pages.taskManager.cronBuilder.description.execute'));
    
    return descParts.join(' ');
  };

  return (
    <div className="cron-builder">
      {/* 自然语言描述 */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#374151',
          fontWeight: 500,
          marginBottom: '8px'
        }}>
          {t('pages.taskManager.cronBuilder.currentSchedule')}
        </div>
        <div style={{
          fontSize: '16px',
          color: '#1a1a1a',
          lineHeight: '1.5'
        }}>
          {describeCron(value)}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '8px',
          fontFamily: 'monospace',
          backgroundColor: '#f8fafc',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          {value}
        </div>
      </div>

      {/* 快速模板 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          marginBottom: '12px'
        }}>
          {t('pages.taskManager.cronBuilder.quickSelect')}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px'
        }}>
          {CRON_TEMPLATES.map(template => (
            <button
              key={template.name}
              onClick={() => handleTemplateSelect(template)}
              style={{
                padding: '10px 12px',
                border: value === template.expression ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: value === template.expression ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: value === template.expression ? 500 : 400,
                color: value === template.expression ? '#1d4ed8' : '#374151',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (value !== template.expression) {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== template.expression) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '2px' }}>
                {template.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: value === template.expression ? '#60a5fa' : '#6b7280',
                lineHeight: '1.3'
              }}>
                {template.description}
              </div>
            </button>
          ))}

          <button
            onClick={() => setCustomMode(!customMode)}
            style={{
              padding: '10px 12px',
              border: customMode ? '2px solid #7c3aed' : '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: customMode ? '#faf5ff' : '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: customMode ? 500 : 400,
              color: customMode ? '#7c3aed' : '#374151',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!customMode) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (!customMode) {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: '2px' }}>
              {t('pages.taskManager.cronBuilder.custom')}
            </div>
            <div style={{
              fontSize: '11px',
              color: customMode ? '#a855f7' : '#6b7280',
              lineHeight: '1.3'
            }}>
              {t('pages.taskManager.cronBuilder.customDescription')}
            </div>
          </button>
        </div>
      </div>

      {customMode && (
        <div style={{
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '16px'
          }}>
            {t('pages.taskManager.cronBuilder.customSettings')}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 500,
                marginBottom: '6px'
              }}>
                {t('pages.taskManager.cronBuilder.minute')}
              </div>
              <Select
                value={minute}
                onChange={(val) => handleFieldChange('minute', val)}
                style={{
                  width: '100%',
                  borderRadius: '8px'
                }}
                disabled={disabled}
              >
                <Option value="*">{t('pages.taskManager.cronBuilder.everyMinute')}</Option>
                {generateOptions(0, 59)}
              </Select>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 500,
                marginBottom: '6px'
              }}>
                {t('pages.taskManager.cronBuilder.hour')}
              </div>
              <Select
                value={hour}
                onChange={(val) => handleFieldChange('hour', val)}
                style={{
                  width: '100%',
                  borderRadius: '8px'
                }}
                disabled={disabled}
              >
                <Option value="*">{t('pages.taskManager.cronBuilder.everyHour')}</Option>
                {generateOptions(0, 23)}
              </Select>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 500,
                marginBottom: '6px'
              }}>
                {t('pages.taskManager.cronBuilder.day')}
              </div>
              <Select
                value={day}
                onChange={(val) => handleFieldChange('day', val)}
                style={{
                  width: '100%',
                  borderRadius: '8px'
                }}
                disabled={disabled}
              >
                <Option value="*">{t('pages.taskManager.cronBuilder.everyDay')}</Option>
                {generateOptions(1, 31)}
              </Select>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 500,
                marginBottom: '6px'
              }}>
                {t('pages.taskManager.cronBuilder.month')}
              </div>
              <Select
                value={month}
                onChange={(val) => handleFieldChange('month', val)}
                style={{
                  width: '100%',
                  borderRadius: '8px'
                }}
                disabled={disabled}
              >
                {monthOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 500,
                marginBottom: '6px'
              }}>
                {t('pages.taskManager.cronBuilder.dayOfWeek')}
              </div>
              <Select
                value={dayOfWeek}
                onChange={(val) => handleFieldChange('dayOfWeek', val)}
                style={{
                  width: '100%',
                  borderRadius: '8px'
                }}
                disabled={disabled}
              >
                {dayOfWeekOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          {/* 实时预览 */}
          <div style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#374151'
          }}>
            <span style={{ fontWeight: 500, color: '#6b7280' }}>{t('pages.taskManager.cronBuilder.preview')}: </span>
            {describeCron(buildCronExpression())}
          </div>
        </div>
      )}

      {/* 手动输入 */}
      <div style={{
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          marginBottom: '8px'
        }}>
          {t('pages.taskManager.cronBuilder.directInput')}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={t('pages.taskManager.cronBuilder.directInputPlaceholder')}
          style={{
            fontFamily: 'monospace',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '8px 12px'
          }}
        />
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          marginTop: '6px',
          lineHeight: '1.4'
        }}>
          {t('pages.taskManager.cronBuilder.formatHelp')}
        </div>
      </div>
    </div>
  );
};

export default CronBuilder;