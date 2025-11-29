# Prompt Generator

Enable human-AI collaboration to create reusable, high-quality prompt templates that can be referenced across Agents and workflows.

## Why Use Prompt Generator

- Centralized prompt library
- Consistent structure and quality
- Easy reuse via placeholder references
- Iterate and improve prompts in one place

**Collaboration Pattern:**

1. User describes needed prompt template
2. Agent asks about use case, audience, expected output
3. Gets specification to understand structure guidelines
4. Designs prompt with clear sections (role, task, requirements, format)
5. Creates Markdown file for user review
6. User provides feedback, Agent refines
7. Repeat until approved
8. Registers prompt with category for organization

## Available Operations

| Operation | Purpose | When to Use |
|-----------|---------|-------------|
| `get_prompt_spec` | Get prompt design specification | Starting new prompt to learn structure guidelines |
| `export_prompt_to_document` | Export existing prompt to Markdown file | Studying successful prompts or creating variations |
| `register_prompt` | Save prompt template to system | After user approves final version |

**Note:** Prompt Generator works with File Tool to create/edit Markdown files.

## Common Workflows

### Creating New Prompt

| Stage | Action | Details |
|-------|--------|---------|
| 1. Understand | Agent asks questions | "What task will this prompt guide?", "Who's the audience?", "What output format?" |
| 2. Learn | Get specification | `get_prompt_spec` retrieves structure guidelines and quality checklist |
| 3. Design | Draft structured prompt | Create sections: Role, Task, Requirements, Output Format, Notes |
| 4. Review | Create file & discuss | `create_file("prompt/data_analysis.md", ...)` → User reviews structure |
| 5. Refine | Iterate on feedback | User: "Add examples" → Agent updates with `update_file` |
| 6. Register | Save with category | User approves → `register_prompt("prompt/data_analysis.md", category="analysis")` |

### Optimizing Existing Prompt

| Stage | Action | Details |
|-------|--------|---------|
| 1. Export | Get current content | `export_prompt_to_document("code_review")` → Creates `prompt/code_review.md` |
| 2. Review | User identifies improvements | "Make requirements more specific", "Add output examples" |
| 3. Modify | Update Markdown | Agent edits using `update_file` or `rewrite_file` |
| 4. Refine | Iterate until satisfied | Multiple rounds of feedback and adjustments |
| 5. Update | Re-register | `register_prompt("prompt/code_review.md", category="coding")` → Updates existing |

### Creating Prompt Variations

| Stage | Action | Result |
|-------|--------|--------|
| 1. Export base | `export_prompt_to_document("python_review")` | `prompt/python_review.md` |
| 2. Duplicate | `create_file("prompt/javascript_review.md")` | Copy of Python review prompt |
| 3. Customize | Modify language-specific parts | Adapt requirements, examples for JavaScript |
| 4. Register | `register_prompt("prompt/javascript_review.md", category="coding")` | New JavaScript review prompt |

## Integration with Other Tools

**+ File Tool:** Prompts are Markdown files managed with file operations
- `create_file` to create initial draft
- `read_file` to review current content
- `update_file` for targeted edits
- `rewrite_file` for major revisions

**+ Agent Creator:** Include prompts in Agent instructions
- Reference prompts in `instruction` field
- Combine with Agent-specific context

**+ Graph Designer:** Use prompts in node configurations
- Inject templates via `{{@prompt_name}}` placeholders
- Maintain consistent node behaviors

## Related Documentation

- [File Tool](file-tool.md) - Manage prompt Markdown files
- [Agent Configuration](../agent/config.md) - Use prompts in Agent instructions
- [Graph Configuration](../graph/config.md) - Reference prompts in Graph nodes
