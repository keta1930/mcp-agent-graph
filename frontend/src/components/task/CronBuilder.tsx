import React, { useState, useEffect } from 'react';
import { Select, Input, Space, Tag, Divider } from 'antd';
import { CronTemplate } from '../../types/task';

const { Option } = Select;

interface CronBuilderProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

// 预设的cron模板
const CRON_TEMPLATES: CronTemplate[] = [
  { name: '每分钟', description: '每分钟执行一次', expression: '* * * * *' },
  { name: '每小时', description: '每小时的第0分钟执行', expression: '0 * * * *' },
  { name: '每天上午9点', description: '每天上午9:00执行', expression: '0 9 * * *' },
  { name: '每天下午6点', description: '每天下午18:00执行', expression: '0 18 * * *' },
  { name: '每周一上午9点', description: '每周一上午9:00执行', expression: '0 9 * * 1' },
  { name: '每月1号上午9点', description: '每月1号上午9:00执行', expression: '0 9 1 * *' },
  { name: '工作日上午9点', description: '周一到周五上午9:00执行', expression: '0 9 * * 1-5' },
  { name: '每天每小时的15分和45分', description: '每小时的第15分钟和第45分钟执行', expression: '15,45 * * * *' }
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>快速选择模板：</div>
        <Space wrap>
          {CRON_TEMPLATES.map(template => (
            <Tag.CheckableTag
              key={template.name}
              checked={value === template.expression}
              onChange={() => handleTemplateSelect(template)}
              style={{ cursor: 'pointer' }}
            >
              {template.name}
            </Tag.CheckableTag>
          ))}
          <Tag.CheckableTag
            checked={customMode}
            onChange={() => setCustomMode(!customMode)}
            style={{ cursor: 'pointer', color: '#1890ff', borderColor: '#1890ff' }}
          >
            自定义
          </Tag.CheckableTag>
        </Space>
      </div>

      {customMode && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>自定义设置：</div>
            <Space wrap>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>分钟</div>
                <Select
                  value={minute}
                  onChange={(val) => handleFieldChange('minute', val)}
                  style={{ width: 80 }}
                  disabled={disabled}
                >
                  <Option value="*">每分钟</Option>
                  {generateOptions(0, 59)}
                </Select>
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>小时</div>
                <Select
                  value={hour}
                  onChange={(val) => handleFieldChange('hour', val)}
                  style={{ width: 80 }}
                  disabled={disabled}
                >
                  <Option value="*">每小时</Option>
                  {generateOptions(0, 23)}
                </Select>
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>日期</div>
                <Select
                  value={day}
                  onChange={(val) => handleFieldChange('day', val)}
                  style={{ width: 80 }}
                  disabled={disabled}
                >
                  <Option value="*">每天</Option>
                  {generateOptions(1, 31)}
                </Select>
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>月份</div>
                <Select
                  value={month}
                  onChange={(val) => handleFieldChange('month', val)}
                  style={{ width: 80 }}
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
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>星期</div>
                <Select
                  value={dayOfWeek}
                  onChange={(val) => handleFieldChange('dayOfWeek', val)}
                  style={{ width: 100 }}
                  disabled={disabled}
                >
                  {dayOfWeekOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </Space>
          </div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>Cron表达式：</span>
          <Input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            style={{ width: 150, marginLeft: 8 }}
            disabled={disabled}
            placeholder="分 时 日 月 周"
          />
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <strong>说明：</strong> {describeCron(value)}
        </div>
      </div>
    </div>
  );
};

export default CronBuilder;