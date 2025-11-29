# Create and Edit Prompts

Manage your prompt templates in the Prompt Center.

## Create a Prompt

Click the "Create Prompt" button on the main interface to open the creation dialog.

**Required Information:**

| Field | Description | Rules |
|-------|-------------|-------|
| **Name** | Unique identifier for the prompt | Max 100 characters, excludes `/ \ : * ? " < > \|` |
| **Category** | Organization tag for grouping | English letters, numbers, hyphens, and underscores only |
| **Content** | The actual prompt text | Required, supports Markdown format |

**Creation Flow:**

```
Fill name and category → Write prompt content → Click create → Save success
```

**Duplicate Name Handling:** If the name already exists, the system prompts you to choose a different name.

## Edit a Prompt

Click the edit icon on a prompt card to open the editing dialog.

**Editable Fields:**

| Field | Modifiable |
|-------|-----------|
| **Name** | ❌ Not modifiable (serves as unique identifier) |
| **Category** | ✅ Modifiable |
| **Content** | ✅ Modifiable |

**Editing Flow:**

```
Select prompt → Click edit → Modify category or content → Save update
```

## Delete a Prompt

Click the delete icon on a prompt card to trigger deletion confirmation.

**Deletion Flow:**

```
Click delete icon → Confirm deletion → Permanent removal
```

⚠️ **Deletion is Irreversible:** Deletion cannot be undone. Proceed with caution.

## Import Prompts

Create prompts from local files using the import feature.

**Supported Formats:**

| Format | Description |
|--------|-------------|
| **Markdown (.md)** | Standard Markdown files |
| **Text (.txt)** | Plain text files |

**Import Flow:**

```
Click import → Select file → Fill name and category → Confirm import
```

**Import Requirements:**

- File encoding must be UTF-8
- File content becomes the prompt content
- Name and category must still be specified manually

## Export Prompts

Select one or more prompts from the list to export.

**Export Format:**

| Format | Description |
|--------|-------------|
| **ZIP Archive** | Contains all selected prompts as Markdown files |
| **File Naming** | Uses prompt name as filename |

**Export Flow:**

```
Select prompts → Click export → Download ZIP file
```

**File Structure Example:**

```
prompts_export.zip
├── code-review.md
├── summarize.md
└── translate.md
```

## Category Management

Prompts automatically group by category for organized display.

**Category Rules:**

| Rule | Description |
|------|-------------|
| **Auto-grouping** | Prompts with same category display together |
| **Uncategorized** | Prompts with empty category go to "Uncategorized" |
| **Category Count** | Total category count shown at top |

**Category Display:**

Each category displays as an independent card group containing all prompts in that category.

## Search and Filter

Use the search box to quickly locate prompts.

**Search Rules:**

| Search Method | Description |
|--------------|-------------|
| **Name Matching** | Fuzzy search by prompt name |
| **Real-time Filtering** | Results display as you type |
| **Case Insensitive** | Ignores case differences |

**Search Flow:**

```
Enter keywords → Real-time list filtering → Display matching results
```

## Related Links

- [Work with Agents](work-with-agents.md) - Apply prompts in agents
- [Prompt Generator Tool](../tools/prompt-generator.md) - Generate prompts using built-in tools
- [Prompt Center Overview](index.md) - Complete introduction to Prompt Center
