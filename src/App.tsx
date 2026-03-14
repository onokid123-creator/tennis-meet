import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CourtsProvider } from './contexts/CourtsContext';

import Splash from './pages/Splash';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import PurposeSelection from './pages/PurposeSelection';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import CreateCourt from './pages/CreateCourt';
import Applications from './pages/Applications';
import Chats from './pages/Chats';
import ChatRoom from './pages/ChatRoom';
import GroupChatRoom from './pages/GroupChatRoom';
import Profile from './pages/Profile';
import TennisProfileSetup from './pages/TennisProfileSetup';
import DatingProfileSetup from './pages/DatingProfileSetup';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8F9F4] flex items-center justify-center">
      <div className="text-gray-500">로딩 중...</div>
    </div>
  );
}

function ProtectedRoute({ children, requireComplete = true }: { children: React.ReactNode; requireComplete?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/" replace />;

  if (requireComplete) {
    if (profile?.profile_completed) return <>{children}</>;
    if (!profile?.purpose) return <Navigate to="/purpose-selection" replace />;
    if (profile.purpose === 'tennis') return <Navigate to="/tennis-profile-setup" replace />;
    return <Navigate to="/dating-profile-setup" replace />;
  }

  return <>{children}</>;
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <>{children}</>;

  if (profile?.profile_completed) return <Navigate to="/home" replace />;
  if (!profile?.purpose) return <Navigate to="/purpose-selection" replace />;
  if (profile.purpose === 'tennis') return <Navigate to="/tennis-profile-setup" replace />;
  return <Navigate to="/dating-profile-setup" replace />;
}

function PurposeSelectionGuard() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/" replace />;

  if (profile?.profile_completed) return <Navigate to="/home" replace />;

  return <PurposeSelection />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthRedirect>
            <Splash />
          </AuthRedirect>
        }
      />
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <Login />
          </AuthRedirect>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthRedirect>
            <SignUp />
          </AuthRedirect>
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/purpose-selection"
        element={
          <ProtectedRoute requireComplete={false}>
            <PurposeSelectionGuard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute requireComplete={false}>
            <ProfileSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-court"
        element={
          <ProtectedRoute>
            <CreateCourt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chats"
        element={
          <ProtectedRoute>
            <Chats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <ProtectedRoute>
            <ChatRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/group-chat/:groupChatId"
        element={
          <ProtectedRoute>
            <GroupChatRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tennis-profile-setup"
        element={
          <ProtectedRoute requireComplete={false}>
            <TennisProfileSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dating-profile-setup"
        element={
          <ProtectedRoute requireComplete={false}>
            <DatingProfileSetup />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CourtsProvider>
          <AppRoutes />
        </CourtsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
