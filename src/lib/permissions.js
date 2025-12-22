/**
 * Permission checking utility for staff members
 */

/**
 * Get staff info from localStorage
 */
export const getStaffInfo = () => {
  try {
    const staffInfo = localStorage.getItem('staffInfo');
    return staffInfo ? JSON.parse(staffInfo) : null;
  } catch {
    return null;
  }
};

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission to check (e.g., 'users.view', 'tickets.reply')
 * @returns {boolean}
 */
export const hasPermission = (permission) => {
  // Check if admin (admins have all permissions)
  const adminUser = localStorage.getItem('adminUser');
  if (adminUser) {
    try {
      const admin = JSON.parse(adminUser);
      // If adminUser exists, they're an admin with full access
      return true;
    } catch {
      // If parsing fails, continue to check staff permissions
    }
  }

  // Check staff permissions
  const staffInfo = getStaffInfo();
  if (!staffInfo || !staffInfo.permissions) {
    return false;
  }

  const permissions = staffInfo.permissions || [];
  
  // "all" permission grants access to everything
  if (permissions.includes('all')) {
    return true;
  }

  // Check for specific permission
  return permissions.includes(permission);
};

/**
 * Check if user is admin
 */
export const isAdmin = () => {
  return !!localStorage.getItem('adminUser');
};

/**
 * Check if user is staff
 */
export const isStaff = () => {
  return !!getStaffInfo();
};
