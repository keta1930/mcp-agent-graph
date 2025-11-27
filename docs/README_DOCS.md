# MAG Documentation

Welcome to the MAG (Multi-Agent Graph) documentation source files.

## Quick Start

### View Documentation Locally

```bash
# Run the helper script
./serve-docs.sh

# Or run mkdocs directly
mkdocs serve
```

Open your browser at `http://127.0.0.1:8000`

### Build Static Site

```bash
mkdocs build
```

The built site will be in the `site/` directory.

## Structure

- `index.md` - Homepage
- `first-steps/` - Getting started guides
- `core-components/` - Component documentation
- `roadmap/` - Future plans
- `stylesheets/` - Custom CSS (earth-tone theme)
- `javascripts/` - Additional scripts
- `assets/` - Images and static files

## Writing Documentation

All files are in Markdown format with additional features:

- Code blocks with syntax highlighting
- Admonitions (notes, warnings, tips)
- Mermaid diagrams
- Tabbed content
- Task lists
- Math equations (MathJax)

See `../DOCS_SETUP.md` for detailed writing guide.

## Deployment

Documentation automatically deploys to GitHub Pages when you push changes to the master/main branch.

Manual deployment:
```bash
mkdocs gh-deploy
```

## Resources

- Full setup guide: `../DOCS_SETUP.md`
- Summary: `../DOCUMENTATION_SUMMARY.md`
- Style guide: `../frontend/STYLE_GUIDE.md`

---

For questions or issues, please refer to the setup documentation or contact the development team.
