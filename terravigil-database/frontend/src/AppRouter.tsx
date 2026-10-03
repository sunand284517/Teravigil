import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { OperationsPage } from './pages/OperationsPage';
import { LiveConsolePage } from './pages/LiveConsolePage';
import { SessionsPage } from './pages/SessionsPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { DetectionsPage } from './pages/DetectionsPage';
import { DetectionDetailPage } from './pages/DetectionDetailPage';
import { RiskMapPage } from './pages/RiskMapPage';
import { RoutePlannerPage } from './pages/RoutePlannerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ModelInferencePage } from './pages/ModelInferencePage';

import { SystemPage } from './pages/SystemPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { BriefingPage } from './pages/BriefingPage';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<OperationsPage />} />
          <Route path="/live" element={<LiveConsolePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/detections" element={<DetectionsPage />} />
          <Route path="/detections/:id" element={<DetectionDetailPage />} />
          <Route path="/risk-map" element={<RiskMapPage />} />
          <Route path="/route" element={<RoutePlannerPage />} />
          {/* Old address kept working: the page was renamed, not removed. */}
          <Route path="/safe-path" element={<Navigate to="/route" replace />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/model" element={<ModelInferencePage />} />

          <Route path="/system" element={<SystemPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
