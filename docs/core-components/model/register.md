# Register Your Model

Configure LLM models to use throughout the platform - from chat conversations to agent workflows.

## Quick Start

Navigate to **Model Manager** from the workspace sidebar to register a new model.

## Required Configuration

| Field | Description | Example |
|-------|-------------|---------|
| Model Name | Display name for this model | `claude-sonnet-4-5` |
| Provider | Model provider (currently OpenAI-compatible) | `openai` |
| Model Type | Type of model | `llm` (language model) |
| Base URL | API endpoint | `https://api.anthropic.com/v1/` |
| API Key | Your authentication key | `sk-ant-api...` |
| Model Identifier | Model ID from provider | `claude-sonnet-4-5-20250929` |

## Advanced Configuration

Optional parameters for fine-tuning model behavior:

### Generation Control

| Parameter | Range | Description |
|-----------|-------|-------------|
| Temperature | 0.0 - 2.0 | Randomness of outputs (higher = more creative) |
| Max Tokens | ≥ 1 | Maximum response length |
| Max Completion Tokens | ≥ 1 | Maximum tokens in completion |
| Top P | 0.0 - 1.0 | Nucleus sampling threshold |

### Response Tuning

| Parameter | Range | Description |
|-----------|-------|-------------|
| Frequency Penalty | -2.0 - 2.0 | Reduce repetition (positive = less repetitive) |
| Presence Penalty | -2.0 - 2.0 | Encourage topic diversity (positive = more diverse) |
| Stop Sequence | String or list | Tokens where model stops generating |
| Response Count (n) | 1 - 10 | Number of alternative responses to generate |

### Debugging

| Parameter | Range | Description |
|-----------|-------|-------------|
| Seed | Integer | Deterministic generation with same seed |
| Logprobs | Boolean | Return log probabilities of tokens |
| Top Logprobs | 0 - 20 | Number of most likely token alternatives |

### Connection

| Parameter | Description |
|-----------|-------------|
| Timeout | Request timeout in seconds |
| Extra Body | Custom JSON parameters for specific providers |

## Common Setups

### Claude Sonnet 4.5

```
Provider: openai
Base URL: https://api.anthropic.com/v1/
Model: claude-sonnet-4-5-20250929
```

### GPT-5

```
Provider: openai
Base URL: https://api.openai.com/v1/
Model: gpt-5
```

### Gemini 2.5 Flash

```
Provider: openai
Base URL: https://generativelanguage.googleapis.com/v1beta/
Model: gemini-2.5-flash-latest
```

## Managing Models

### Edit Model

Click **Edit** on any model card to update configuration. Leave API Key blank to keep the existing key.

### Delete Model

Click **Delete** to remove a model. You cannot delete models currently used by agents or workflows.

### Title Generation Model

Set a default model for automatic conversation title generation:

1. Click **Title Model Settings** in the header
2. Select your preferred model
3. Save

This model will be used when generating descriptive titles for new conversations.

## Best Practices

**API Keys**: Store keys securely. The platform never displays full API keys after creation.

**Naming**: Use clear, descriptive names like `gpt-4-turbo-preview` instead of `model-1`.

**Testing**: Create test conversations to verify model configuration before using in workflows.

**Default Parameters**: Start without advanced parameters, then tune based on your use case.
