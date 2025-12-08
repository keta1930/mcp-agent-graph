# Manage Your Team

Admin Panel provides centralized team management capabilities.

## Access Admin Panel

Only administrators can access the Admin Panel. To access it:

Navigate to `/admin` page directly in your browser (e.g., `https://agent-graph.com/admin`)

Administrators must login to access the admin panel.

![Admin Panel](../../assets/Admin/admin_page_en.png)

## User Management

### User Information

| Column | Description |
|--------|-------------|
| Username | User identifier with avatar |
| Role | User, Admin, or Super Admin |
| Status | Active or Deactivated |
| Registration Time | Account creation date |
| Last Login | Most recent login timestamp |

### User Actions

| Action | Availability | Effect |
|--------|-------------|--------|
| Promote to Admin | Active users only | Grants admin privileges |
| Deactivate | Active users except Super Admin | Prevents login access |

**Role Hierarchy**

- **Super Admin**: Cannot be deactivated
- **Admin**: Can manage users and invite codes
- **User**: Standard access level

## Team Settings

Administrators can update team information:

| Setting | Description |
|---------|-------------|
| Team Name | Display name for your organization |
| Updated By | Last admin who modified settings |
| Update Time | Last modification timestamp |

Team settings are accessible from the Admin Panel.
