import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './app.css';
import { Toaster } from 'react-hot-toast';
import VehiclePage from './pages/VehiclePage.jsx';
import Header from './components/header.jsx';
import Footer from './components/footer.jsx';
import AdminPage from './pages/AdminPage.jsx';
import HomePage from './pages/HomePage.jsx';

function App() {
  return (
    <BrowserRouter>
    <Toaster position="top-right"/>
    <Header />
      <Routes path="/*">
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/admin/manage-vehicles" element={<VehiclePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    <Footer/>
    </BrowserRouter>
  );
}

export default App;