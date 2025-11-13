import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Radio,
  Button,
  message,
  Typography
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { TaskCreate, ScheduleType } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';
import CronBuilder from './CronBuilder';
import * as graphService from '../../services/graphService';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface TaskCreateFormProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: (taskId?: string) => void;
}

interface GraphOption {
  name: string;
  description?: string;
}

const TaskCreateForm: React.FC<TaskCreateFormProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [graphs, setGraphs] = useState<GraphOption[]>([]);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(ScheduleType.SINGLE);
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [executeAt, setExecuteAt] = useState<Dayjs | null>(null);

  const { createTask } = useTaskStore();

  // 加载图列表
  useEffect(() => {
    const loadGraphs = async () => {
      try {
        const graphNames = await graphService.getGraphs();
        if (Array.isArray(graphNames)) {
          setGraphs(graphNames.map((name: string) => ({
            name,
            description: ''
          })));
        }
      } catch (error) {
        console.error('Failed to load graphs:', error);
      }
    };

    if (visible) {
      loadGraphs();
    }
  }, [visible]);

  // 重置表单
  const resetForm = () => {
    form.resetFields();
    setScheduleType(ScheduleType.SINGLE);
    setCronExpression('0 9 * * *');
    setExecuteAt(null);
  };

  // 表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const taskData: TaskCreate = {
        task_name: values.task_name,
        graph_name: values.graph_name,
        input_text: values.input_text || '',
        execution_count: values.execution_count ?? 1,
        schedule_type: scheduleType,
        schedule_config: {
          ...(scheduleType === ScheduleType.SINGLE && executeAt
            ? { execute_at: executeAt.format('YYYY-MM-DDTHH:mm:ss') }
            : {}),
          ...(scheduleType === ScheduleType.RECURRING
            ? { cron_expression: cronExpression }
            : {})
        }
      };

      const result = await createTask(taskData);

      if (result.success) {
        message.success(result.message || '任务创建成功');
        resetForm();
        onSuccess?.(result.taskId);
        onCancel();
      } else {
        message.error(result.message || '创建任务失败');
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 禁用过去的时间
  const disabledDate = (current: Dayjs) => {
    return current && current.isBefore(dayjs(), 'minute');
  };

  // 获取下次执行时间预览
  const getNextExecutionPreview = () => {
    if (scheduleType === ScheduleType.SINGLE && executeAt) {
      return `将在 ${executeAt.format('YYYY-MM-DD HH:mm:ss')} 执行一次`;
    } else if (scheduleType === ScheduleType.RECURRING && cronExpression) {
      return `按照 cron 表达式 "${cronExpression}" 周期执行`;
    }
    return null;
  };

  return (
    <Drawer
      title={
        <div>
          <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#2d2d2d' }}>
            创建新任务
          </Title>
          <Text style={{ fontSize: '13px', color: 'rgba(45, 45, 45, 0.65)' }}>
            设置图的执行计划和调度配置
          </Text>
        </div>
      }
      open={visible}
      onClose={() => {
        resetForm();
        onCancel();
      }}
      width={640}
      destroyOnClose
      styles={{
        header: {
          borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
          padding: '20px 24px',
          background: 'rgba(250, 248, 245, 0.6)'
        },
        body: {
          padding: 0,
          backgroundColor: '#faf8f5'
        }
      }}
      footer={
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          borderTop: '1px solid rgba(139, 115, 85, 0.15)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)'
        }}>
          <Button
            onClick={() => {
              resetForm();
              onCancel();
            }}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              color: 'rgba(45, 45, 45, 0.65)',
              height: '40px',
              padding: '8px 16px',
              fontSize: '14px',
              background: 'transparent',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
            }}
          >
            取消
          </Button>
          <Button
            loading={loading}
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              height: '40px',
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            创建任务
          </Button>
        </div>
      }
    >
      <div style={{ padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            execution_count: 1
          }}
        >
        <Form.Item
          label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>任务名称</span>}
          name="task_name"
          rules={[
            { required: true, message: '请输入任务名称' },
            { max: 100, message: '任务名称不能超过100个字符' }
          ]}
          style={{ marginBottom: '24px' }}
        >
          <Input
            placeholder="为您的任务起个名字"
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              fontSize: '14px',
              padding: '10px 14px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
              transition: 'all 0.3s ease'
            }}
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>选择图</span>}
          name="graph_name"
          rules={[{ required: true, message: '请选择要执行的图' }]}
          style={{ marginBottom: '24px' }}
        >
          <Select
            placeholder="选择要执行的图"
            showSearch
            optionFilterProp="label"
            style={{
              borderRadius: '6px',
              height: '40px'
            }}
          >
            {graphs.map(graph => (
              <Option key={graph.name} value={graph.name} label={graph.name}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '14px', color: '#2d2d2d' }}>{graph.name}</div>
                  {graph.description && (
                    <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
                      {graph.description}
                    </div>
                  )}
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>输入文本</span>}
          name="input_text"
          rules={[{ max: 1000, message: '输入文本不能超过1000个字符' }]}
          style={{ marginBottom: '24px' }}
        >
          <TextArea
            placeholder="输入图执行时的文本内容（可选）"
            rows={4}
            showCount
            maxLength={1000}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              fontSize: '14px',
              resize: 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
              transition: 'all 0.3s ease'
            }}
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>并发执行数量</span>}
          name="execution_count"
          rules={[
            { required: true, message: '请设置并发执行数量' },
            { type: 'number', min: 1, message: '执行数量至少为1' }
          ]}
          style={{ marginBottom: '32px' }}
        >
          <InputNumber
            min={1}
            placeholder="每次触发时并发执行的图实例数量"
            style={{
              width: '100%',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              height: '40px',
              fontSize: '14px',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
            }}
          />
        </Form.Item>

        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.2) 50%, transparent)',
          margin: '32px 0'
        }} />

        <Form.Item
          label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>调度类型</span>}
          style={{ marginBottom: '24px' }}
        >
          <Radio.Group
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
              <Radio value={ScheduleType.SINGLE} style={{ fontSize: '14px', color: '#2d2d2d' }}>
                <div>
                  <div style={{ fontWeight: 500, color: '#2d2d2d' }}>单次任务</div>
                  <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>在指定时间执行一次</div>
                </div>
              </Radio>
              <Radio value={ScheduleType.RECURRING} style={{ fontSize: '14px', color: '#2d2d2d' }}>
                <div>
                  <div style={{ fontWeight: 500, color: '#2d2d2d' }}>周期任务</div>
                  <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>按照设定的时间间隔重复执行</div>
                </div>
              </Radio>
            </div>
          </Radio.Group>
        </Form.Item>

        {scheduleType === ScheduleType.SINGLE && (
          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>执行时间</span>}
            rules={[{ required: true, message: '请选择执行时间' }]}
            style={{ marginBottom: '24px' }}
          >
            <DatePicker
              showTime
              value={executeAt}
              onChange={setExecuteAt}
              disabledDate={disabledDate}
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择任务执行时间"
              style={{
                width: '100%',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                height: '40px',
                fontSize: '14px',
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
              }}
            />
          </Form.Item>
        )}

        {scheduleType === ScheduleType.RECURRING && (
          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>周期配置</span>}
            style={{ marginBottom: '24px' }}
          >
            <div style={{
              padding: '4px',
              borderRadius: '8px'
            }}>
              <CronBuilder
                value={cronExpression}
                onChange={setCronExpression}
              />
            </div>
          </Form.Item>
        )}

        {getNextExecutionPreview() && (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(160, 130, 109, 0.08)',
            border: '1px solid rgba(160, 130, 109, 0.2)',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '13px',
              color: '#8b7355',
              fontWeight: 500
            }}>
              📅 执行预览
            </div>
            <div style={{
              fontSize: '14px',
              color: '#2d2d2d',
              marginTop: '4px'
            }}>
              {getNextExecutionPreview()}
            </div>
          </div>
        )}
      </Form>
      </div>
    </Drawer>
  );
};

export default TaskCreateForm;