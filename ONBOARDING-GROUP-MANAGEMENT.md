# Group Management Feature - Developer Onboarding Guide

> Role-based access control system for GRIMIS using user groups with fine-grained permissions.

---

## What is Group Management?

Group Management is a feature that enables **role-based access control (RBAC)** through user groups. Instead of assigning permissions directly to users, administrators can:

- Create groups (e.g., "Admin KLP", "Risk Manager", "Viewer")
- Assign permissions to groups
- Add/remove users from groups
- Manage group membership and permissions through a UI

**Key Benefits:**
- Centralized permission management
- Easier user onboarding (just add to group)
- Audit-friendly access control
- Flexible permission granularity (40+ permissions available)

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | `nvm install 20` |
| Python | 3.11+ | [python.org](https://python.org) |
| Docker | 24+ | [docker.com](https://docker.com) |
| MongoDB | 7+ | via Docker (see below) |

### Full Stack Setup (5 minutes)

```bash
# Clone and navigate to project
git clone <repo-url>
cd grimis

# Start all services (MongoDB, Backend, Frontend)
docker compose up -d

# Verify services are running
docker ps
# Should show: grimis-mongo-1, grimis-backend-1, grimis-frontend-1

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Verify Group Management Works

1. Navigate to http://localhost
2. Login with valid credentials
3. Go to **Settings → Group Management**
4. You should see the group list page with:
   - List of existing groups
   - "Tambah Group" (Add Group) button
   - "Kelola Izin" (Manage Permissions) button

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ GroupManagement │  │ PermissionSelector│                 │
│  │    Component    │  │    Component    │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                            │
│  ┌────────┴────────────────────┴────────┐                  │
│  │         API Endpoints (Axios)         │                  │
│  │   /api/v1/groups                      │                  │
│  │   /api/v1/groups/{id}/permissions     │                  │
│  └─────────────────┬─────────────────────┘                  │
└────────────────────┼────────────────────────────────────────┘
                     │ HTTP/JSON
┌────────────────────┼────────────────────────────────────────┐
│                    ▼                                        │
│              Backend (FastAPI)                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  groups.py      │  │  group.py       │                  │
│  │  (API Routes)   │  │  (Schemas)      │                  │
│  └────────┬────────┘  └─────────────────┘                  │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────────────────────────┐                  │
│  │         MongoDB (Motor)              │                  │
│  │  Database: grimis                    │                  │
│  │  Collection: groups                  │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | UI components |
| Routing | React Router DOM | Page navigation |
| HTTP Client | Axios | API communication |
| Styling | SCSS + Bootstrap | Component styling |
| Backend | FastAPI | REST API |
| Database | MongoDB | Document storage |
| ODM | Motor | Async MongoDB driver |
| Validation | Pydantic | Schema validation |

---

## Key Files

### Frontend Files

| Path | Purpose |
|------|---------|
| `src/pages/group-management/GroupManagement.jsx` | Main group list page |
| `src/pages/group-management/GroupForm.jsx` | Create/edit group form |
| `src/pages/group-management/PermissionSelector.jsx` | Permission management UI |
| `src/pages/group-management/GroupMemberList.jsx` | Group member management |
| `src/config/apiConfig.js` | API endpoint definitions |
| `src/route/router.jsx` | Route definitions (line 73, 955) |

### Backend Files

| Path | Purpose |
|------|---------|
| `app/api/v1/groups.py` | API endpoints for groups |
| `app/schemas/group.py` | Pydantic schemas (Permission enum, Group models) |
| `app/api/v1/__init__.py` | Router registration (line 23, 158-163) |
| `app/utils/migrate_default_groups.py` | Default group migration |

### Configuration Files

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `Grimis/rmis-dev-main/requirements.txt` | Python dependencies |
| `Grimis/grmisi-fe-main/package.json` | Node dependencies |

---

## API Endpoints

### Group CRUD Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/groups` | List all groups | JWT Token |
| POST | `/api/v1/groups` | Create new group | JWT Token |
| GET | `/api/v1/groups/{id}` | Get group details | JWT Token |
| PUT | `/api/v1/groups/{id}` | Update group | JWT Token |
| DELETE | `/api/v1/groups/{id}` | Delete group | JWT Token |

### Group Membership

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/groups/{id}/members/{user_id}` | Add member to group |
| DELETE | `/api/v1/groups/{id}/members/{user_id}` | Remove member from group |

### Group Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/groups/{id}/permissions` | Get group permissions |
| PUT | `/api/v1/groups/{id}/permissions` | Update group permissions |

### Permission Request/Response Format

```json
// PUT /api/v1/groups/{id}/permissions
// Request Body
{
  "permissions": [
    "view:dashboard",
    "view:risk_map",
    "manage:groups",
    "view:groups"
  ]
}

// Response
{
  "message": "Permissions updated successfully"
}
```

---

## Permission System

### Available Permission Categories

| Category | Permissions | Description |
|----------|-------------|-------------|
| **Dashboard** | `view:dashboard`, `view:risk_map` | Dashboard access |
| **Organization** | `manage:organization`, `view:organization`, `manage:structural_units`, `view:structural_units` | Instansi & unit management |
| **Parameters** | `manage:context_target`, `view:context_target`, `manage:context_probis`, `view:context_probis`, `manage:risk_dictionary`, `view:risk_dictionary` | Konteks & kamus risiko |
| **Risk Management** | `manage:risk_identification`, `view:risk_identification`, `create:risk_assessment`, `approve:risk_assessment`, `manage:risk_treatment`, `view:risk_treatment`, `manage:monitoring`, `view:monitoring` | Full risk lifecycle |
| **Event Management** | `manage:event`, `view:event`, `approve:event`, `approve:kejadian` | Laporan kejadian |
| **User Management** | `manage:users`, `view:users`, `manage:groups`, `view:groups` | User & group admin |
| **Approval** | `approve:risk_dictionary`, `approve:kejadian` | Approval workflows |
| **Reports** | `view:reports`, `export:reports` | Reporting access |
| **Settings** | `manage:settings`, `view:audit_logs` | System settings |

### Permission Check Flow

```
User Request
    │
    ▼
┌─────────────────────┐
│ ProtectedRoute      │
│ (Frontend)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ JWT Validation      │
│ (Backend)           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Check User Groups   │
│ & Permissions       │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
  Allowed    Denied (403)
```

---

## Database Schema

### Group Collection (MongoDB)

```javascript
{
  "_id": ObjectId("..."),
  "name": "Admin KLP",
  "description": "Administrator untuk KLP",
  "permissions": [
    "manage:users",
    "view:users",
    "manage:groups",
    "view:groups"
  ],
  "member_ids": [
    "user_id_1",
    "user_id_2"
  ],
  "created_at": ISODate("2025-03-20T..."),
  "updated_at": ISODate("2025-03-20T...")
}
```

### User Collection (Reference)

```javascript
{
  "_id": ObjectId("..."),
  "username": "john.doe",
  "email": "john@example.com",
  "group_ids": [
    "group_id_1",
    "group_id_2"
  ],
  // ... other fields
}
```

---

## Common Developer Tasks

### Add a New Permission

1. **Update Backend Schema** (`app/schemas/group.py`):
   ```python
   class Permission(str, Enum):
       # ... existing permissions ...
       NEW_PERMISSION = "action:resource"
   ```

2. **Update Frontend** (`src/pages/group-management/PermissionSelector.jsx`):
   ```javascript
   const PERMISSION_CATEGORIES = {
       category_name: {
           label: 'Category Label',
           permissions: ['action:resource', ...]
       }
   };

   // Add label
   const getPermissionLabel = (permission) => {
       const labels = {
           'action:resource': 'Label in Indonesian',
           // ...
       };
   };
   ```

3. **Rebuild containers**:
   ```bash
   docker compose up -d --build
   ```

### Debug Permission Issues

```bash
# Check backend logs for validation errors
docker logs --tail 50 grimis-backend-1

# Look for:
# - "422 Unprocessable Entity" - Invalid permission enum value
# - "403 Forbidden" - User lacks required permission
# - "404 Not Found" - Group doesn't exist

# Check MongoDB directly
docker exec -it grimis-mongo-1 mongosh
db.groups.findOne({name: "Admin KLP"})
```

### Test Group API Locally

```bash
# Get all groups
curl -X GET http://localhost:8000/api/v1/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a group
curl -X POST http://localhost:8000/api/v1/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Group", "description": "Test", "permissions": ["view:dashboard"]}'

# Update permissions
curl -X PUT http://localhost:8000/api/v1/groups/GROUP_ID/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissions": ["view:dashboard", "manage:groups"]}'
```

---

## Debugging Guide

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `422 Unprocessable Entity` | Invalid permission value in request | Check `Permission` enum in backend matches frontend |
| `403 Forbidden` | User lacks `manage:groups` permission | Add user to group with permission management rights |
| `404 Not Found` | Group ID doesn't exist | Verify group ID in MongoDB |
| `Gagal menyimpan perubahan` | Frontend error display | Check browser console and backend logs |

### Frontend Component Hierarchy

```
GroupManagement (Page)
    ├── GroupForm (Modal - Create/Edit)
    │   └── Form inputs for name, description
    │
    ├── PermissionSelector (Modal - Manage Permissions)
    │   ├── Category checkboxes (Dashboard, Organization, etc.)
    │   └── Individual permission checkboxes
    │
    └── GroupMemberList (Modal - Manage Members)
        ├── User search/add
        └── Member list with remove action
```

### Log Locations

| Environment | Logs |
|-------------|------|
| Local dev | `docker logs grimis-backend-1` |
| Local dev | `docker logs grimis-frontend-1` |
| Browser | DevTools Console (F12) |
| MongoDB | `docker logs grimis-mongo-1` |

---

## Contribution Guidelines

### Branch Strategy

- `main` - Production-ready code
- `new-feature` - Active development branch
- `fix/group-permission-*` - Bug fix branches

### Before Submitting Changes

```bash
# 1. Test locally
docker compose up -d --build

# 2. Verify all containers start
docker ps

# 3. Check backend logs for errors
docker logs grimis-backend-1

# 4. Test the feature manually
# - Create a group
# - Assign permissions
# - Add/remove members

# 5. Commit with descriptive message
git add .
git commit -m "feat: add X permission to group management"
```

---

## Architecture Decisions

### Why MongoDB for Groups?

- **Flexible schema**: Group permissions can evolve without migrations
- **Embedded arrays**: `member_ids` and `permissions` stored as arrays
- **Atomic updates**: MongoDB supports atomic array operations (`$addToSet`, `$pull`)

### Why Separate PermissionUpdate Schema?

The `PUT /groups/{id}/permissions` endpoint uses a wrapper object `{ "permissions": [...] }` instead of a direct array to:
- Allow future expansion (e.g., adding `reason` field for audit)
- Match common REST API patterns
- Enable partial updates if needed

### Permission Enum vs String

Using `Permission(str, Enum)` in Pydantic provides:
- Validation at API boundary
n- Auto-generated OpenAPI docs
- IDE autocomplete support
- Type safety

---

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [React Documentation](https://react.dev/)
- [GRIMIS Backend README](../rmis-dev-main/README.md)

---

## Quick Reference

```bash
# Restart just the backend
docker compose restart backend

# View backend logs in real-time
docker logs -f grimis-backend-1

# Access MongoDB shell
docker exec -it grimis-mongo-1 mongosh

# Reset all data (WARNING: destructive)
docker compose down -v
docker compose up -d

# Rebuild after code changes
docker compose up -d --build
```

---

**Last Updated:** 2025-03-20
**Feature Status:** Active Development
**Maintainers:** Dev Team
