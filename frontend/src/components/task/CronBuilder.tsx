import React, { useState, useEffect } from 'react';
import { Select, Input } from 'antd';
import { CronTemplate } from '../../types/task';

const { Option } = Select;

interface CronBuilderProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

// 预设的cron模板
const CRON_TEMPLATES: CronTemplate[] = [
  { name: '每小时', description: '', expression: '0 * * * *' },
  { name: '每天上午9点', description: '', expression: '0 9 * * *' },
  { name: '每周一上午9点', description: '', expression: '0 9 * * 1' },
  { name: '每月1号上午9点', description: '', expression: '0 9 1 * *' },
  { name: '工作日上午9点', description: '', expression: '0 9 * * 1-5' },
  { name: '每天每小时的15分和45分', description: '', expression: '15,45 * * * *' }
];

const CronBuilder: React.FC<CronBuilderProps> = ({
  value = '0 9 * * *',
  onChange,
  disabled = false
}) => {
  const [minute, setMinute] = useState<string>('0');
  const [hour, setHour] = useState<string>('9');
  const [day, setDay] = useState<string>('*');
  const [month, setMonth] = useState<string>('*');
  const [dayOfWeek, setDayOfWeek] = useState<string>('*');
  const [customMode, setCustomMode] = useState<boolean>(false);

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
    { value: '*', label: '每天' },
    { value: '0', label: '周日' },
    { value: '1', label: '周一' },
    { value: '2', label: '周二' },
    { value: '3', label: '周三' },
    { value: '4', label: '周四' },
    { value: '5', label: '周五' },
    { value: '6', label: '周六' },
    { value: '1-5', label: '工作日' },
    { value: '0,6', label: '周末' }
  ];

  // 月份选项
  const monthOptions = [
    { value: '*', label: '每月' },
    { value: '1', label: '1月' },
    { value: '2', label: '2月' },
    { value: '3', label: '3月' },
    { value: '4', label: '4月' },
    { value: '5', label: '5月' },
    { value: '6', label: '6月' },
    { value: '7', label: '7月' },
    { value: '8', label: '8月' },
    { value: '9', label: '9月' },
    { value: '10', label: '10月' },
    { value: '11', label: '11月' },
    { value: '12', label: '12月' }
  ];

  // 解析并描述cron表达式
  const describeCron = (cronExp: string): string => {
    const template = CRON_TEMPLATES.find(t => t.expression === cronExp);
    if (template) {
      return template.description;
    }

    const parts = cronExp.split(' ');
    if (parts.length !== 5) {
      return '无效的cron表达式';
    }

    const [m, h, d, mn, dow] = parts;
    let description = '在';

    // 月份
    if (mn !== '*') {
      if (mn.includes(',')) {
        description += `${mn.split(',').join('、')}月的`;
      } else if (mn.includes('-')) {
        const [start, end] = mn.split('-');
        description += `${start}-${end}月的`;
      } else {
        description += `${mn}月的`;
      }
    }

    // 日期和星期
    if (d !== '*' && dow !== '*') {
      description += `第${d}天且是`;
      if (dow === '1-5') description += '工作日';
      else if (dow === '0,6') description += '周末';
      else description += `周${dow}`;
    } else if (d !== '*') {
      description += `第${d}天`;
    } else if (dow !== '*') {
      if (dow === '1-5') description += '工作日';
      else if (dow === '0,6') description += '周末';
      else description += `周${dow}`;
    }

    // 时间
    if (h !== '*' && m !== '*') {
      description += `的${h}:${m.padStart(2, '0')}`;
    } else if (h !== '*') {
      description += `的${h}点整`;
    } else if (m !== '*') {
      description += `的第${m}分钟`;
    }

    description += '执行';
    return description;
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
          当前计划
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
          快速选择
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
              自定义
            </div>
            <div style={{
              fontSize: '11px',
              color: customMode ? '#a855f7' : '#6b7280',
              lineHeight: '1.3'
            }}>
              自定义时间表达式
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
            自定义设置
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
                分钟
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
                <Option value="*">每分钟</Option>
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
                小时
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
                <Option value="*">每小时</Option>
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
                日期
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
                <Option value="*">每天</Option>
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
                月份
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
                星期
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
            <span style={{ fontWeight: 500, color: '#6b7280' }}>预览：</span>
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
          直接输入 Cron 表达式
        </div>
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder="分 时 日 月 周 (例: 0 9 * * *)"
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
          格式：分钟(0-59) 小时(0-23) 日期(1-31) 月份(1-12) 星期(0-7)
        </div>
      </div>
    </div>
  );
};

export default CronBuilder;