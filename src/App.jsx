import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './app.css';
import { Toaster } from 'react-hot-toast';
import VehiclePage from './pages/VehiclePage.jsx';
import Header from './components/header.jsx';
import Footer from './components/footer.jsx';

function App() {
  return (
    <BrowserRouter>
    <Toaster position="top-right"/>
    <Header />
      <Routes path="/*">
        <Route path="/vehicles/*" element={<VehiclePage />} />
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    <Footer/>
    </BrowserRouter>
  );
}

export default App;