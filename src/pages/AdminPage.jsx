// src/pages/AdminPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getUser, redirectByRole } from "../utils/auth";

export default function AdminPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getUser();
    if (!user) {
      toast.error("Please log in to continue.");
      navigate("/", { replace: true });
      return;
    }
    const to = redirectByRole();
    navigate(to, { replace: true });
  }, [navigate]);

  return null; // or a tiny spinner if you like
}
