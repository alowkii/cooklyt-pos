// Single source of truth for the current user's identity and role.
// Read this instead of touching localStorage directly in components.
export function useAuth() {
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isAdmin = user?.role === 'admin';
  return { user, isAdmin };
}
