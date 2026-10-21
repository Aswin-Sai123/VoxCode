import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CompanyDashboard from './pages/company/Dashboard';
import CreateAssessment from './pages/company/CreateAssessment';
import CandidateDashboard from './pages/candidate/Dashboard';
import AssessmentLobby from './pages/candidate/AssessmentLobby';
import InterviewRoom from './pages/candidate/InterviewRoom';
import Reports from './pages/candidate/Reports';
import ReportDetail from './pages/candidate/ReportDetail';
import AssessmentResults from './pages/company/AssessmentResults';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent = () => {
    const location = useLocation();
    const isInterviewRoom = location.pathname.includes('/candidate/interview/');

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDF0] flex flex-col antialiased selection:bg-blue-600/30 selection:text-white">
            {!isInterviewRoom && <Navbar />}
            <main className={!isInterviewRoom ? "pt-14 flex-1 flex flex-col" : "flex-1 flex flex-col"}>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Company Routes */}
                    <Route path="/company/dashboard" element={
                        <ProtectedRoute allowedRole="COMPANY">
                            <CompanyDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/company/create-assessment" element={
                        <ProtectedRoute allowedRole="COMPANY">
                            <CreateAssessment />
                        </ProtectedRoute>
                    } />
                    <Route path="/company/assessment/:id/results" element={
                        <ProtectedRoute allowedRole="COMPANY">
                            <AssessmentResults />
                        </ProtectedRoute>
                    } />

                    {/* Candidate Routes */}
                    <Route path="/candidate/dashboard" element={
                        <ProtectedRoute allowedRole="CANDIDATE">
                            <CandidateDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/candidate/reports" element={
                        <ProtectedRoute allowedRole="CANDIDATE">
                            <Reports />
                        </ProtectedRoute>
                    } />
                    <Route path="/candidate/report/:sessionId" element={
                        <ProtectedRoute>
                            <ReportDetail />
                        </ProtectedRoute>
                    } />
                    <Route path="/candidate/assessment/:code" element={
                        <ProtectedRoute allowedRole="CANDIDATE">
                            <AssessmentLobby />
                        </ProtectedRoute>
                    } />
                    <Route path="/candidate/interview/:code" element={
                        <ProtectedRoute allowedRole="CANDIDATE">
                            <InterviewRoom />
                        </ProtectedRoute>
                    } />
                </Routes>
            </main>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
};

export default App;
