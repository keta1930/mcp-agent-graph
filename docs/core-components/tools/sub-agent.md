# Sub-agent

Enable agents to automatically decompose complex tasks and delegate them to specialized agents for processing.

**Execution Flow:**

1. Receive complex request
2. Automatically decompose into specialized subtasks
3. Assign task ID and designate expert for each subtask
4. Experts complete work in isolated environments, delivering results through files
5. Aggregate all results and return

## Key Features

### Isolated Execution Environment

Each subagent executes subtasks in an isolated environment:
- Different tasks don't interfere with each other, maintaining focus
- Experts only handle work in their domain
- Coordinating agent maintains a clear global perspective

### Task History Tracking

Task IDs enable complete execution tracking:
- Same ID = Continue previous task, retaining all history
- Different ID = Start fresh task
- Supports iterative optimization and multi-round improvements

### Expert Collaboration Mechanism

Multiple experts collaborate on demand:
- Each expert equipped with specialized capabilities and tools
- Work results passed through files
- Clear division of labor, efficient collaboration

## Application Examples

### Code Review Workflow

| Stage | Executor | Work Content |
|-------|----------|--------------|
| 1. Initial Review | Code Reviewer | Check code quality, output review report |
| 2. Fix | Developer Agent | Fix issues based on report, record modifications |
| 3. Re-review | Code Reviewer (same task ID) | Verify fixes, confirm or provide new suggestions |

### Research Analysis Workflow

| Stage | Executor | Work Content |
|-------|----------|--------------|
| 1. Research | Research Agent | Collect relevant information and materials |
| 2. Analysis | Data Analyst | Analyze research results, extract key information |
| 3. Report | Writing Agent | Organize analysis results, generate professional report |

### Iterative Optimization Workflow

| Round | Executor | Task ID | Work Content |
|-------|----------|---------|--------------|
| 1 | Writing Agent | `doc-v1` | Create initial draft |
| 2 | Writing Agent | `doc-v1` | Revise based on feedback (retain draft context) |
| 3 | Writing Agent | `doc-v1` | Final polish (includes all history) |

## Using with File Tools

Sub-agent works with file tools to enable efficient collaboration:

**Output Results:**
Experts save results to files after completing work (e.g., `analysis_report.md`)

**Information Transfer:**
Next expert reads files to obtain previous work results

**Collaboration Flow:**
Expert A outputs file → Expert B reads and processes → Expert B outputs new file

**Advantages:**
- Work results clearly visible
- Complete version history
- Easy to trace and review

## Configuration Recommendations

For best results, recommend:

| Configuration | Recommendation |
|---------------|----------------|
| **Agent Instructions** | Clearly define domain expertise and scope of responsibilities |
| **Tool Configuration** | Equip with file tools and domain-specific tools |
| **Naming Conventions** | Use clear names and labels for easy identification |
| **Execution Limits** | Set `max_actions` reasonably based on task complexity |

## Related Documentation

- [File Tools](file-tool.md) - Enable work handoff between experts
- [Agent Configuration](../agent/config.md) - Configure expert capabilities
- [Multi-Agent Systems](../agent/multi-agent.md) - Coordination patterns
