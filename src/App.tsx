import AppLifecycleBridge from './AppLifecycleBridge';
import AppLaunchSplash from './AppLaunchSplash';
import AppVersionGate from './AppVersionGate';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import PushNotificationBootstrap from './PushNotificationBootstrap';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CourtsProvider } from './contexts/CourtsContext';
import { registerPlugin } from '@capacitor/core';

interface AppPlugin {
  addListener(
    event: 'backButton',
    handler: (data: { canGoBack: boolean }) => void
  ): Promise<{ remove: () => void }>;
}

const CapacitorApp = registerPlugin<AppPlugin>('App');

import Splash from './pages/Splash';
import Login from './pages/Login';

const SignUp = lazy(() => import('./pages/SignUp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PurposeSelection = lazy(() => import('./pages/PurposeSelection'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const Home = lazy(() => import('./pages/Home'));
const CreateCourt = lazy(() => import('./pages/CreateCourt'));
const Applications = lazy(() => import('./pages/Applications'));
const Chats = lazy(() => import('./pages/Chats'));
const ChatRoom = lazy(() => import('./pages/ChatRoom'));
const GroupChatRoom = lazy(() => import('./pages/GroupChatRoom'));
const Profile = lazy(() => import('./pages/Profile'));
const TennisProfileSetup = lazy(() => import('./pages/TennisProfileSetup'));
const DatingProfileSetup = lazy(() => import('./pages/DatingProfileSetup'));
const InquiryPage = lazy(() => import('./pages/InquiryPage'));
const BlockedUsers = lazy(() => import('./pages/BlockedUsers'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8F9F4] flex items-center justify-center">
      <div className="text-gray-500">로딩 중...</div>
    </div>
  );
}

function ProtectedRoute({
  children,
  requireComplete = true,
}: {
  children: React.ReactNode;
  requireComplete?: boolean;
}) {
  const { user, profile, loading } = useAuth();
  // profile 로드 타임아웃: user는 있는데 profile이 5초 넘게 안 오면
  // 무한 로딩(백지) 대신 그냥 진행시킨다.
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  useEffect(() => {
    if (!user || profile) {
      setProfileTimedOut(false);
      return;
    }
    const t = setTimeout(() => setProfileTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [user, profile]);

  if (loading) return <LoadingScreen />;
  // user는 있는데 profile이 아직 없음 → 5초까지만 기다림
  if (user && !profile && !profileTimedOut) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;

  // profile이 타임아웃됐는데도 없으면 일단 통과시킴 (화면 안에서 다시 로드)
  if (requireComplete) {
    if (profile?.profile_completed) return <>{children}</>;
    if (profile && !profile.purpose) return <Navigate to="/purpose-selection" replace />;
    if (profile?.purpose === 'tennis') return <Navigate to="/tennis-profile-setup" replace />;
    if (profile?.purpose === 'dating') return <Navigate to="/dating-profile-setup" replace />;
    // profile이 아예 없으면(타임아웃) 일단 children 렌더 → 화면에서 복구
    return <>{children}</>;
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

const ROOT_PATHS = ['/', '/home', '/login', '/signup'];

function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    CapacitorApp.addListener('backButton', () => {
      const path = location.pathname;
      const isRoot = ROOT_PATHS.includes(path);

      if (!isRoot) {
        navigate(-1);
        return;
      }

      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        (navigator as { app?: { exitApp?: () => void } }).app?.exitApp?.();
      } else {
        lastBackPress.current = now;
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [navigate, location.pathname]);

  return null;
}

function PendingPushRouteHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const moveToPendingRoute = () => {
      const pendingRoute = localStorage.getItem('pending_push_route');
      if (!pendingRoute) return;

      localStorage.removeItem('pending_push_route');
      navigate(pendingRoute, { replace: true });
    };

    moveToPendingRoute();

    window.addEventListener('push-route-ready', moveToPendingRoute);
    return () => {
      window.removeEventListener('push-route-ready', moveToPendingRoute);
    };
  }, [navigate]);

  return null;
}

// AppLifecycleBridge가 background 복귀 시 reload하기 직전에
// sessionStorage에 저장해둔 경로로 복귀시킨다.
// (reload하면 무조건 "/"로 가는데, 사용자는 보던 화면으로 돌아가길 원함)
function ResumePathHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    let resumePath: string | null = null;
    try {
      resumePath = sessionStorage.getItem('resume_path');
    } catch {
      resumePath = null;
    }
    if (resumePath && resumePath !== '/' && resumePath !== window.location.pathname) {
      sessionStorage.removeItem('resume_path');
      navigate(resumePath, { replace: true });
    } else if (resumePath) {
      sessionStorage.removeItem('resume_path');
    }
  }, [navigate]);

  return null;
}


function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
  <BackButtonHandler />
  <PendingPushRouteHandler />
  <ResumePathHandler />
  
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
        <Route path="/reset-password" element={<ResetPassword />} />
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
        <Route
          path="/inquiry"
          element={
            <ProtectedRoute>
              <InquiryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blocked-users"
          element={
            <ProtectedRoute>
              <BlockedUsers />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

if (showSplash) {
  return <AppLaunchSplash onFinish={() => setShowSplash(false)} />;
}
  return (
    <BrowserRouter>
      <AppVersionGate />
      <PushNotificationBootstrap />
      <AuthProvider>
        <CourtsProvider>
          <AppLifecycleBridge />
          <AppRoutes />
        </CourtsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;