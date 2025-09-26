import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Radio,
  Space,
  Button,
  message,
  Divider
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { TaskCreate, ScheduleType } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';
import CronBuilder from './CronBuilder';
import * as graphService from '../../services/graphService';

const { Option } = Select;
const { TextArea } = Input;

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
        execution_count: values.execution_count || 1,
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
    <Modal
      title="创建新任务"
      open={visible}
      onCancel={() => {
        resetForm();
        onCancel();
      }}
      footer={[
        <Button key="cancel" onClick={() => {
          resetForm();
          onCancel();
        }}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          创建任务
        </Button>
      ]}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          execution_count: 1
        }}
      >
        <Form.Item
          label="任务名称"
          name="task_name"
          rules={[
            { required: true, message: '请输入任务名称' },
            { max: 100, message: '任务名称不能超过100个字符' }
          ]}
        >
          <Input placeholder="请输入任务名称" />
        </Form.Item>

        <Form.Item
          label="选择图"
          name="graph_name"
          rules={[{ required: true, message: '请选择要执行的图' }]}
        >
          <Select
            placeholder="请选择要执行的图"
            showSearch
            optionFilterProp="label"
          >
            {graphs.map(graph => (
              <Option key={graph.name} value={graph.name} label={graph.name}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{graph.name}</div>
                  {graph.description && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {graph.description}
                    </div>
                  )}
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="输入文本"
          name="input_text"
          rules={[{ max: 1000, message: '输入文本不能超过1000个字符' }]}
        >
          <TextArea
            placeholder="请输入图的输入文本（可选）"
            rows={3}
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          label="并发执行数量"
          name="execution_count"
          rules={[
            { required: true, message: '请设置并发执行数量' },
            { min: 1, message: '执行数量至少为1' },
            { max: 10, message: '执行数量不能超过10' }
          ]}
        >
          <InputNumber
            min={1}
            max={10}
            placeholder="每次触发时并发执行的图实例数量"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Divider />

        <Form.Item label="调度类型">
          <Radio.Group
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
          >
            <Radio value={ScheduleType.SINGLE}>单次任务</Radio>
            <Radio value={ScheduleType.RECURRING}>周期任务</Radio>
          </Radio.Group>
        </Form.Item>

        {scheduleType === ScheduleType.SINGLE && (
          <Form.Item
            label="执行时间"
            rules={[{ required: true, message: '请选择执行时间' }]}
          >
            <DatePicker
              showTime
              value={executeAt}
              onChange={setExecuteAt}
              disabledDate={disabledDate}
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择任务执行时间"
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        {scheduleType === ScheduleType.RECURRING && (
          <Form.Item label="周期配置">
            <CronBuilder
              value={cronExpression}
              onChange={setCronExpression}
            />
          </Form.Item>
        )}

        {getNextExecutionPreview() && (
          <Form.Item>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#389e0d'
            }}>
              <strong>执行预览：</strong> {getNextExecutionPreview()}
            </div>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default TaskCreateForm;