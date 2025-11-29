# Prompt Center

Centralized library for creating, organizing, and reusing prompt templates across Agents and workflows.

## What is Prompt Center

Prompt Center stores reusable prompt templates that can be referenced in Agent configurations and Graph nodes. Instead of writing prompts repeatedly, create once and reuse everywhere.

## Core Operations

| Operation | Purpose | Example |
|-----------|---------|---------|
| **Create** | Add new prompt template | Write "Code Review Template" with review criteria |
| **Edit** | Update existing template | Refine output format requirements |
| **Organize** | Group by category | `coding`, `analysis`, `writing` |
| **Import/Export** | Share or backup prompts | Export templates for team sharing |
| **Reference** | Use in configurations | `{{@code_review}}` in Agent instruction |

## Why Use Prompt Center

- Write once, reference everywhere
- Update in one place
- Organized by category
- Easy to share and backup

## Prompt Structure

Each prompt contains:

| Field | Purpose | Example |
|-------|---------|---------|
| **Name** | Unique identifier | `code_review` |
| **Category** | Organization grouping | `coding` |
| **Content** | Prompt template text | Role, task, requirements, format |

**Categories use alphanumeric format:** Letters, numbers, hyphens, underscores (e.g., `data-analysis`, `code_review`, `writing_assistant`)

## Using Prompts

### In Agent Configuration

Reference prompts in Agent instructions

### In Graph Nodes

Inject prompts into node configurations:

```json
{
  "node_id": "review",
  "agent": "reviewer",
  "prompt": "{{@code_review}}\n\nCode: {{input}}"
}
```

The system automatically replaces `{{@prompt_name}}` with the actual prompt content.

## Common Workflows

### Creating Prompts

1. Click **Create** button
2. Enter name and category
3. Write prompt content
4. Save template

### Organizing Prompts

Prompts are automatically grouped by category in the interface. Use categories to organize by:

- Domain: `coding`, `data`, `writing`
- Task type: `review`, `analysis`, `generation`
- Team: `frontend`, `backend`, `qa`

### Importing Prompts

1. Click **Import** button
2. Select text/Markdown file
3. Specify name and category
4. Confirm to add

### Sharing Prompts

1. Locate prompts to export
2. Use export function to create archive
3. Share file with team
4. Recipients import to their workspace

## Integration with Tools

**Prompt Generator Tool** helps create well-structured prompts through guided conversation:

- Get specification for prompt structure guidelines
- Design prompts with clear sections (role, task, requirements, format)
- Export existing prompts for optimization
- Register prompts with categories

See [Prompt Generator](../tools/prompt-generator.md) for collaborative prompt creation.

## Related Documents

- [Create and Edit Prompts](create-edit.md) - Detailed prompt management
- [Work with Agents](work-with-agents.md) - Using prompts in Agent configuration
- [Prompt Generator Tool](../tools/prompt-generator.md) - Collaborative prompt creation
