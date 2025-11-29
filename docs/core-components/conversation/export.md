# Conversation Export

Export conversations as datasets for model training, analysis, or backup.

## What is Conversation Export

Export conversations into structured datasets in multiple file formats. Useful for fine-tuning models, analyzing conversation patterns, or archiving data.

**Export vs Share:**

| Feature | Export | Share |
|---------|--------|-------|
| **Purpose** | Dataset creation | Public viewing |
| **Format** | JSONL/CSV/Parquet | Web page |
| **Files** | Not included | Downloadable |
| **Use case** | Training, analysis | Collaboration |

## Supported Formats

| Format | Best for | File size |
|--------|----------|-----------|
| **JSONL** | Model training, easy reading | Medium |
| **CSV** | Spreadsheet analysis | Largest |
| **Parquet** | Big data processing | Smallest |

## Data Structure

Exported data follows the ShareGPT format with these fields:

| Field | Type | Description |
|-------|------|-------------|
| **data_source** | String | Conversation type (chat/agent/graph) |
| **ability** | Array | Conversation tags |
| **messages** | Array | Conversation rounds |
| **tools** | Array | Tools used in conversation |
| **model** | String | Model name |
| **conversation_id** | String | Source conversation ID |

**Message roles:**

| Role | Description |
|------|-------------|
| **user** | User input |
| **assistant** | Model response without tools |
| **function_call** | Model response with tool calls |
| **tool** | Tool execution result |
| **system** | System prompt (first message only) |

**Formatting rules:**

| Rule | How it works |
|------|--------------|
| **Chat/Agent** | All rounds merged into one record |
| **Graph** | Each round (except round 1) becomes separate record |
| **System prompts** | Only last system message kept, placed first |
| **Tools** | Duplicates removed, unique tools only |

## Creating Datasets

### Step 1: Select Conversations

Access Export Manager from the conversation header button.

**Filter options:**

| Filter | Choices |
|--------|---------|
| **Search** | Title or tags |
| **Date range** | Created time period |
| **Type** | chat, agent, graph |
| **Status** | active, favorite, deleted |

**Selection:**

- Click conversations to toggle selection
- Use "Select All" for filtered results
- Use "Deselect All" to clear

### Step 2: Configure Export

Fill in the export form:

| Field | Description | Example |
|-------|-------------|---------|
| **Dataset name** | Identifies your dataset | `customer_support` |
| **File name** | Output file name (no extension) | `conversations_2024` |
| **File format** | JSONL, CSV, or Parquet | `jsonl` |
| **Data format** | Currently only "standard" | `standard` |

### Step 3: Execute Export

Click "Confirm Export" to create the dataset.

**What happens:**

```
Select → Configure → Export → Preview → Download
```

After export completes, view preview data or download immediately.

## Managing Datasets

Switch to the "Datasets Management" tab to see all exports.

**Available actions:**

| Action | Description |
|--------|-------------|
| **Preview** | View first 20 records |
| **Download** | Get ZIP file with data + metadata |
| **Delete** | Remove dataset permanently |

**Dataset list shows:**

| Column | Information |
|--------|-------------|
| Dataset name | Name you provided |
| Data format | Currently "standard" |
| Created at | Export timestamp |

## Downloaded Files

Each downloaded ZIP contains:

| File | Content |
|------|---------|
| **Data file** | Your conversations (*.jsonl/csv/parquet) |
| **dataset_info.json** | Dataset metadata and schema |

**dataset_info.json structure:**

```json
{
  "dataset_name": {
    "file_name": "conversations.jsonl",
    "formatting": "sharegpt",
    "num_samples": 150,
    "columns": {
      "messages": "messages"
    },
    "tags": {
      "role_tag": "role",
      "content_tag": "content",
      "user_tag": "user",
      "assistant_tag": "assistant",
      "function_tag": "function_call",
      "observation_tag": "tool",
      "system_tag": "system"
    }
  }
}
```

## Preview Data

Preview shows the first 20 records in JSON format.

**Use preview to:**

- Verify correct conversations exported
- Check data structure before downloading
- Confirm format matches expectations
- Review sample messages and tools

## Use Cases

| Scenario | How to use |
|----------|------------|
| **Model fine-tuning** | Export successful conversations for training |
| **Quality analysis** | Export to CSV for spreadsheet review |
| **Data archiving** | Regular exports for backup |
| **Performance metrics** | Analyze conversation patterns |
| **Dataset creation** | Build training sets for specific capabilities |

## Best Practices

**Name consistently:** Use descriptive, dated names like `support_conversations_2024_01`

**Review before export:** Check selected conversations contain expected content

**Choose appropriate format:**
- JSONL for training and general use
- CSV for spreadsheet analysis
- Parquet for large-scale processing

**Regular backups:** Schedule periodic exports of important conversations

**Clean data:** Remove test conversations before export

## Features

**User isolation:** Each user only sees their own datasets

**Round 1 excluded:** Graph conversations skip first round (initialization)

**Format support:** Currently only "standard" ShareGPT format available

## Related Links

- [Conversation Share](share.md) - Share conversations via public links
- [Conversation Overview](index.md) - Complete conversation system
