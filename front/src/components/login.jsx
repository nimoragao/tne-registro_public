import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://tne-registro.onrender.com";

const Login = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Si ya está logueado, redirigir
  useEffect(() => {
    const token = localStorage.getItem("userRole");
    if (token) {
        navigate(token === 'admin' ? "/estadisticas" : "/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("userRole", data.role); 
        localStorage.setItem("userEmail", email);
        
        if (data.role === 'admin') {
            navigate("/estadisticas");
        } else {
            navigate("/dashboard");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || "Acceso denegado. Verifica tu correo.");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Error de conexión. ¿Está encendido el backend?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <style>{`
        /* RESET BÁSICO PARA ASEGURAR PANTALLA COMPLETA */
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }

        /* CONTENEDOR QUE OCUPA TODO Y CENTRA */
        .login-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center; /* Centrado Horizontal */
            align-items: center;     /* Centrado Vertical */
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* Fondo degradado moderno */
            z-index: 9999; /* Por encima de todo */
            font-family: 'Segoe UI', Roboto, sans-serif;
        }

        /* TARJETA DE LOGIN */
        .login-card {
            background: white;
            padding: 45px;
            border-radius: 16px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.2); /* Sombra profunda para efecto flotante */
            width: 100%;
            max-width: 380px;
            text-align: center;
            animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .login-icon { font-size: 3.5rem; margin-bottom: 15px; display: block; }
        
        .login-title { 
            color: #2d3748; 
            margin: 0 0 10px 0; 
            font-size: 1.8rem; 
            font-weight: 700; 
        }
        
        .login-desc { 
            color: #718096; 
            margin: 0 0 30px 0; 
            font-size: 0.95rem; 
            line-height: 1.5;
        }
        
        /* INPUTS Y BOTONES */
        .form-group { margin-bottom: 20px; text-align: left; }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #4a5568;
        }

        .form-input { 
            width: 100%; 
            padding: 14px 15px; 
            border: 2px solid #e2e8f0; 
            border-radius: 8px; 
            font-size: 1rem; 
            transition: all 0.2s; 
            box-sizing: border-box;
            outline: none;
        }
        .form-input:focus { 
            border-color: #667eea; 
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15); 
        }
        
        .btn-submit { 
            width: 100%; 
            padding: 14px; 
            background: linear-gradient(to right, #667eea, #764ba2); 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 1rem; 
            font-weight: 600; 
            cursor: pointer; 
            transition: transform 0.1s, opacity 0.2s; 
            margin-top: 10px;
        }
        .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-submit:active { transform: translateY(1px); }
        .btn-submit:disabled { background: #cbd5e0; cursor: not-allowed; transform: none; }
        
        /* MENSAJES DE ERROR */
        .alert-error { 
            background-color: #fff5f5; 
            color: #c53030; 
            padding: 12px; 
            border-radius: 8px; 
            margin-bottom: 25px; 
            font-size: 0.9rem; 
            border: 1px solid #feb2b2;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .footer-text {
            margin-top: 25px; 
            font-size: 0.8rem; 
            color: #a0aec0;
        }
      `}</style>

      <div className="login-card">
        <span className="login-icon">🔐</span>
        <h1 className="login-title">Acceso TNE</h1>
        <p className="login-desc">Portal de gestión de entregas</p>

        {error && (
            <div className="alert-error">
                <span>⚠️</span> {error}
            </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Correo Institucional</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="nombre@iplacex.cl" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              autoFocus
            />
          </div>
          
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Autenticando..." : "Ingresar"}
          </button>
        </form>
        
        <div className="footer-text">
          &copy; {new Date().getFullYear()} Sistema de Control TNE
        </div>
      </div>
    </div>
  );
};

export default Login;