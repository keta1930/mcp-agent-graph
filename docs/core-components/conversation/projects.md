# Projects

A **Project** is a collection that organizes multiple conversations with shared resources. Think of it as a workspace where related conversations can access common files and follow unified instructions.

## Core Features

### Conversation Organization

Group related conversations into a single project:

- **Logical grouping** - Keep conversations about the same topic or task together
- **Easy navigation** - Find related conversations in one place
- **Context preservation** - Maintain project-level context across multiple conversations

### Shared File Access

Files uploaded to a project are accessible by all conversations within it:

- **Cross-conversation sharing** - Upload once, use in multiple conversations
- **File inheritance** - Conversations automatically access project files
- **One-way push** - Push conversation files to project for sharing with other conversations

### Project Instructions

Define project-level instructions that apply to all conversations:

- **Unified behavior** - Set consistent agent behavior across all project conversations
- **Instruction inheritance** - Agent receives both its own instruction and project instruction
- **Context enrichment** - Provide domain-specific knowledge or guidelines

## How It Works

### File Hierarchy

When an agent needs a file, it follows this lookup order:

```
1. Conversation-level files (specific to this conversation)
2. Project-level files (shared across all conversations in the project)
```

This ensures conversation-specific files take priority while project files serve as fallback.

### Instruction Composition

When an agent runs in a project conversation, instructions are combined:

```
Agent System Prompt = Agent Instruction + Project Instruction
```

This allows project-level context to enhance agent behavior without overriding agent-specific instructions.

### File Pushing

Move files from conversation to project for sharing:

- **Push operation** - Copy a conversation file to the project
- **Preserve original** - Original file remains in the conversation
- **Share with others** - File becomes accessible to all project conversations
- **One-way only** - Files cannot be pushed from project back to conversation

## Use Cases

| Scenario | How Projects Help |
|----------|-------------------|
| **Research project** | Share research papers and data across multiple analysis conversations |
| **Software development** | Maintain codebase documentation accessible to all feature discussions |
| **Content creation** | Share style guides and brand assets across writing conversations |
| **Team collaboration** | Provide shared context and resources for team members working on the same project |

## When to Use Projects

**Use Projects when:**
- You have multiple related conversations that need access to the same files
- You want to maintain consistent agent behavior across conversations
- You need to share resources without duplicating files

**Use standalone Conversations when:**
- Working on isolated, unrelated tasks
- Files are specific to a single conversation
- No need for shared context or instructions

## Getting Started

### Create a Project

1. Navigate to the Projects section
2. Click "Create Project"
3. Provide a name and optional project instruction
4. Start adding conversations

### Add Conversations

**Option 1: Create new conversation in project**
- Select the project when creating a new conversation

**Option 2: Move existing conversation**
- Open the conversation
- Select "Move to Project"
- Choose the target project

### Upload Project Files

1. Open the project
2. Navigate to the Files section
3. Upload files that should be shared across conversations
4. Files are now accessible to all conversations in the project

### Push Conversation Files

1. Open a conversation within a project
2. Select a file you want to share
3. Click "Push to Project"
4. File is copied to the project and becomes available to other conversations

## Best Practices

**Organize by topic or goal**
Group conversations that share a common purpose or subject matter.

**Use project instructions wisely**
Keep project instructions focused on shared context, not conversation-specific details.

**Push files strategically**
Only push files that are valuable to multiple conversations, not temporary or conversation-specific files.

**Name projects clearly**
Use descriptive names that make it easy to identify the project's purpose.

## Next Steps

- **[Conversation Management](index.md)** - Learn about conversation features
- **[File Management](../tools/file-tool.md)** - Understand file operations
- **[Agent Configuration](../agent/config.md)** - Configure agent behavior with instructions
