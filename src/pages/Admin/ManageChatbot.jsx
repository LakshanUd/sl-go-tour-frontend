// src/pages/Admin/ManageChatbot.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  MessageSquare,
  Bot,
  Settings,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
  Download,
  Filter,
  MapPin,
  UtensilsCrossed,
  Hotel,
  Truck,
  MessageSquareText,
  AlertCircle,
  Boxes,
  UserCog,
  Save,
  Edit,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { confirmToast } from "../../components/ConfirmToast";

/* ---------- Theme (GREEN like other admin pages) ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ---------- Persisted sidebar accordion ---------- */
const LS_KEY = "adminSidebarOpen";

/* ---------- Backend base ---------- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    toast.error(msg);
    return Promise.reject(err);
  }
);

/* ---------- API helpers ---------- */
const ChatbotAPI = {
  list: () => api.get("/api/chatbot"),
  get: (id) => api.get(`/api/chatbot/${id}`),
  create: (payload) => api.post("/api/chatbot", payload),
  update: (id, payload) => api.put(`/api/chatbot/${id}`, payload),
  remove: (id) => api.delete(`/api/chatbot/${id}`),
  toggle: (id) => api.patch(`/api/chatbot/${id}/toggle`),
};

const ChatAPI = {
  list: () => api.get("/api/chat"),
  get: (id) => api.get(`/api/chat/${id}`),
  remove: (id) => api.delete(`/api/chat/${id}`),
};

const FAQAPI = {
  list: (chatbotId) => api.get(`/api/chatbot/${chatbotId}/faqs`),
  create: (chatbotId, payload) => api.post(`/api/chatbot/${chatbotId}/faqs`, payload),
  update: (chatbotId, faqId, payload) => api.put(`/api/chatbot/${chatbotId}/faqs/${faqId}`, payload),
  remove: (chatbotId, faqId) => api.delete(`/api/chatbot/${chatbotId}/faqs/${faqId}`),
};

