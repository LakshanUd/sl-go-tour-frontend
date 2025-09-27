// src/components/RoleRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { getUser } from "../utils/auth";

export default function RoleRoute({ roles = [], children }) {
  const location = useLocation();
  const user = getUser();

  if (!user) {
    toast.error("Please log in to continue.");
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (roles.length && !roles.includes(user.role)) {
    toast.error("Access denied for your role.");
    return <Navigate to="/" replace />;
  }

  return children;
}
