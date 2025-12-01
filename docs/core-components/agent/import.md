# Import Agents

Batch import agent configurations with support for multiple file formats. Imports automatically validate configurations, and existing agents are updated with automatic backup.

## Supported Formats

| Format | Extensions | Use Case |
|--------|-----------|----------|
| **JSON** | `.json` | Single or few agents, easy manual editing |
| **JSONL** | `.jsonl` | Large batches, line-by-line processing |
| **Excel** | `.xlsx`, `.xls` | Non-technical users, spreadsheet editing |
| **Parquet** | `.parquet` | Data analysis scenarios, efficient storage |

## JSON Format

### Single Agent

```json
{
  "name": "code-reviewer",
  "card": "Review code quality and security",
  "model": "claude-sonnet-4.5",
  "category": "programming",
  "instruction": "Focus on code quality, security, and best practices",
  "max_actions": 30,
  "mcp": ["github"],
  "system_tools": ["code_analyzer"],
  "tags": ["code", "review"]
}
```

### Multiple Agents

```json
[
  {
    "name": "code-reviewer",
    "card": "Review code quality and security",
    "model": "claude-sonnet-4.5",
    "category": "programming"
  },
  {
    "name": "data-analyst",
    "card": "Analyze data and generate charts",
    "model": "gpt-5",
    "category": "analysis"
  }
]
```

## JSONL Format

One agent configuration per line:

```jsonl
{"name": "code-reviewer", "card": "Review code quality", "model": "claude-sonnet-4.5", "category": "programming"}
{"name": "data-analyst", "card": "Analyze data", "model": "gpt-5", "category": "analysis"}
{"name": "doc-writer", "card": "Generate technical docs", "model": "deepseek-v3", "category": "writing"}
```

## Excel Format

### Column Definitions

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| **name** | Yes | Agent name | `code-reviewer` |
| **card** | Yes | Brief description | `Review code quality` |
| **model** | Yes | Model name | `claude-sonnet-4.5` |
| **category** | Yes | Category | `programming` |
| **instruction** | No | System prompt | `Focus on code quality` |
| **max_actions** | No | Max steps | `30` |
| **mcp** | No | MCP servers (comma-separated) | `github,gitlab` |
| **system_tools** | No | System tools (comma-separated) | `code_analyzer,linter` |
| **tags** | No | Tags (comma-separated) | `code,review,quality` |

### Example Table

| name | card | model | category | instruction | max_actions | mcp | system_tools | tags |
|------|------|-------|----------|-------------|-------------|-----|--------------|------|
| code-reviewer | Review code quality | claude-sonnet-4.5 | programming | Focus on code quality | 30 | github | code_analyzer | code,review |
| data-analyst | Analyze data | gpt-5 | analysis | Data analysis expert | 50 | database | data_tools | data,analysis |

## Parquet Format

Same column definitions as Excel format, but stored in Parquet file format. List fields (`mcp`, `system_tools`, `tags`) can be:
- Comma-separated strings: `"github,gitlab"`
- Array type: `["github", "gitlab"]`

## Import Behavior

| Scenario | Handling |
|----------|----------|
| **New Agent** | Create directly |
| **Existing Agent** | Auto-backup original, then update |
| **Invalid Config** | Skip agent, continue with others |
| **Model Not Found** | Import fails with error |
| **MCP Server Not Found** | Import fails with error |

### Backup Naming

Automatic backup on update: `{original_name}_backup_{timestamp}`

**Example:** `code-reviewer` → `code-reviewer_backup_20241201_143022`

## Import Results

Statistics displayed after import:

| Metric | Description |
|--------|-------------|
| **Created** | Number of newly created agents |
| **Updated** | Number of updated agents (with backup) |
| **Failed** | Number of failed imports |

Detailed results for each agent include:
- Name
- Status (created/updated/failed)
- Error message (if failed)
- Backup name (if updated)

## Important Notes

- Files must use UTF-8 encoding
- Required fields cannot be empty
- Models and MCP servers must be configured beforehand
- Recommend exporting existing configs as backup before import
- Use JSONL or Parquet format for large files

## Next Steps

- **[Agent Configuration](config.md)** - Learn about configuration fields
- **[Build First Agent](first-agent.md)** - Create agents manually
- **[Model Management](../model/index.md)** - Configure available models
