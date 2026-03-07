import { useState, useEffect } from 'react';
import { Moon, Sun, Activity, Grid } from 'lucide-react';

interface HomeProps {
  onSelect: (app: 'particles' | 'conway' | 'replicator' | 'automata') => void;
}

export default function Home({ onSelect }: HomeProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="home-container">
      <div className="home-header">
        <button
          className="theme-toggle-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Cambiar Tema"
          style={{ position: 'absolute', top: '1rem', right: '1rem' }}
        >
          {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      <div className="home-content">
        <h1 className="home-title">Máquinas de Vida</h1>
        <p className="home-subtitle">Laboratorio de simulación interactiva de sistemas complejos</p>

        <div className="app-cards-container">
          <button className="app-card" onClick={() => onSelect('particles')}>
            <div className="app-card-icon">
              <Activity size={48} />
            </div>
            <h2 className="app-card-title">Física de Partículas</h2>
            <p className="app-card-desc">Simulación gravitacional de clusters con reglas asimétricas personalizables, fuerzas magnéticas polares y control de la constante densidad cosmológica.</p>
          </button>

          <button className="app-card" onClick={() => onSelect('conway')}>
            <div className="app-card-icon">
              <Grid size={48} />
            </div>
            <h2 className="app-card-title">Autómata Celular</h2>
            <p className="app-card-desc">El clásico Juego de la Vida de Conway. Una matriz estocástica procesada por GPU donde patrones de caos infinito surgen de reglas fundamentales simples.</p>
          </button>

          <button className="app-card" onClick={() => onSelect('replicator')}>
            <div className="app-card-icon">
              <Activity size={48} />{/* Placeholder icon */}
            </div>
            <h2 className="app-card-title">Fábrica de Replicadores</h2>
            <p className="app-card-desc">Simulación 2D de cinemática inversa con cadenas de ARN interactuando con Ribosomas para ensamblar nuevas máquinas moleculares orgánicas.</p>
          </button>

          <button className="app-card" onClick={() => onSelect('automata')}>
            <div className="app-card-icon">
              <Activity size={48} />
            </div>
            <h2 className="app-card-title">Física de Enlaces</h2>
            <p className="app-card-desc">Autómata celular de partículas con enlaces químicos dinámicos, geometría molecular y reglas de vida artificial avanzadas.</p>
          </button>
        </div>
      </div>

      <style>{`
        .home-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.3s ease, color 0.3s ease;
          position: relative;
        }

        .home-content {
          max-width: 1000px;
          text-align: center;
          padding: 2rem;
        }

        .home-title {
          font-size: 4rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .home-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 4rem;
        }

        .app-cards-container {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .app-card {
          flex: 1;
          min-width: 300px;
          max-width: 400px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2.5rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .app-card:hover {
          transform: translateY(-5px);
          border-color: #3b82f6; /* A nice blue hover border */
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        [data-theme='dark'] .app-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        }

        .app-card-icon {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .app-card:hover .app-card-icon {
          color: #3b82f6;
        }

        .app-card-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
        }

        .app-card-desc {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
