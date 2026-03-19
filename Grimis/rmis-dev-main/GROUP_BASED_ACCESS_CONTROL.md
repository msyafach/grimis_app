# Group-Based Access Control Implementation

## Overview

This document describes the implementation of group-based access control (GBAC) system, similar to AWS IAM. This system provides granular permission management while maintaining backwards compatibility with the existing role-based access control (RBAC).

## Architecture

### Permission System

The system uses a permission enum defined in `app/schemas/group.py` with 40+ granular permissions organized into 11 categories:

1. **Dashboard** - View dashboard and risk map
2. **Organization** - Manage/view organization structure
3. **Parameters** - Manage/view/propose system parameters
4. **Risk Management** - Manage/view/propose/approve risks
5. **Identification** - Full CRUD for risk identification
6. **Analysis** - Create/edit/view risk analysis
7. **Evaluation** - Manage/verify risk evaluation (RTP)
8. **Monitoring & Reporting** - View/manage monitoring and reports
9. **User Management** - Full user CRUD operations
10. **Group Management** - Create/manage groups and permissions
11. **Approval** - View/approve proposals
12. **Settings** - System settings management

### Backwards Compatibility

The system maintains full backwards compatibility through:

1. **ROLE_PERMISSIONS mapping** (`app/utils/permissions.py`): Maps legacy roles to equivalent permission sets
2. **Dual checking**: Menu filtering checks permissions first, falls back to role-based if unavailable
3. **Automatic migration**: Script assigns existing users to corresponding groups

## Implementation Increments

### Increment 1: Group and Permission Schemas

**Files:**
- `app/schemas/group.py` - Permission enum and Group schemas

**Key Components:**
- `Permission` enum with 40+ permissions
- `GroupBase`, `GroupCreate`, `GroupUpdate`, `GroupResponse` schemas
- `GroupMemberResponse` for displaying group members
- `GroupWithMembers` for detailed group views

### Increment 2: Group API Endpoints

**Files:**
- `app/api/v1/groups.py` - Complete CRUD operations

**Endpoints:**
```
POST   /api/v1/groups                      - Create group
GET    /api/v1/groups                      - List groups
GET    /api/v1/groups/{id}                 - Get group with members
PUT    /api/v1/groups/{id}                 - Update group
DELETE /api/v1/groups/{id}                 - Delete group
POST   /api/v1/groups/{id}/members/{uid}   - Add member
DELETE /api/v1/groups/{id}/members/{uid}   - Remove member
GET    /api/v1/groups/{id}/permissions     - Get permissions
PUT    /api/v1/groups/{id}/permissions     - Update permissions
```

**Features:**
- Permission checking for MANAGE_GROUPS
- Bidirectional sync between group.member_ids and user.group_ids
- Search functionality for groups

### Increment 3: Permission Helper Utility

**Files:**
- `app/utils/permissions.py` - Permission checking utilities

**Functions:**
- `get_user_permissions(user_id)` - Get all user permissions
- `user_has_permission(user_id, permission)` - Check single permission
- `user_has_any_permission(user_id, permissions)` - Check ANY of multiple
- `user_has_all_permissions(user_id, permissions)` - Check ALL of multiple
- `get_permission_label(permission)` - Human-readable labels
- `get_permissions_by_category()` - Grouped permissions for UI

### Increment 4: Frontend Group Management UI

**Files:**
- `src/components/groupManagement/` - Reusable components
- `src/pages/group-management/` - Page components

**Components:**
- `GroupHeader.jsx` - Page header with "Add Group" button
- `GroupTable.jsx` - Data table with CRUD actions
- `GroupForm.jsx` - Create/edit form with permission checkboxes

**Pages:**
- `/groups` - Main group list
- `/groups/tambah` - Create new group
- `/groups/edit/:id` - Edit existing group
- `/groups/detail/:id` - View details and manage members

**Features:**
- Permission selection by category (11 categories)
- Member management with add/remove
- Confirmation dialogs for destructive actions
- Toast notifications for user feedback

### Increment 5: Menu Filtering Migration

**Files:**
- `src/utils/permissionMenuFilter.js` - Permission-based menu filtering
- `src/context/AuthContext.jsx` - Fetch and store user permissions
- `src/components/shared/navigationMenu/Menus.jsx` - Updated filtering logic

