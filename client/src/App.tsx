import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from "react";
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LogMeal from './pages/LogMeal';
import Layout from "./components/Layout";

function App() {
  // useState within useEffect creates unneeded re-renders, better to check boolean val at start of render
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem("token"),
  );

  const login = (token: string) => {
    localStorage.setItem("token", token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login onLogin={login} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route
          path="/register"
          element={
            !isAuthenticated ? (
              <Register onRegister={login} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        <Route
          element={
            isAuthenticated ? (
              <Layout onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log-meal" element={<LogMeal />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
