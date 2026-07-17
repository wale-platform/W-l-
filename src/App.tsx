/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { HomePage } from './pages/Home';
import { PropertiesPage } from './pages/Properties';
import { PropertyDetailsPage } from './pages/PropertyDetails';
import { LoginPage } from './pages/Login';
import { TenantDashboard } from './pages/dashboard/TenantDashboard';
import { LandlordDashboard } from './pages/dashboard/LandlordDashboard';
import { AIHomeMatchPage } from './pages/AIHomeMatch';
import { ChatPage } from './pages/Chat';
import { BookingPage } from './pages/Booking';

import { MapExplorer } from './pages/map/MapExplorer';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailsPage />} />
              <Route path="/map" element={<MapExplorer />} />
              <Route path="/ai-match" element={<AIHomeMatchPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard/tenant" element={<TenantDashboard />} />
              <Route path="/dashboard/landlord" element={<LandlordDashboard />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/booking" element={<BookingPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}


