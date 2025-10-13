// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./app.css";
import { Toaster } from "react-hot-toast";

import ScrollToTopOnRoute from "./components/ScrollToTopOnRoute";
import BackToTop from "./components/BackToTop";

import Header from "./components/header.jsx";
import Footer from "./components/footer.jsx";
import CartPage from "./pages/CartPage.jsx";

// Public pages
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

// Admin hub (role redirector)
import AdminPage from "./pages/AdminPage.jsx";

// Admin tools (manager UIs)
import VehiclePage from "./pages/Admin/VehiclePage.jsx";
import AdminMeals from "./pages/Admin/AdminMeals.jsx";
import BlogsAdmin from "./pages/Admin/BlogsAdmin.jsx";
import AccommodationAdmin from "./pages/Admin/AccommodationAdmin.jsx";
import ManageUserAdmin from "./pages/Admin/ManageUserAdmin.jsx";
import ManageComplaintAdmin from "./pages/Admin/ManageComplaintAdmin.jsx";
import ManageFeedbackAdmin from "./pages/Admin/ManageFeedbackAdmin.jsx";
import BookingManageAdmin from "./pages/Admin/BookingManageAdmin.jsx";
import FinancialManageAdmin from "./pages/Admin/FinancialManageAdmin.jsx";
import MonthlyReport from "./pages/MonthlyReport.jsx";
import FinanceTransactionsReport from "./pages/reports/FinanceTransactionsReport.jsx";
import ManageInventoryAdmin from "./pages/Admin/ManageInventoryAdmin.jsx";
import ManageChatbot from "./pages/Admin/ManageChatbot.jsx";

// Report pages
import TourPackageReportPage from "./pages/reports/TourPackageReportPage.jsx";
import AccommodationReportPage from "./pages/reports/AccommodationReportPage.jsx";
import MealsReportPage from "./pages/reports/MealsReportPage.jsx";
import BlogsReportPage from "./pages/reports/BlogsReportPage.jsx";
import VehicleReportPage from "./pages/reports/VehicleReportPage.jsx";
import FeedbacksReportPage from "./pages/reports/FeedbacksReportPage.jsx";
import ComplaintsReportPage from "./pages/reports/ComplaintsReportPage.jsx";
import InventoryReportPage from "./pages/reports/InventoryReportPage.jsx";
import UsersReportPage from "./pages/reports/UsersReportPage.jsx";
import FinanceReportPage from "./pages/reports/FinanceReportPage.jsx";
import BookingsReportPage from "./pages/reports/BookingsReportPage.jsx";

// Customers
import CustomerPage from "./pages/CustomerPage.jsx";
import CustomerMeals from "./pages/CustomerMeals.jsx";
import BlogsPublic from "./pages/BlogsPublic.jsx";
import TourPackageCustomer from "./pages/TourPackageCustomer.jsx";
import VehicleCustomer from "./pages/VehicleCustomer.jsx";
import AccommodationCustomer from "./pages/AccommodationCustomer.jsx";
import CustomerFeedback from "./pages/CustomerFeedback.jsx";
import CustomerComplaint from "./pages/CustomerComplaint.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import FeedbackPublic from "./pages/FeedbackPublic.jsx";
import BlogView from "./pages/BlogView.jsx";

// Tours
import TourPackageListAdmin from "./pages/Admin/TourPackageListAdmin.jsx";
import TourPackageView from "./pages/TourPackageView.jsx";
import TourPackageEditor from "./pages/TourPackageEditor.jsx";

// Role protection + dashboards
import RoleRoute from "./components/RoleRoute.jsx";
import AdminDashboard from "./pages/dashboards/AdminDashboard.jsx";
import VehicleManagerDashboard from "./pages/dashboards/VehicleManagerDashboard.jsx";
import AccommodationManagerDashboard from "./pages/dashboards/AccommodationManagerDashboard.jsx";
import AuthorDashboard from "./pages/dashboards/AuthorDashboard.jsx";
import ComplaintFeedbackManagerDashboard from "./pages/dashboards/ComplaintFeedbackManagerDashboard.jsx";
import InventoryManagerDashboard from "./pages/dashboards/InventoryManagerDashboard.jsx";
import ChefDashboard from "./pages/dashboards/ChefDashboard.jsx";
import TourPackageManagerDashboard from "./pages/dashboards/TourPackageManagerDashboard.jsx";

// Reports

import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";

