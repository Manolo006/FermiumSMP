import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
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
            <Route path="/hall-of-fame" element={<PlaceholderPage title="Hall of Fame" />} />
            <Route path="/world" element={<PlaceholderPage title="World Map" />} />
            <Route path="/tools/storage" element={<PlaceholderPage title="Storage" />} />
            <Route path="/tools/archive" element={<PlaceholderPage title="Archive" />} />
            <Route path="/tools/status" element={<PlaceholderPage title="Server Status" />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </Router>
    </LanguageProvider>
  );
};

export default App;
