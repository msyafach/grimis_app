---
paths:
  - "Grimis/grmisi-fe-main/src/components/**/*.jsx"
  - "Grimis/grmisi-fe-main/src/utils/permission*.js"
---

# Permission System Rules

## AWS-Style Permission UX

When modifying permission-related code:

1. **Show all menus** - Never filter menus based on permissions in Menus.jsx
2. **Block at route level** - Use ProtectedRoute.jsx to check permissions
3. **Feature-specific messages** - Use `getFeatureName(path)` for Indonesian error messages
4. **Root user bypass** - Always check `user.is_root` first in permission checks

### Permission Hierarchy

```javascript
// 1. Root users bypass all checks
if (user.is_root) return true;

// 2. Check group permissions
if (permissions.length > 0) {
  return requiredPermissions.some(p => permissions.includes(p));
}

// 3. Fallback to role-based
return roleBasedCheck(user.role);
```

### Adding New Feature Names

When adding new routes, update `getFeatureName()` in `permissionMenuFilter.js`:

```javascript
'new-feature/path': 'Nama Fitur Baru', // Indonesian name
```

## Toast Messages

Always use this format for access denied:
```javascript
showToast("error", `Anda tidak memiliki akses ke fitur ${featureName}`);
```
