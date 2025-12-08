# Create Invite Code

Generate and manage invite codes for new team members.

---

## Access

Only administrators can create and manage invite codes. To access the Admin Panel:

Navigate to `/admin` page directly in your browser (e.g., `https://agent-graph.com/admin`)

Administrators must login to access the invite code management.

---

## Overview

Invite codes control who can register for your platform. Each code has:
- **Unique code**: Auto-generated in format `TEAM-XXXXXX`
- **Usage limit**: Optional limit on registrations
- **Status**: Active or deactivated
- **Description**: Optional note for organization

---

## Create Invite Code

Click **Invite Code** button at bottom-right of the invite codes table.

### Configuration

| Field | Required | Description |
|-------|----------|-------------|
| Description | Optional | Note to identify this code's purpose |
| Max Uses | Optional | Limit registrations (leave empty for unlimited) |

Click **Generate** to create the code.

---

## Manage Codes

### Code Information

View all invite codes in the table:

| Column | Description |
|--------|-------------|
| Invite Code | The code itself (click copy icon to copy) |
| Status | Active or Deactivated |
| Usage | Current uses / limit (∞ for unlimited) |
| Creator | Who generated this code |
| Created At | When the code was created |
| Expires At | Expiration date (Permanent if none) |

### Toggle Status

Click **Deactivate** to stop accepting new registrations with an active code.

Click **Activate** to re-enable a deactivated code.

Status changes are immediate.
