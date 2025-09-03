import { useState } from "react";
import { toast } from "react-hot-toast";
import StarRating from "../components/StarRating.jsx";
import { FeedbacksAPI, ComplaintsAPI } from "../lib/api.js";

const gradBG = "bg-gradient-to-r from-[#DA22FF] to-[#9733EE]";
const ringFocus = "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30";

export default function CustomerFeedback() {
  // 'feedback' | 'complaint'
  const [mode, setMode] = useState("feedback");

  // feedback state
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [fbRating, setFbRating] = useState(0);

  // complaint state
  const [cpName, setCpName] = useState("");
  const [cpEmail, setCpEmail] = useState("");
  const [cpService, setCpService] = useState("");
  const [cpCategory, setCpCategory] = useState("");
  const [cpDescription, setCpDescription] = useState("");

  async function submitFeedback(e) {
    e.preventDefault();
    if (!fbMessage.trim() || !fbRating) {
      toast.error("Please provide a message and a rating (1–5).");
      return;
    }
    try {
      await FeedbacksAPI.create({
        name: fbName,
        email: fbEmail,
        message: fbMessage,
        rating: fbRating,
      });
      toast.success("Thanks for your feedback!");
      // reset
      setFbName("");
      setFbEmail("");
      setFbMessage("");
      setFbRating(0);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit feedback");
    }
  }

  async function submitComplaint(e) {
    e.preventDefault();
    if (!cpService.trim() || !cpCategory.trim() || !cpDescription.trim()) {
      toast.error("Please fill service, category and description.");
      return;
    }
    try {
      await ComplaintsAPI.create({
        name: cpName,
        email: cpEmail,
        service: cpService,
        category: cpCategory,
        description: cpDescription,
      });
      toast.success("Complaint submitted. We’ll review it shortly.");
      // reset
      setCpName("");
      setCpEmail("");
      setCpService("");
      setCpCategory("");
      setCpDescription("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit complaint");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Share your <span className={`text-transparent bg-clip-text ${gradBG}`}>experience</span>
        </h1>
        <p className="text-sm text-neutral-600">Send feedback or file a complaint.</p>
      </div>

      {/* Toggle */}
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-[#DA22FF] to-[#9733EE] inline-block mb-5">
        <div className="rounded-2xl bg-white p-1 flex">
          <label className="flex-1">
            <input
              type="radio"
              name="mode"
              value="feedback"
              checked={mode === "feedback"}
              onChange={() => setMode("feedback")}
              className="hidden"
            />
            <div
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm ${
                mode === "feedback" ? `${gradBG} text-white` : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Give Feedback
            </div>
          </label>
          <label className="flex-1">
            <input
              type="radio"
              name="mode"
              value="complaint"
              checked={mode === "complaint"}
              onChange={() => setMode("complaint")}
              className="hidden"
            />
            <div
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm ${
                mode === "complaint" ? `${gradBG} text-white` : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Submit Complaint
            </div>
          </label>
        </div>
      </div>

      {/* Feedback form */}
      {mode === "feedback" && (
        <form onSubmit={submitFeedback} className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-600">Name</label>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                value={fbName}
                onChange={(e) => setFbName(e.target.value)}
                placeholder="Your name (optional)"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600">Email</label>
              <input
                type="email"
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                value={fbEmail}
                onChange={(e) => setFbEmail(e.target.value)}
                placeholder="you@example.com (optional)"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-neutral-600">Your feedback *</label>
            <textarea
              rows={4}
              className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              placeholder="Tell us what you loved or what we can improve…"
              required
            />
          </div>

          <div>
            <label className="text-sm text-neutral-600">Rating *</label>
            <div className="mt-2">
              <StarRating value={fbRating} onChange={setFbRating} />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className={`rounded-xl px-4 py-2 text-white ${gradBG} hover:opacity-90`}>
              Submit Feedback
            </button>
          </div>
        </form>
      )}

      {/* Complaint form */}
      {mode === "complaint" && (
        <form onSubmit={submitComplaint} className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-600">Name</label>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                value={cpName}
                onChange={(e) => setCpName(e.target.value)}
                placeholder="Your name (optional)"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600">Email</label>
              <input
                type="email"
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                value={cpEmail}
                onChange={(e) => setCpEmail(e.target.value)}
                placeholder="you@example.com (optional)"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-600">Service *</label>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                value={cpService}
                onChange={(e) => setCpService(e.target.value)}
                placeholder="Hotel / Tour / Guide / Transport"
                required
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600">Category *</label>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                value={cpCategory}
                onChange={(e) => setCpCategory(e.target.value)}
                placeholder="Delay / Quality / Billing…"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-neutral-600">Description *</label>
            <textarea
              rows={4}
              className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
              value={cpDescription}
              onChange={(e) => setCpDescription(e.target.value)}
              placeholder="Explain the issue in detail…"
              required
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className={`rounded-xl px-4 py-2 text-white ${gradBG} hover:opacity-90`}>
              Submit Complaint
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
