# When to Use MCP

MCP extends agent capabilities by connecting to external data sources and services that system tools cannot access.

## MCP vs Built-in Tools

| Capability | Built-in Tools | MCP Servers |
|------|---------|-----------|
| **Scope** | Platform resources only | External systems and data |
| **Setup** | List selection | Connect and configure servers |
| **Access** | Internal databases, files, agents | APIs, databases, intranet, web services |
| **Examples** | Create agents, manage memory, read conversation files | Web search, query company databases, execute code |

**Built-in tools** manage platform resources: create agents, store memory, delegate sub-agents, manage files.

**MCP servers** connect external capabilities: search the internet, access company databases, execute code, call third-party APIs.

## When to Choose MCP

### ✅ Use Cases

#### External Data Access

Access data outside the platform:

| Scenario | Example | MCP Server |
|------|------|-----------|
| **Company Internal Data** | Query employee directory, sales reports, inventory | Custom database server (intranet) |
| **Web Search** | Get latest information, research topics, fact-checking | Tavily, Brave Search, Perplexity |
| **Third-party APIs** | Stock prices | Financial data |
| **Cloud Services** | AWS resources, GitHub repositories, Google Drive files | Cloudflare Workers, GitHub server, Google Drive |

#### Code Execution

Run code in isolated environments:

| Scenario | Purpose | MCP Server |
|------|------|-----------|
| **Data Analysis** | Process datasets, generate charts | Python code executor |
| **Computation** | Complex math, simulations | Code sandbox |
| **Testing** | Validate logic, run experiments | Containerized runtime |

#### Intranet Services

Connect to internal systems:

| Scenario | Access | MCP Server |
|------|------|-----------|
| **Internal Databases** | Company CRM, ERP, analytics systems | Custom SQL/GraphQL server |
| **Intranet Tools** | Jenkins, GitLab, internal Wiki | Private API connector |
| **Legacy Systems** | Mainframe data, SOAP services | Protocol adapter |

#### Specialized Operations

Domain-specific tools:

| Domain | Operations | MCP Server |
|------|------|-----------|
| **DevOps** | Deploy services, view logs, restart containers | Kubernetes, Docker, AWS |
| **Content Management** | Publish articles, manage assets | WordPress, Contentful |
| **Communication** | Send emails, post to Slack, schedule meetings | SMTP, Slack, Google Calendar |

### ❌ Not Suitable

Use built-in tools for the following:

| Task | Use Tool | Reason |
|------|---------|------|
| Create new agents | **Agent Creator** tool | Built-in, no setup required |
| Store user preferences | **Memory Tool** | Integrated with platform |
| Read/edit conversation files | **File Tool** | Direct file access |
| Call other agents | **Sub-agent** tool | Optimized for agent collaboration |
| Query available models | **System Operations** | Platform metadata access |

## Next Steps

- **[Add First Server](first-server.md)** - Connect an MCP server
- **[MCP Inspector](inspector.md)** - Test server tools
- **[Build with Agent](build-with-agent.md)** - Create custom servers
- **[Built-in Tools](../tools/index.md)** - Explore platform tools
