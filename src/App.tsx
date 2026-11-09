import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import TabBar from './components/TabBar';
import RestTimerProvider from './components/RestTimerProvider';
import Home from './screens/Home';
import Presets from './screens/Presets';
import PresetEditor from './screens/PresetEditor';
import LiveWorkout from './screens/LiveWorkout';
import Progress from './screens/Progress';
import History from './screens/History';
import Settings from './screens/Settings';

function Shell() {
  // The live workout is full-screen, over the tabs.
  const { pathname } = useLocation();
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/presets" element={<Presets />} />
        <Route path="/presets/:id" element={<PresetEditor />} />
        <Route path="/workout" element={<LiveWorkout />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {pathname !== '/workout' && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <RestTimerProvider>
        <Shell />
      </RestTimerProvider>
    </HashRouter>
  );
}
