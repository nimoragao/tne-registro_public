import React from "react";
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, Outlet } from "react-router-dom";
import Login from "./components/login";
import DashboardAntiguo from "./components/dashboards";
import Estadisticas from "./components/estadisticas";

// --- COMPONENTE DE NAVEGACIÓN (Solo visible si estás logueado) ---
const Navigation = () => {
  const userRole = localStorage.getItem("userRole");
  const userEmail = localStorage.getItem("userEmail");

  // Este componente asume que si se renderiza, el usuario ya está logueado.
  // Aun así, por seguridad, si no hay datos no mostramos nada o un fallback.
  if (!userRole) return null; 

  return (
    <nav style={{ 
      padding: '15px 30px', background: '#fff', borderBottom: '1px solid #eee', 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 1000
    }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🎓</span>
        
        <Link to="/dashboard" style={{ 
          textDecoration: 'none', color: '#555', fontWeight: '600', fontSize: '0.95rem'
        }}>
          Operaciones
        </Link>
        
        {userRole === 'admin' && (
          <Link to="/estadisticas" style={{ 
            textDecoration: 'none', color: '#007bff', fontWeight: '600', fontSize: '0.95rem'
          }}>
            Estadísticas
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.9rem', color: '#666' }}>
        <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
          <div style={{ fontWeight: 'bold', color: '#333' }}>{userEmail}</div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: userRole === 'admin' ? '#e67e22' : '#27ae60' }}>
            {userRole}
          </div>
        </div>
        <Link to="/" onClick={() => localStorage.clear()} style={{ 
          padding: '6px 12px', background: '#fcedec', color: '#c0392b', 
          textDecoration: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', transition: '0.2s' 
        }}>
          Salir
        </Link>
      </div>
    </nav>
  );
};

// --- LAYOUT PROTEGIDO (Envuelve las páginas internas) ---
// Este componente actúa como un "guardia" y también como el "marco" de la aplicación segura.
const ProtectedLayout = ({ allowedRoles }) => {
  const userRole = localStorage.getItem("userRole");
  const location = useLocation();

  // 1. Si no hay login -> FUERA (Redirige al Login)
  if (!userRole) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Si hay rol pero no autorizado para esta ruta específica -> DASHBOARD DEFAULT
  // (Ejemplo: un Tutor intentando entrar a /estadisticas)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Si todo OK -> Muestra Navegación + Contenido de la ruta
  return (
    <>
      <Navigation /> {/* Aquí se inyecta la barra de navegación SOLO si está autorizado */}
      <main style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: 'calc(100vh - 70px)' }}>
        <Outlet /> {/* Aquí se renderiza el componente de la ruta hija (Dashboard o Estadísticas) */}
      </main>
    </>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* RUTA PÚBLICA: LOGIN (Sin barra de navegación, ocupa toda la pantalla) */}
        <Route path="/" element={<Login />} />
        
        {/* RUTAS PROTEGIDAS (Dentro del ProtectedLayout que tiene la Navigation) */}
        
        {/* Grupo: Todos los autorizados (Tutores y Admins) pueden ver el Dashboard Operativo */}
        <Route element={<ProtectedLayout allowedRoles={['admin', 'tutor']} />}>
          <Route path="/dashboard" element={<DashboardAntiguo />} />
        </Route>

        {/* Grupo: Solo Admins pueden ver Estadísticas */}
        <Route element={<ProtectedLayout allowedRoles={['admin']} />}>
          <Route path="/estadisticas" element={<Estadisticas />} />
        </Route>

        {/* Cualquier otra ruta desconocida o intento de acceso directo -> Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;