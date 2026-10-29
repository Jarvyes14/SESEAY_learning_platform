export function can(user, permission) {
  return user?.role === "platform_admin" || Boolean(user?.permissions?.includes(permission));
}
export const destinations = [
  ["reports.view", "/admin"], ["learning.view", "/learning"], ["courses.view", "/instructor"],
  ["users.view", "/admin/users"], ["roles.view", "/admin/roles"], ["progress.view", "/progress"],
  ["grades.view", "/grades"], ["certificates.view", "/certificates"], ["certificate_templates.view", "/certificates"], ["settings.view", "/admin/settings"]
];
export function homeForUser(user) { return destinations.find(([key]) => can(user, key))?.[1] ?? "/account"; }
