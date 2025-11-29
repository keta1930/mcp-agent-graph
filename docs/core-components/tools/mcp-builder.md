# MCP Builder

Enable Agents to design and create custom MCP tool servers through guided development using the FastMCP framework.

## Core Capabilities

MCP Builder provides complete MCP server development through AI collaboration:

| Capability | Benefit | Example |
|------------|---------|---------|
| **Requirements Gathering** | Agent asks clarifying questions to understand tool needs | User says "weather API tool" → Agent asks about data sources, API keys, features |
| **Development Guidance** | Provides complete FastMCP specification with examples and best practices | Learn how to use FastMCP decorators, define tools, handle errors |
| **Configuration as Files** | Tool designs are Markdown files with structured XML tags | `mcp/weather_api.md` created with `<folder_name>`, `<script_file>`, `<dependencies>` tags |
| **Automatic Setup** | Parses design and creates tool folder, installs dependencies, configures virtual environment | From document → working MCP server ready to use |
| **Iterative Refinement** | Modify designs based on feedback until satisfied | Draft → User feedback → Adjustment → Repeat until perfect |

## Why Use MCP Builder

- Natural language conversation to design tools
- Agent asks questions to understand requirements
- Provides FastMCP specification with templates
- Automatic tool creation, dependency installation, registration
- Iterative improvement based on feedback

**Collaboration Pattern:**

1. User states need in natural language
2. Agent asks clarifying questions (API sources, features, requirements)
3. Gets FastMCP specification to understand framework
4. Designs tool code and configuration
5. Creates Markdown file with structured XML tags
6. User provides feedback, Agent adjusts design
7. Repeat until user approves
8. Registers tool - automatic setup and configuration

## Available Operations

| Operation | Purpose | When to Use |
|-----------|---------|-------------|
| `get_mcp_spec` | Get complete FastMCP development specification | Starting new MCP tool design to understand framework |
| `register_mcp` | Parse tool document and register to system | After user approves final design |

**Note:** MCP Builder works with File Tool to create/edit tool configuration documents.

## Common Workflows

### Creating New MCP Tool

| Stage | Action | Details |
|-------|--------|---------|
| 1. Requirements | Agent asks questions | "What data/services to access?", "Need API keys?", "Input/output format?" |
| 2. Specification | Get development guide | `get_mcp_spec` retrieves FastMCP examples, templates, XML tag explanations |
| 3. Design | Draft tool code | Agent designs tool functions, parameters, error handling using FastMCP |
| 4. Document | Create structured file | `create_file("mcp/weather.md", ...)` with `<folder_name>`, `<script_file>`, `<dependencies>`, `<readme>` tags |
| 5. Review | User examines design | Agent explains implementation, user provides feedback |
| 6. Refine | Iterate on feedback | User: "Add caching" → Agent updates with `update_file` |
| 7. Register | Setup and activate | `register_mcp("mcp/weather.md")` → Creates folder, installs packages, registers server |

### Optimizing Existing Tool

| Stage | Action | Details |
|-------|--------|---------|
| 1. Export | Get current config | User or Agent reads existing tool document from `mcp/` directory |
| 2. Review | User identifies changes | "Add retry logic", "Support more data formats" |
| 3. Modify | Update code | Agent edits Markdown file using `update_file` or `rewrite_file` |
| 4. Refine | Iterate until satisfied | Multiple rounds of user feedback and adjustments |
| 5. Update | Re-register | `register_mcp("mcp/tool_name.md")` → Updates tool with new version |

## Human-AI Collaboration

### Agent Responsibilities

- Ask clarifying questions before designing
- Explain FastMCP concepts clearly
- Present draft for review before registering
- Listen to feedback and adjust accordingly
- Ensure user satisfaction before finalizing

## Integration with Other Tools

**+ File Tool:** MCP tool configs are Markdown files managed with file operations
- `create_file` to create initial design
- `read_file` to review current config
- `update_file` for targeted changes (small tweaks)
- `rewrite_file` for major revisions (restructuring)

**+ System Operations:** After creation, tools are available system-wide
- `list_all_mcps` to see registered tools
- `get_mcp_details` to view tool information

## Best Use Cases

**Good For:**
- Connecting to external APIs (weather, news, databases)
- Custom data processing tools
- Domain-specific integrations
- Extending Agent capabilities with specialized functions

## Related Documentation

- [File Tool](file-tool.md) - Manage MCP tool configuration files
- [MCP Concepts](../mcp/index.md) - Understanding MCP protocol
- [System Operations](system-operations.md) - Managing registered tools