/* --------- Small guard for /profile/settings if you want it protected ---------- */
import ManageProfile from "./pages/ManageProfile.jsx";
import ManageProfileCus from "./pages/ManageProfileCustomer.jsx";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <ScrollToTopOnRoute />
      <Header />

      <Routes>
        {/* ---------- Public ---------- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cart" element={<CartPage/>}/>
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        {/* ---------- Customer-facing ---------- */}
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/meals" element={<CustomerMeals />} />
        <Route path="/blogs" element={<BlogsPublic />} />
        <Route path="/tours" element={<TourPackageCustomer />} />
        <Route path="/vehicles" element={<VehicleCustomer />} />
        <Route path="/accommodations" element={<AccommodationCustomer />} />
        <Route path="/feedbacks" element={<FeedbackPublic />} />

        <Route
          path="/account/feedbacks"
          element={
            <RoleRoute roles={["Customer"]}>
              <CustomerFeedback />
            </RoleRoute>
          }
        />

        <Route path="/account/complaints" element= {<CustomerComplaint />} />
        <Route path="/bookings" element={<MyBookings />} />

        {/* ---------- Tour Packages (public view + protected admin) ---------- */}
        <Route path="/tour-packages/:tourPakage_ID" element={<TourPackageView />} />
        <Route
          path="/admin/tour-packages"
          element={
            <RoleRoute roles={["TP-Manager", "Admin"]}>
              <TourPackageListAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/tour-packages/new"
          element={
            <RoleRoute roles={["TP-Manager", "Admin"]}>
              <TourPackageEditor mode="create" />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/tour-packages/:tourPakage_ID/edit"
          element={
            <RoleRoute roles={["TP-Manager", "Admin"]}>
              <TourPackageEditor mode="edit" />
            </RoleRoute>
          }
        />

        <Route path="/blogs/:id" element={<BlogView />} />

        {/* ---------- Reports (Admin only) ---------- */}
        <Route
          path="/admin/reports/monthly"
          element={
            <RoleRoute roles={["Admin"]}>
              <MonthlyReport />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/reports/finance-transactions"
          element={
            <RoleRoute roles={["Admin"]}>
              <FinanceTransactionsReport />
            </RoleRoute>
          }
        />

        {/* ---------- Admin landing (redirects by role) ---------- */}
        <Route path="/admin/*" element={<AdminDashboard />} />
         <Route path="/admin/overview" element={<AdminDashboard />} />

        {/* ---------- Role-specific dashboards ---------- */}
        <Route path="/dash/admin" element={<AdminDashboard />} />
        <Route path="/dash/vehicles" element={<VehicleManagerDashboard />} />
        <Route path="/dash/accommodations" element={<AccommodationManagerDashboard />} />
        <Route path="/dash/author" element={<AuthorDashboard />} />
        <Route path="/dash/complaints-feedback" element={<ComplaintFeedbackManagerDashboard />} />
        <Route path="/dash/inventory" element={<InventoryManagerDashboard />} />
        <Route path="/dash/chef" element={<ChefDashboard />} />
        <Route path="/dash/tours" element={<TourPackageManagerDashboard />} />

        {/* ---------- Admin tools (PROTECTED) ---------- */}
        <Route
          path="/admin/manage-vehicles"
          element={
            <RoleRoute roles={["VC-Manager", "Admin"]}>
              <VehiclePage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-meals"
          element={
            <RoleRoute roles={["Chef", "Admin"]}>
              <AdminMeals />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-blogs"
          element={
            <RoleRoute roles={["Author", "Admin"]}>
              <BlogsAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-accommodations"
          element={
            <RoleRoute roles={["AC-Manager", "Admin"]}>
              <AccommodationAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-inventory"
          element={
            <RoleRoute roles={["IN-Manager", "Admin"]}>
              <ManageInventoryAdmin />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/manage-users"
          element={
            <RoleRoute roles={["Admin"]}>
              <ManageUserAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-complaints"
          element={
            <RoleRoute roles={["CF-Manager", "Admin"]}>
              <ManageComplaintAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-feedbacks"
          element={
            <RoleRoute roles={["CF-Manager", "Admin"]}>
              <ManageFeedbackAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-bookings"
          element={
            <RoleRoute roles={["Admin"]}>
              <BookingManageAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-finance"
          element={
            <RoleRoute roles={["Admin"]}>
              <FinancialManageAdmin />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/manage-chatbot"
          element={
            <RoleRoute roles={["Admin"]}>
              <ManageChatbot />
            </RoleRoute>
          }
        />

        {/* ---------- Reports ---------- */}
        <Route
          path="/admin/vehicles/report"
          element={
            <RoleRoute roles={["VC-Manager", "Admin"]}>
              <VehicleReportPage />
            </RoleRoute>
          }
        />
        <Route path="/reports/tour-packages" element={<TourPackageReportPage />} />
        <Route path="/reports/accommodations" element={<AccommodationReportPage />} />
        <Route path="/reports/meals" element={<MealsReportPage />} />
        <Route path="/reports/blogs" element={<BlogsReportPage />} />
        <Route path="/reports/vehicles" element={<VehicleReportPage />} />
        <Route path="/reports/feedbacks" element={<FeedbacksReportPage />} />
        <Route path="/reports/complaints" element={<ComplaintsReportPage />} />
        <Route path="/reports/inventory" element={<InventoryReportPage />} />
        <Route path="/reports/users" element={<UsersReportPage />} />
        <Route path="/reports/finance" element={<FinanceReportPage />} />
        <Route path="/reports/bookings" element={<BookingsReportPage />} />

        {/* ---------- Settings ---------- */}

        <Route path="/profile/settings" element={<ManageProfile/>} />
        <Route path="/profile/settings-cus" element={<ManageProfileCus/>} />

        {/* ---------- Fallback ---------- */}
        <Route path="*" element={<h1 className="p-6">404 Not Found</h1>} />
        
      </Routes>

      <Footer />
      <BackToTop />
    </BrowserRouter>
  );
}

export default App;

