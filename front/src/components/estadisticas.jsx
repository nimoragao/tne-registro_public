import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE_URL = 'https://tne-registro.onrender.com'; 

const StatCard = ({ title, value, description, icon, className }) => (
  <div className={`stat-card ${className || ''}`}>
    <div className="stat-header">
      <span className="stat-icon">{icon}</span>
      <h3 className="stat-title">{title}</h3>
    </div>
    <p className="stat-value">{value}</p>
    <p className="stat-description" dangerouslySetInnerHTML={{ __html: description }} />
  </div>
);

const Estadisticas = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
        if (!response.ok) throw new Error(`Error conexión: ${response.status}`);
        const data = await response.json();
        if (data.status !== 'ok') throw new Error('El backend no devolvió un estado OK');
        setStats(data);
        setError(null);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setError("No se pudieron cargar los datos. Revisa que 'python main.py' esté corriendo.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []); 

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Cargando datos de Azure... ☁️</div>;
  if (error) return <div style={{ padding: '40px', color: 'red', fontWeight: 'bold', textAlign: 'center' }}>⚠️ {error}</div>;
  if (!stats) return null; 

  const chartWidth = stats.historial && stats.historial.length > 0 
    ? Math.max(300, stats.historial.length * 20) 
    : '100%';

  return (
    <div className="dashboard-wrapper">
      <style>{`
        .dashboard-wrapper { padding: 15px; max-width: 1200px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; }
        
        .header-dash { border-bottom: 1px solid #eee; margin-bottom: 20px; padding-bottom: 10px; }
        .header-dash h1 { color: #333; margin: 0 0 5px 0; font-size: 1.5rem; }
        .last-update { color: #888; font-size: 0.8rem; margin: 0; font-style: italic; }
        
        .dashboard-layout {
            display: grid;
            grid-template-columns: 380px 1fr; 
            gap: 20px;
            align-items: start;
        }

        /* Columna Izquierda (Tarjetas + Ranking) */
        .left-column {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 15px; 
        }
        
        .stat-card { 
            background: white; border-radius: 8px; padding: 15px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid #ccc; 
            transition: transform 0.2s ease; 
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .stat-card.green { border-left-color: #2ecc71; }
        .stat-card.yellow { border-left-color: #f1c40f; }
        .stat-card.blue { border-left-color: #3498db; }
        .stat-card.purple { border-left-color: #9b59b6; }
        
        .stat-header { display: flex; align-items: center; margin-bottom: 10px; }
        .stat-icon { font-size: 1.2rem; margin-right: 8px; }
        .stat-title { margin: 0; font-size: 0.75rem; font-weight: 600; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 1.6rem; font-weight: bold; margin: 0 0 5px 0; color: #2c3e50; } 
        .stat-description { font-size: 0.75rem; color: #95a5a6; margin: 0; line-height: 1.3; }
        .stat-description strong { color: #333; font-weight: 600; }

        /* ESTILOS RANKING */
        .ranking-card {
            background: white; border-radius: 8px; padding: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            border-top: 3px solid #f1c40f; /* Color dorado para ranking */
        }
        .ranking-title { margin: 0 0 15px 0; color: #2c3e50; font-size: 1rem; font-weight: 600; display: flex; align-items: center; }
        .ranking-list { list-style: none; padding: 0; margin: 0; }
        .ranking-item { 
            display: flex; justify-content: space-between; align-items: center; 
            padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem;
        }
        .ranking-item:last-child { border-bottom: none; }
        .ranking-name { color: #555; font-weight: 500; text-transform: capitalize; }
        .ranking-badge { 
            background: #f0f2f5; color: #333; padding: 2px 8px; 
            border-radius: 12px; font-size: 0.8rem; font-weight: bold; 
        }
        .medal { margin-right: 8px; }

        /* ESTILOS GRÁFICO */
        .chart-container { 
            background: white; border-radius: 8px; padding: 15px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-top: 3px solid #3498db; 
            display: flex; flex-direction: column; height: 320px; 
        }
        .chart-title { margin: 0 0 10px 0; color: #2c3e50; font-size: 1rem; display: flex; align-items: center; }
        .chart-scroll-area { width: 100%; flex-grow: 1; overflow-x: auto; overflow-y: hidden; padding-bottom: 5px; }
        .chart-scroll-area::-webkit-scrollbar { height: 6px; }
        .chart-scroll-area::-webkit-scrollbar-track { background: #f5f5f5; border-radius: 3px; }
        .chart-scroll-area::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

        @media (max-width: 1024px) {
            .dashboard-layout { grid-template-columns: 1fr; }
            .chart-container { height: auto; min-height: 300px; }
        }
      `}</style>

      <div className="header-dash">
        <h1>📊 Panel de Control TNE</h1>
        <p className="last-update">Datos en vivo de Azure • Actualizado: {new Date().toLocaleTimeString('es-CL')}</p>
      </div>

      <div className="dashboard-layout">
        
        {/* COLUMNA IZQUIERDA (AGRUPADA) */}
        <div className="left-column">
            {/* 1. Tarjetas Resumen */}
            <div className="stats-grid">
                <StatCard title="Total Registros" value={stats.total_registros} description="Total alumnos." icon="📚" className="purple" />
                <StatCard title="Entregadas" value={stats.entregados_total} description={`Avance: <strong>${stats.porcentaje_entregado}%</strong>.`} icon="✅" className="green" />
                <StatCard title="Pendientes" value={stats.pendientes_total} description="Por retirar." icon="⏳" className="yellow" />
                <StatCard title="Entregas Hoy" value={stats.entregados_hoy} description="Gestión diaria." icon="🚀" className="blue" />
            </div>

            {/* 2. Ranking de Responsables (NUEVO) */}
            <div className="ranking-card">
                <h3 className="ranking-title">🏆 Ranking Tutores</h3>
                {stats.ranking && stats.ranking.length > 0 ? (
                    <ul className="ranking-list">
                        {stats.ranking.map((item, index) => (
                            <li key={index} className="ranking-item">
                                <span className="ranking-name">
                                    {index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '👤 '}
                                    {item.nombre.toLowerCase()}
                                </span>
                                <span className="ranking-badge">{item.cantidad}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>Sin datos de responsables aún.</p>
                )}
            </div>
        </div>

        {/* COLUMNA DERECHA: GRÁFICO */}
        <div className="chart-container">
            <h3 className="chart-title">📅 Evolución Histórica</h3>
            <div className="chart-scroll-area">
                <div style={{ width: chartWidth, height: 260 }}> 
                    {stats.historial && stats.historial.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.historial} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="fecha" 
                                    tick={{fontSize: 9}} 
                                    interval={1} 
                                    tickFormatter={(value) => value.split('-').slice(1).join('/')} 
                                />
                                <YAxis allowDecimals={false} tick={{fontSize: 10}} />
                                <Tooltip contentStyle={{ borderRadius: '5px', fontSize: '12px', padding: '5px' }} />
                                <Bar dataKey="cantidad" name="Entregas" fill="#3498db" radius={[3, 3, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#ccc' }}>
                            <p style={{ fontSize: '1.5rem', margin: 1 }}>📉</p>
                            <p style={{ fontSize: '0.9rem' }}>Sin historial</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Estadisticas;