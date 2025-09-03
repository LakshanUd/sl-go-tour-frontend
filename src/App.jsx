import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './app.css';
import { Toaster } from 'react-hot-toast';
import VehiclePage from './pages/VehiclePage.jsx';
import Header from './components/header.jsx';
import Footer from './components/footer.jsx';
import AdminPage from './pages/AdminPage.jsx';
import HomePage from './pages/HomePage.jsx';
import CustomerMeals from './pages/CustomerMeals.jsx'
import AdminMeals from './pages/AdminMeals.jsx'
import AdminFeedback from './pages/AdminFeedback.jsx'
import CustomerFeedback from './pages/CustomerFeedback.jsx'



function App() {
  return (
    <BrowserRouter>
    <Toaster position="top-right"/>
    <Header />
      <Routes path="/*">
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/admin/manage-vehicles" element={<VehiclePage />} />
        <Route path="/admin/manage-meals" element={<CustomerMeals />} />
        <Route path="/meals" element={<AdminMeals />} />
        <Route path="/admin/manage-feedbacks" element={<AdminFeedback />} />
        <Route path="/feedbacks" element={<CustomerFeedback />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    <Footer/>
    </BrowserRouter>
  );
}

export default App;