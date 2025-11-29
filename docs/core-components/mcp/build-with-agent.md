# Build MCP with Agent

Create custom MCP servers through AI-guided development using the built-in **MCP Builder** tool.

## What is MCP Builder

MCP Builder enables agents to design and develop FastMCP-based servers through natural conversation. Instead of writing code manually, you collaborate with an agent to:

- Define tool requirements through Q&A
- Get FastMCP framework guidance
- Design tool implementations
- Auto-generate server configurations
- Install and register servers automatically

## Why Build with Agent

**Quick Start**
No FastMCP expertise required. The agent provides templates, examples, and best practices.

**Guided Development**
The agent asks clarifying questions to understand your needs, then designs an appropriate solution.

**Automated Setup**
From approved design to working MCP server in one step—no manual configuration.

**Iterative Refinement**
Review drafts, provide feedback, and iterate until the tool meets your requirements.

## How It Works

1. **Tell the agent what you need**
   "I need a tool to fetch weather data from an API"

2. **Answer clarifying questions**
   The agent asks about API sources, authentication, data format, etc.

3. **Review the proposed design**
   Agent presents code structure, tool definitions, and configuration

4. **Provide feedback and iterate**
   Request changes: "Add error handling" or "Support multiple cities"

5. **Approve and register**
   Agent automatically creates the server, installs dependencies, and registers it

## Complete Documentation

For detailed information about MCP Builder capabilities, workflows, and best practices:

**→ [MCP Builder Tool Documentation](../tools/mcp-builder.md)**

This comprehensive guide covers:

- Development workflows (creating and optimizing tools)
- FastMCP best practices and patterns
- Document structure and XML tags
- Automatic registration process
- Integration with file tools
- Common use cases and examples

## Quick Example

**User:** "Create a currency converter tool using an exchange rate API"

**Agent:** "I'll help you build that. A few questions:
- Which exchange rate API? (e.g., exchangerate-api.io, fixer.io)
- Do you have an API key?
- Which currencies to support?"

**User:** "Use exchangerate-api.io, I have a key, support major currencies"

**Agent:** "I'll design a FastMCP server with a `convert_currency` tool. Let me create the specification..."

*[Agent creates `mcp/currency_converter.md` with complete code and config]*

**Agent:** "Here's the design. The tool takes base currency, target currency, and amount. It handles API errors and validates inputs. Would you like any changes?"

**User:** "Looks good, register it"

**Agent:** "Registering currency_converter..."
*[Automatic folder creation, dependency installation, MCP registration]*

**Agent:** "Done! The currency_converter server is now available in your MCP servers list."

## Next Steps

- **[MCP Builder Documentation](../tools/mcp-builder.md)** - Complete reference and workflows
- **[System Tools](../tools/index.md)** - Overview of all built-in tools
- **[MCP Inspector](inspector.md)** - Test your custom servers
