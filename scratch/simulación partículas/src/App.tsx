import { useState } from 'react';
import Home from './Home';
import ParticleApp from './ParticleApp';
import ConwayApp from './ConwayApp';
import ReplicatorApp from './ReplicatorApp';
import AutomataApp from './AutomataApp';

export type AppState = 'home' | 'particles' | 'conway' | 'replicator' | 'automata';

export default function App() {
  const [currentApp, setCurrentApp] = useState<AppState>('home');

  const renderApp = () => {
    switch (currentApp) {
      case 'home':
        return <Home onSelect={(app) => setCurrentApp(app)} />;
      case 'particles':
        return <ParticleApp goBack={() => setCurrentApp('home')} />;
      case 'conway':
        return <ConwayApp goBack={() => setCurrentApp('home')} />;
      case 'replicator':
        return <ReplicatorApp goBack={() => setCurrentApp('home')} />;
      case 'automata':
        return <AutomataApp goBack={() => setCurrentApp('home')} />;
      default:
        return <Home onSelect={(app) => setCurrentApp(app)} />;
    }
  };

  return (
    <>
      {renderApp()}
    </>
  );
}
