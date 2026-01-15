import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Interests from './pages/Interests';
import MyBubbles from './pages/MyBubbles';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/interests" element={<Interests />} />
          <Route path="/my-bubbles" element={<MyBubbles />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
