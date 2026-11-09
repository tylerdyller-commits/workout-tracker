import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import TabBar from './components/TabBar';
import Home from './screens/Home';
import Presets from './screens/Presets';
import Progress from './screens/Progress';
import History from './screens/History';
import Settings from './screens/Settings';

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/presets" element={<Presets />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </HashRouter>
  );
}