/* ---------- Status helpers ---------- */
const STATUSES = ["active", "inactive", "maintenance"];
function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();
  const cls =
    v === "active"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : v === "maintenance"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  const Icon =
    v === "active" ? CheckCircle2 : v === "maintenance" ? AlertTriangle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${cls}`}>
      <Icon className="h-4 w-4" />
      {v || "inactive"}
    </span>
  );
}

/* ---------- Page ---------- */
export default function ManageChatbot() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Sidebar accordions (persisted) */
  const [open, setOpen] = useState({
    overview: true,
    chatbot: true,
    chats: true,
    settings: true,
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOpen((s) => ({
          overview: typeof parsed.overview === "boolean" ? parsed.overview : s.overview,
          chatbot: typeof parsed.chatbot === "boolean" ? parsed.chatbot : s.chatbot,
          chats: typeof parsed.chats === "boolean" ? parsed.chats : s.chats,
          settings: typeof parsed.settings === "boolean" ? parsed.settings : s.settings,
        }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch {}
  }, [open]);

  // search & filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // modals
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [active, setActive] = useState(null);
  const [editId, setEditId] = useState(null);

  // form
  const [form, setForm] = useState({
    name: "",
    description: "",
    welcomeMessage: "",
    status: "active",
    isEnabled: true,
    maxMessages: 50,
    responseDelay: 1000,
  });

  // chat logs
  const [chatLogs, setChatLogs] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  // FAQ Management State
  const [faqs, setFaqs] = useState([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    keywords: "",
    category: "General",
    priority: 1,
    isActive: true,
  });

  async function load() {
    try {
      setLoading(true);
      const res = await ChatbotAPI.list();
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.chatbots || []);
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadChatLogs() {
    try {
      setChatLoading(true);
      const res = await ChatAPI.list();
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.chats || []);
      setChatLogs(list);
    } catch {
      setChatLogs([]);
    } finally {
      setChatLoading(false);
    }
  }

  // FAQ Management Functions
  async function loadFAQs(chatbotId) {
    if (!chatbotId) return;
    try {
      setFaqLoading(true);
      const res = await FAQAPI.list(chatbotId);
      setFaqs(res.data.faqs || []);
    } catch {
      setFaqs([]);
    } finally {
      setFaqLoading(false);
    }
  }

  function resetFAQForm() {
    setFaqForm({
      question: "",
      answer: "",
      keywords: "",
      category: "General",
      priority: 1,
      isActive: true,
    });
    setEditingFAQ(null);
  }

  function openFAQModal(chatbotId, faq = null) {
    if (faq) {
      setEditingFAQ(faq);
      setFaqForm({
        question: faq.question || "",
        answer: faq.answer || "",
        keywords: (faq.keywords || []).join(", "),
        category: faq.category || "General",
        priority: faq.priority || 1,
        isActive: Boolean(faq.isActive),
      });
    } else {
      resetFAQForm();
    }
    setShowFAQModal(true);
  }

  async function saveFAQ(chatbotId) {
    try {
      const payload = {
        ...faqForm,
        keywords: faqForm.keywords.split(",").map(k => k.trim()).filter(Boolean),
      };
      
      if (editingFAQ) {
        await FAQAPI.update(chatbotId, editingFAQ._id, payload);
        toast.success("FAQ updated successfully");
      } else {
        await FAQAPI.create(chatbotId, payload);
        toast.success("FAQ added successfully");
      }
      
      setShowFAQModal(false);
      resetFAQForm();
      loadFAQs(chatbotId);
    } catch (error) {
      toast.error("Failed to save FAQ");
    }
  }

  async function deleteFAQ(chatbotId, faqId) {
    const confirmed = await confirmToast("Are you sure you want to delete this FAQ?");
    if (!confirmed) return;
    
    try {
      await FAQAPI.remove(chatbotId, faqId);
      toast.success("FAQ deleted successfully");
      loadFAQs(chatbotId);
    } catch (error) {
      toast.error("Failed to delete FAQ");
    }
  }

  useEffect(() => {
    load();
    loadChatLogs();
  }, []);

  const withinRange = (createdAt) => {
    if (!createdAt) return true;
    const d = new Date(createdAt);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchStatus = !statusFilter || String(r.status || "").toLowerCase() === statusFilter;
      const hay = [r.name, r.description, r.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchText = !t || hay.includes(t);
      const matchDate = withinRange(r.createdAt);
      return matchStatus && matchText && matchDate;
    });
  }, [rows, q, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => String(r.status || "").toLowerCase() === "active").length;
    const inactive = rows.filter((r) => String(r.status || "").toLowerCase() === "inactive").length;
    const totalChats = chatLogs.length;
    const todayChats = chatLogs.filter((c) => {
      const today = new Date();
      const chatDate = new Date(c.createdAt);
      return chatDate.toDateString() === today.toDateString();
    }).length;
    return { total, active, inactive, totalChats, todayChats };
  }, [rows, chatLogs]);

  function resetForm() {
    setForm({
      name: "",
      description: "",
      welcomeMessage: "",
      status: "active",
      isEnabled: true,
      maxMessages: 50,
      responseDelay: 1000,
    });
  }

  function openCreate() {
    resetForm();
    setEditId(null);
    setOpenEdit(true);
  }

  function openEditModal(row) {
    setEditId(row._id);
    setForm({
      name: row.name || "",
      description: row.description || "",
      welcomeMessage: row.welcomeMessage || "",
      status: row.status || "active",
      isEnabled: Boolean(row.isEnabled),
      maxMessages: Number(row.maxMessages) || 50,
      responseDelay: Number(row.responseDelay) || 1000,
    });
    setOpenEdit(true);
  }

  function openViewModal(row) {
    setActive(row);
    setOpenView(true);
    loadFAQs(row._id);
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.welcomeMessage.trim()) return toast.error("Welcome message is required");

    try {
      if (editId) {
        await ChatbotAPI.update(editId, form);
        toast.success("Chatbot updated");
      } else {
        await ChatbotAPI.create(form);
        toast.success("Chatbot created");
      }
      setOpenEdit(false);
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  async function toggleStatus(row) {
    try {
      await ChatbotAPI.toggle(row._id);
      toast.success(`Chatbot ${row.isEnabled ? "disabled" : "enabled"}`);
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  async function removeRow(row) {
    const ok = await confirmToast({
      title: "Delete Chatbot",
      message: `Delete chatbot "${row.name}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      position: "top-right",
    });
    if (!ok) return;
    try {
      await ChatbotAPI.remove(row._id);
      toast.success("Chatbot deleted");
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  async function removeChat(chat) {
    const ok = await confirmToast({
      title: "Delete Chat",
      message: `Delete this chat conversation?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      position: "top-right",
    });
    if (!ok) return;
    try {
      await ChatAPI.remove(chat._id);
      toast.success("Chat deleted");
      await loadChatLogs();
    } catch {
      /* handled by interceptor */
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar ===== */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white">
            {/* 01. Overview */}
            <AccordionHeader
              title="Overview"
              isOpen={open.overview}
              onToggle={() => setOpen((s) => ({ ...s, overview: !s.overview }))}
            />
            {open.overview && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/overview"
                  icon={<LayoutDashboard className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Overview</span>
                </RailLink>
              </div>
            )}

            {/* 02. Content Management */}
            <AccordionHeader
              title="Content Management"
              isOpen={open.content}
              onToggle={() => setOpen((s) => ({ ...s, content: !s.content }))}
            />
            {open.content && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/tour-packages"
                  icon={<MapPin className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Tours</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-blogs"
                  icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Blogs</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-meals"
                  icon={<UtensilsCrossed className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Meals</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-accommodations"
                  icon={<Hotel className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Accommodations</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-vehicles"
                  icon={<Truck className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Vehicles</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-feedbacks"
                  icon={<MessageSquare className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Feedback</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-complaints"
                  icon={<AlertCircle className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Complaints</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-inventory"
                  icon={<Boxes className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Inventory</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-chatbot"
                  icon={<Bot className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Manage Chatbot</span>
                </RailLink>
              </div>
            )}

            {/* 03. Operations Management */}
            <AccordionHeader
              title="Operations Management"
              isOpen={open.ops}
              onToggle={() => setOpen((s) => ({ ...s, ops: !s.ops }))}
            />
            {open.ops && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/manage-users"
                  icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Users</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-finance"
                  icon={<Wallet className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Finance</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-bookings"
                  icon={<CalendarDays className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Bookings</span>
                </RailLink>
              </div>
            )}

            {/* 04. Reports */}
            <AccordionHeader
              title="Reports"
              isOpen={open.reports}
              onToggle={() => setOpen((s) => ({ ...s, reports: !s.reports }))}
            />
            {open.reports && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/reports"
                  icon={<BarChart3 className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">All Reports</span>
                </RailLink>
              </div>
            )}

            {/* 05. Account Settings */}
            <AccordionHeader
              title="Account Settings"
              isOpen={open.account}
              onToggle={() => setOpen((s) => ({ ...s, account: !s.account }))}
              last
            />
            {open.account && (
              <div className="px-3 pb-3">
                <RailLink
                  to="/profile/settings"
                  icon={<UserCog className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Profile Settings</span>
                </RailLink>
              </div>
            )}
          </div>
        </aside>

        {/* ===== Main content ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Manage</span> Chatbot
              </h2>
              <p className="text-sm text-neutral-500">
                Configure and manage your AI chatbot settings and responses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search chatbots…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="Refresh"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>

              <button
                onClick={openCreate}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-90 active:opacity-80`}
              >
                <Plus size={16} />
                New Chatbot
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat title="Total Chatbots" value={stats.total} />
            <Stat title="Active" value={stats.active} />
            <Stat title="Total Chats" value={stats.totalChats} />
            <Stat title="Today's Chats" value={stats.todayChats} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
            >
              <option value="">All status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              placeholder="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              placeholder="To date"
            />
          </div>

          {/* Chatbots Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">
                {loading ? "Loading…" : `${filtered.length} chatbots`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Enabled</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filtered.map((r) => (
                      <tr key={r._id} className="border-t hover:bg-neutral-50/60">
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="font-medium text-neutral-800">{r.name || "—"}</div>
                            <div className="text-xs text-neutral-500 line-clamp-1">
                              {r.description || "—"}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <StatusBadge value={r.status} />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleStatus(r)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              r.isEnabled
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-neutral-50 text-neutral-700 ring-1 ring-neutral-200"
                            }`}
                          >
                            {r.isEnabled ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td className="p-3">
                          {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                              onClick={() => openViewModal(r)}
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                              onClick={() => openEditModal(r)}
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                              onClick={() => removeRow(r)}
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={5}>
                        {rows.length ? "No chatbots match your search/filters." : "No chatbots created yet."}
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ Management Section */}
          {active && (
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-700">FAQ Management</span>
                  <span className="text-xs text-neutral-500">({active.name})</span>
                </div>
                <button
                  onClick={() => openFAQModal(active._id)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white bg-gradient-to-r from-[#09E65A] to-[#16A34A] hover:opacity-90"
                >
                  <Plus size={16} />
                  Add FAQ
                </button>
              </div>
              
              <div className="p-4">
                {faqLoading ? (
                  <div className="text-center py-8 text-neutral-500">Loading FAQs...</div>
                ) : faqs.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    No FAQs added yet. Click "Add FAQ" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {faqs.map((faq) => (
                      <div key={faq._id} className="border border-neutral-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-neutral-800">{faq.question}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                faq.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {faq.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                {faq.category}
                              </span>
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                Priority: {faq.priority}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-600 mb-2">{faq.answer}</p>
                            {faq.keywords && faq.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {faq.keywords.map((keyword, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-xs">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => openFAQModal(active._id, faq)}
                              className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                              title="Edit FAQ"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => deleteFAQ(active._id, faq._id)}
                              className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                              title="Delete FAQ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Logs Section */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">Recent Chat Logs</span>
              <button
                onClick={loadChatLogs}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="Refresh"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Message</th>
                    <th className="text-left p-3">Response</th>
                    <th className="text-left p-3">Time</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!chatLoading &&
                    chatLogs.slice(0, 10).map((chat) => (
                      <tr key={chat._id} className="border-t hover:bg-neutral-50/60">
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="font-medium text-neutral-800">{chat.user?.name || "Anonymous"}</div>
                            <div className="text-xs text-neutral-500">{chat.user?.email || "—"}</div>
                          </div>
                        </td>
                        <td className="p-3 max-w-[200px] truncate" title={chat.message || ""}>
                          {chat.message || "—"}
                        </td>
                        <td className="p-3 max-w-[200px] truncate" title={chat.response || ""}>
                          {chat.response || "—"}
                        </td>
                        <td className="p-3">
                            {chat.createdAt ? new Date(chat.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                              onClick={() => removeChat(chat)}
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!chatLoading && chatLogs.length === 0 && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={5}>
                        No chat logs available.
                      </td>
                    </tr>
                  )}

                  {chatLoading && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* View Modal */}
          {openView && active && (
            <Modal onClose={() => setOpenView(false)}>
              <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
                <div className="rounded-2xl bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                    <div className="font-semibold">Chatbot Details</div>
                    <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenView(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <Row label="Name" icon={<Bot className="h-4 w-4" />}>
                      {active.name || "—"}
                    </Row>
                    <Row label="Status" icon={<Clock className="h-4 w-4" />}>
                      <StatusBadge value={active.status} />
                    </Row>
                    <Row label="Enabled" icon={<Settings className="h-4 w-4" />}>
                      {active.isEnabled ? "Yes" : "No"}
                    </Row>
                    <Row label="Max Messages" icon={<MessageSquare className="h-4 w-4" />}>
                      {active.maxMessages || "—"}
                    </Row>
                    <Row label="Response Delay" icon={<Clock className="h-4 w-4" />}>
                      {active.responseDelay ? `${active.responseDelay}ms` : "—"}
                    </Row>
                    <div>
                      <label className="text-sm text-neutral-600">Description</label>
                      <div className="mt-1 p-3 bg-neutral-50 rounded-lg text-sm">
                        {active.description || "—"}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Welcome Message</label>
                      <div className="mt-1 p-3 bg-neutral-50 rounded-lg text-sm">
                        {active.welcomeMessage || "—"}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-neutral-600">Created</label>
                        <div className="mt-1">
                          {active.createdAt ? new Date(active.createdAt).toLocaleString() : "—"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-neutral-600">Updated</label>
                        <div className="mt-1">
                          {active.updatedAt ? new Date(active.updatedAt).toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                        onClick={() => setOpenView(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {/* Create/Edit Modal */}
          {openEdit && (
            <Modal onClose={() => setOpenEdit(false)}>
              <div className={`w-full max-w-xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
                <div className="rounded-2xl bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                    <div className="font-semibold">{editId ? "Edit Chatbot" : "New Chatbot"}</div>
                    <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenEdit(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); save(); }} className="p-4 space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Chatbot name"
                        required
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Chatbot description"
                      />
                    </div>

                    <div>
                      <Label>Welcome Message *</Label>
                      <Textarea
                        rows={3}
                        value={form.welcomeMessage}
                        onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
                        placeholder="Welcome message for users"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={form.status}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                          options={STATUSES}
                        />
                      </div>
                      <div>
                        <Label>Max Messages</Label>
                        <Input
                          type="number"
                          value={form.maxMessages}
                          onChange={(e) => setForm((f) => ({ ...f, maxMessages: Number(e.target.value) }))}
                          placeholder="50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Response Delay (ms)</Label>
                        <Input
                          type="number"
                          value={form.responseDelay}
                          onChange={(e) => setForm((f) => ({ ...f, responseDelay: Number(e.target.value) }))}
                          placeholder="1000"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="isEnabled"
                          checked={form.isEnabled}
                          onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))}
                          className="rounded border-neutral-300"
                        />
                        <Label htmlFor="isEnabled">Enabled</Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                        onClick={() => setOpenEdit(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className={`px-4 py-2 rounded-xl text-white ${GRAD_BG}`}>
                        {editId ? "Save Changes" : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Modal>
          )}

          {/* FAQ Modal */}
          {showFAQModal && (
            <Modal onClose={() => setShowFAQModal(false)}>
              <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
                <div className="rounded-2xl bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                    <div className="font-semibold">{editingFAQ ? "Edit FAQ" : "Add New FAQ"}</div>
                    <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setShowFAQModal(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); saveFAQ(active._id); }} className="p-4 space-y-4">
                    <div>
                      <Label>Question *</Label>
                      <Input
                        value={faqForm.question}
                        onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))}
                        placeholder="What is your question?"
                        required
                      />
                    </div>

                    <div>
                      <Label>Answer *</Label>
                      <Textarea
                        rows={4}
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))}
                        placeholder="Provide a detailed answer..."
                        required
                      />
                    </div>

                    <div>
                      <Label>Keywords (comma-separated)</Label>
                      <Input
                        value={faqForm.keywords}
                        onChange={(e) => setFaqForm((f) => ({ ...f, keywords: e.target.value }))}
                        placeholder="tour, booking, price, etc."
                      />
                      <p className="text-xs text-neutral-500 mt-1">Keywords help match user questions to this FAQ</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <Input
                          value={faqForm.category}
                          onChange={(e) => setFaqForm((f) => ({ ...f, category: e.target.value }))}
                          placeholder="General, Booking, Payment, etc."
                        />
                      </div>
                      <div>
                        <Label>Priority (1-10)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={faqForm.priority}
                          onChange={(e) => setFaqForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="faqIsActive"
                        checked={faqForm.isActive}
                        onChange={(e) => setFaqForm((f) => ({ ...f, isActive: e.target.checked }))}
                        className="rounded border-neutral-300"
                      />
                      <Label htmlFor="faqIsActive">Active (FAQ will be used for matching)</Label>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                        onClick={() => setShowFAQModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className={`px-4 py-2 rounded-xl text-white ${GRAD_BG}`}>
                        {editingFAQ ? "Update FAQ" : "Add FAQ"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Modal>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */
function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-neutral-700 mb-1">
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-neutral-200 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-neutral-200 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
    />
  );
}

function Select({ value, onChange, options = [] }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-xl border border-neutral-200 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
    >
      {options.map((op) => (
        <option key={op} value={op}>
          {op.charAt(0).toUpperCase() + op.slice(1)}
        </option>
      ))}
    </select>
  );
}

function Modal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-[1001] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, icon, children }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-1 text-sm text-neutral-600 inline-flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="col-span-2 text-sm">{children}</div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className="mt-1 text-lg font-semibold">
        <span className={gradText}>{value}</span>
      </div>
    </div>
  );
}

/* ===== Sidebar bits ===== */
function AccordionHeader({ title, isOpen, onToggle, last = false }) {
  return (
    <button
      onClick={onToggle}
      className={[
        "w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium uppercase tracking-wide",
        "cursor-pointer",
        last ? "" : "border-b border-neutral-200",
      ].join(" ")}
    >
      <span className="text-neutral-500">{title}</span>
      <ChevronUp
        className={[
          "h-4 w-4 transition-transform text-neutral-500",
          isOpen ? "rotate-0" : "rotate-180",
        ].join(" ")}
      />
    </button>
  );
}

function RailLink({ to, icon, children }) {
  return (
    <NavLink to={to} className="block group">
      {({ isActive }) => (
        <div
          className={[
            "rounded-lg p-[1px] my-1",
            isActive
              ? "bg-gradient-to-r from-[#09E65A] to-[#16A34A]"
              : "bg-gradient-to-r from-transparent to-transparent group-hover:from-[#09E65A1A] group-hover:to-[#16A34A1A]",
          ].join(" ")}
        >
          <span
            className={[
              "flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition",
              "hover:bg-neutral-50",
              isActive ? "shadow-sm" : "",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2 text-neutral-800 overflow-hidden">
              {icon}
              <span className="whitespace-nowrap">{children}</span>
            </span>
            <ChevronRight className={`h-4 w-4 ${ICON_COLOR}`} />
          </span>
        </div>
      )}
    </NavLink>
  );
}
