# MAG Documentation

This directory contains the documentation for the Multi-Agent Graph (MAG) platform.

## Documentation Structure

- **first-steps/**: Getting started guides
- **core-components/**: Detailed component documentation
  - agent/: Agent system documentation
  - graph/: Workflow graph documentation
  - model/: Model management documentation
  - memory/: Memory system documentation
  - mcp/: MCP integration documentation
  - tools/: Built-in tools documentation
  - prompt/: Prompt center documentation
  - conversation/: Conversation features documentation
  - team/: Multi-user and team documentation
- **roadmap/**: Future features and roadmap

## Building the Documentation

### Local Development

1. Install dependencies:
   ```bash
   pip install mkdocs mkdocs-material mkdocs-git-revision-date-localized-plugin mkdocs-awesome-pages-plugin pymdown-extensions
   ```

2. Serve locally:
   ```bash
   mkdocs serve
   ```

3. Open your browser at `http://127.0.0.1:8000`

### Building Static Site

```bash
mkdocs build
```

The static site will be generated in the `site/` directory.

## Style Guide

The documentation uses a custom earth-tone color palette that matches the frontend style guide:

- **Primary colors**: Earth tones (rust, clay, sand)
- **Typography**: Clean and readable with proper hierarchy
- **Code blocks**: Syntax highlighting with custom theme
- **Components**: Cards, admonitions, and custom elements

## Contributing

When adding new documentation:

1. Follow the existing structure
2. Use proper markdown formatting
3. Include code examples where appropriate
4. Add diagrams using Mermaid when helpful
5. Keep content clear and concise

## Version Management

Documentation versions are managed using `mike`. To deploy a new version:

```bash
mike deploy --push --update-aliases VERSION_NUMBER latest
mike set-default --push latest
```
