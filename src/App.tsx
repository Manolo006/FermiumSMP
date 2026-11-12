import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { TmcToolsPage } from './pages/TmcToolsPage';
import { ArchivePage } from './pages/ArchivePage';
import { WorldMapPage } from './pages/WorldMapPage';
import { ChunkLoaderPage } from './pages/ChunkLoaderPage';
import { EnchantingPage } from './pages/EnchantingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<PlaceholderPage title="About" />} />
            <Route path="/members" element={<PlaceholderPage title="Members" />} />
            <Route path="/members/:id" element={<PlaceholderPage title="Member Profile" />} />
            <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
            <Route path="/projects/:id" element={<PlaceholderPage title="Project Detail" />} />
            <Route path="/gallery" element={<PlaceholderPage title="Gallery" />} />
            <Route path="/timeline" element={<PlaceholderPage title="Timeline" />} />
            <Route path="/world" element={<WorldMapPage />} />
            <Route path="/tools/storage" element={<TmcToolsPage />} />
            <Route path="/tools/calculators" element={<TmcToolsPage />} />
            <Route path="/tools/chunk-loader" element={<ChunkLoaderPage />} />
            <Route path="/tools/enchanting" element={<EnchantingPage />} />
            <Route path="/tools/archive" element={<ArchivePage />} />
            <Route path="/tools/status" element={<PlaceholderPage title="Server Status" />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </Router>
    </LanguageProvider>
  );
};

export default App;
