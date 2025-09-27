// src/utils/auth.js
export function getUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRole() {
  const u = getUser();
  return u?.role || null;
}

export function isLoggedIn() {
  return !!getUser();
}

/** Map each role to its dashboard route */
export const ROLE_HOME = {
  Admin: "/dash/admin",
  "AC-Manager": "/dash/accommodations",
  Author: "/dash/author",
  "CF-Manager": "/dash/complaints-feedback",
  "IN-Manager": "/dash/inventory",
  Chef: "/dash/chef",
  "TP-Manager": "/dash/tours",
  "VC-Manager": "/dash/vehicles",
  Customer: "/", // Customers go to main app
};

/** Where should this user land? */
export function redirectByRole() {
  const role = getRole();
  return ROLE_HOME[role] || "/";
}
