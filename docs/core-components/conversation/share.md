# Conversation Share

Share your conversations with others via public links.

## What is Conversation Share

Share any conversation by generating a unique link that anyone can access without logging in. Shared conversations are read-only and include all messages and files.

**Share vs Export:**

| Feature | Share | Export |
|---------|-------|--------|
| **Access** | Anyone with link | Download file only |
| **Format** | Web page view | JSON/CSV/Parquet |
| **Files** | Downloadable | Not included |
| **Updates** | Reflects current state | Snapshot at export time |

## Creating a Share Link

Click the Share button in the conversation header to create a public link.

**What happens:**

| Step | Action |
|------|--------|
| **First time** | System generates unique share ID and link |
| **Already shared** | Shows existing share link |
| **Link format** | `yourdomain.com/share/abc123xyz` |

## Accessing Shared Conversations

Anyone with the link can view the conversation without logging in.

**Available to viewers:**

| Feature | Description |
|---------|-------------|
| **Messages** | All conversation rounds and responses |
| **Files** | List of files with download buttons |
| **Metadata** | Conversation title, type, and timestamps |
| **Format** | Clean, read-only interface |

**Not visible to viewers:**

- User information (owner name, email)
- Agent configuration details
- System prompts and internal settings
- Edit or delete capabilities

## Downloading Files

Shared conversations include all attached files.

**Download options:**

| Option | How to use |
|--------|-----------|
| **Single file** | Click download icon next to filename |
| **All files** | Click "Download All" to get ZIP archive |
| **File types** | Any file type in the conversation |

## Managing Share Links

Control your shared conversations from the share modal.

**Available actions:**

| Action | Effect |
|--------|--------|
| **Copy link** | Copy share URL to clipboard |
| **Open in new tab** | Preview how others see it |
| **Delete share** | Revoke access, link becomes invalid |

## Deleting Share Links

Remove public access anytime by deleting the share link.

**What happens:**

```
Delete share → Link becomes invalid → Viewers see 404 error
```

The conversation remains in your account, only the public link is removed.

## Share Status

Check if a conversation is currently shared from the conversation header.

**Status indicators:**

| State | Indicator |
|-------|-----------|
| **Not shared** | Share button available |
| **Already shared** | Share button shows existing link |

## Use Cases

| Scenario | How sharing helps |
|----------|------------------|
| **Team collaboration** | Share analysis results with teammates |
| **Documentation** | Create public references for processes |
| **Support tickets** | Share conversation history with support |
| **Teaching** | Demonstrate workflows to students |
| **Reporting** | Provide stakeholders conversation evidence |

## Privacy Considerations

**What's shared:**

- Conversation messages and rounds
- File contents and names
- Conversation metadata (title, type, timestamps)

**What's protected:**

- Your account information
- Agent configurations
- Private system settings
- Other conversations

**Access control:**

Share links are public but unlisted - only people with the exact URL can access them. Search engines won't index these pages.

## Features

**Real-time updates:** Share link reflects current conversation state

**No editing:** Viewers cannot modify or respond to shared conversations

**Read-only files:** Files can be downloaded but not edited through the share link

**No authentication:** Anyone with the link can access (no password protection)

**Owner permissions:** Only conversation owner can create or delete share links

## Related Links

- [Conversation Export](export.md) - Download conversations in various formats
- [Conversation Overview](index.md) - Complete conversation system