**Features:**
- `MENU_PERMISSION_MAP` - Maps menu paths to required permissions
- `ROLE_BASED_MENUS` - Fallback for backwards compatibility
- `canAccessMenu()` - Check menu access
- `filterMenuByPermissions()` - Filter entire menu list

**Backend:**
- Added `GET /api/v1/users/{user_id}/permissions` endpoint
- Returns list of permission strings for the user

### Increment 6: Default Groups Migration

**Files:**
- `app/utils/migrate_default_groups.py` - Migration script

**Default Groups:**
1. **Super Admin** - All permissions (SUPER_ADMIN equivalent)
2. **Admin KLP** - Administrative permissions (ADMIN_KLP equivalent)
3. **Unit Manajemen Risiko** - Risk management permissions
4. **Pemilik Risiko** - Risk owner permissions
5. **Pengelola Risiko** - Risk manager permissions
6. **Pengawas Intern** - Audit view permissions
7. **Pegawai** - Staff view permissions

**Usage:**
```bash
python app/utils/migrate_default_groups.py
```

## User Guide

### Creating a Group

1. Navigate to **Settings Unit Kerja > Manajemen Group**
2. Click **Tambah Group**
3. Enter group name and description
4. Select permissions by category
5. Click **Simpan**

### Adding Members to a Group

1. Navigate to **Groups > [Group Name]**
2. Click **+ Tambah Anggota**
3. Select user from dropdown
4. Click **Tambah**

### Removing Members from a Group

1. Navigate to **Groups > [Group Name]**
2. Find the member in the table
3. Click **Hapus** button
4. Confirm deletion

### Editing Group Permissions

1. Navigate to **Groups > [Group Name]**
2. Click **Edit Group**
3. Modify permission selections
4. Click **Update**

## Migration Guide

### From Role-Based to Group-Based

1. **Backup your database** (recommended)
2. Run the migration script:
   ```bash
   python app/utils/migrate_default_groups.py
   ```
3. Verify groups are created correctly
4. Test user permissions
5. Optionally create additional custom groups

### What the Migration Does

- Creates 7 default groups based on existing roles
- Assigns each user to the group matching their role
- Maintains bidirectional sync automatically
- Safe to run multiple times (idempotent)

## API Reference

### Group Endpoints

#### Create Group
```http
POST /api/v1/groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Custom Group",
  "description": "Group description",
  "permissions": ["view:dashboard", "view:risk_map"],
  "member_ids": []
}
```

#### Update Group Permissions
```http
PUT /api/v1/groups/{group_id}/permissions
Authorization: Bearer {token}
Content-Type: application/json

["view:dashboard", "view:risk_map", "manage:users"]
```

#### Add Member to Group
```http
POST /api/v1/groups/{group_id}/members/{user_id}
Authorization: Bearer {token}
```

#### Remove Member from Group
```http
DELETE /api/v1/groups/{group_id}/members/{user_id}
Authorization: Bearer {token}
```

## Security Considerations

1. **SUPER_ADMIN bypass** - Always has all permissions
2. **Permission checking** - Happens at API endpoint level
3. **Bidirectional sync** - Automatic consistency between users and groups
4. **Role fallback** - Ensures system works during migration period

## Future Enhancements

Potential improvements for future iterations:

1. **Hierarchical groups** - Parent-child group relationships
2. **Time-limited permissions** - Expiring group memberships
3. **Permission templates** - Pre-defined permission sets
4. **Audit logging** - Track permission changes
5. **Bulk operations** - Add/remove multiple members at once
6. **Permission inheritance** - Child permissions include parent permissions

## Troubleshooting

### Users Lost Access After Migration

1. Check user's `group_ids` field
2. Verify group exists and has correct permissions
3. Re-run migration script if needed

### Menu Items Missing

1. Check user permissions in database
2. Verify `MENU_PERMISSION_MAP` includes the menu path
3. Clear browser cache and reload

### Permission Changes Not Reflecting

1. Logout and login again to refresh token
2. Check bidirectional sync is working
3. Verify frontend is fetching latest permissions

## Support

For issues or questions:
1. Check this documentation first
2. Review the migration script output
3. Check database consistency
4. Review application logs
