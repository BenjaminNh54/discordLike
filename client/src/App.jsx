import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";  
import { AuthProvider, useAuth } from "./context/AuthContext";  
import Landing from "./pages/Landing";  
import Login from "./pages/Login";  
import Register from "./pages/Register";  
import Home from "./pages/Home";  
import Chat from "./pages/Chat";  
import Admin from "./pages/Admin";  
import "./App.css";  
  
function PrivateRoute({ children }) {  
  const { user, loading } = useAuth();  
  if (loading) return <div className="loading-screen">Chargement...</div>;  
  return user ? children : <Navigate to="/login" />;  
}  
  
function PublicRoute({ children }) {  
  const { user, loading } = useAuth();  
  if (loading) return <div className="loading-screen">Chargement...</div>;  
  return !user ? children : <Navigate to="/home" />;  
}  
  
function App() {  
  return (  
    <AuthProvider>  
      <BrowserRouter>  
        <Routes>  
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />  
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />  
          <Route path="/" element={<Landing />} />  
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />  
          <Route path="/chat/:groupId" element={<PrivateRoute><Chat /></PrivateRoute>} />  
          <Route path="/admin" element={<Admin />} />  
        </Routes>  
      </BrowserRouter>  
    </AuthProvider>  
  );  
}  
  
export default App;
