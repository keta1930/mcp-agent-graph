# Task Manager

Let Agents help you create scheduled tasks through interactive conversation to automate workflow execution.

## Core Capabilities

Task Manager lets Agents guide you like an assistant through task creation:

| Capability | Description |
|------------|-------------|
| **Interactive Creation** | Agent asks questions to understand your needs and guides you through configuration |
| **Single Tasks** | Execute workflow once at specified time, like "Generate report on Feb 28th at 5 PM" |
| **Recurring Tasks** | Execute repeatedly on schedule, like "Analyze data every morning at 9 AM" |
| **Batch Execution** | One trigger can run multiple workflow instances concurrently |
| **Task Management** | View task list, execution history, pause or delete tasks |

## Use Cases

| Scenario | Example |
|----------|---------|
| Scheduled Reports | Generate weekly sales report every Monday morning |
| Data Analysis | Analyze previous day's user behavior data every day at midnight |
| Regular Reminders | Remind about renewals and bills on the 1st of each month |
| Batch Processing | Process data for 5 regions simultaneously every night |
| One-Time Tasks | Execute a workflow on a specific date |

## How to Use

### Conversation Flow for Creating Tasks

Just tell the Agent what you need, and it will guide you through the configuration:

```
You: "I want to automatically generate sales reports every morning at 9 AM"

Agent: "I'll help you create this task. Please tell me:
1. Which workflow should be executed?
2. What input content should be passed to the workflow?
3. How many instances need to run concurrently?"

You: "Execute the sales_report workflow, input 'Generate yesterday's sales report', 1 instance is enough"

Agent: "Got it. I'll create a recurring task:
- Task Name: Daily Sales Report
- Execute Workflow: sales_report
- Input Content: Generate yesterday's sales report
- Execution Time: Every day at 9:00 (Cron: 0 9 * * *)
- Execution Count: 1 instance

After confirmation, I'll create the task configuration and register it."
```

### What Agents Can Do for You

| Agent Action | Description |
|-------------|-------------|
| Understand Needs | Ask about task purpose, execution timing, execution content |
| Explain Concepts | Clarify difference between single and recurring tasks, explain Cron expressions |
| Create Configuration | Generate JSON format task configuration based on your needs |
| Register Task | Submit configuration to system, start scheduled execution |
| Adjust and Optimize | Modify configuration based on your feedback |

### Common Time Settings

Agents will help you set execution times. Here are some common time patterns:

| Need | Cron Expression Used by Agent |
|------|------------------------------|
| Every day at 9 AM | `0 9 * * *` |
| Every day at 2:30 PM | `30 14 * * *` |
| Every Monday at 9 AM | `0 9 * * 1` |
| 1st of every month at midnight | `0 0 1 * *` |
| Every 15 minutes | `*/15 * * * *` |
| Weekdays at 9 AM | `0 9 * * 1-5` |

## Task Management

After creating tasks, you can use the interface to:

| Action | Description |
|--------|-------------|
| View Task List | See all created tasks and their status |
| View Execution History | Understand when tasks ran and which workflows were triggered |
| Pause Task | Temporarily stop automatic execution |
| Resume Task | Restart paused tasks |
| Delete Task | Permanently remove tasks no longer needed |

## Key Points

- **Workflow Must Exist**: Ensure the workflow to execute is already created before creating the task
- **Time Cannot Be Expired**: Single task execution time must be in the future
- **Task Name Unique**: Task names of the same type cannot be duplicated
- **File Tool Required**: Agent needs file tool to create configuration files, please ensure authorization

## Related Documentation

- [Task](../graph/task.md) - Task configuration details and technical specifications
- [File Tool](file-tool.md) - Tool required for Agents to create task configuration files
