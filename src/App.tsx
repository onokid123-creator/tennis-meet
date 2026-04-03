import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CourtsProvider } from './contexts/CourtsContext';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
interface AppPlugin {
  addListener(event: 'backButton', handler: (data: { canGoBack: boolean }) => void): Promise<{ remove: () => void }>;
}
const CapacitorApp = registerPlugin<AppPlugin>('App');

import Splash from './pages/Splash';
import Login from './pages/Login';

const SignUp = lazy(() => import('./pages/SignUp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8F9F4] flex items-center justify-center">
      <div className="text-gray-500">로딩 중...</div>
    </div>
  );
}
function PushNotificationBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;

    const setupPush = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions();

        let finalStatus = permStatus;
if (permStatus.receive === 'prompt') {
  alert('권한 요청 시작');
  finalStatus = await PushNotifications.requestPermissions();
}

        if (finalStatus.receive !== 'granted') {
          console.log('푸시 알림 권한 거부됨');
          return;
        }

        await PushNotifications.register();
      } catch (error) {
        console.error('푸시 초기화 실패:', error);
      }
    };

    PushNotifications.addListener('registration', (token: Token) => {
  if (!isMounted) return;
  alert('FCM token: ' + token.value);
  console.log('FCM token:', token.value);
});

    PushNotifications.addListener('registrationError', (error) => {
      console.error('푸시 등록 에러:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('푸시 수신:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('푸시 클릭:', notification);
    });

    setupPush();

    return () => {
      isMounted = false;
      PushNotifications.removeAllListeners();
    };
  }, []);

  return null;
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

const ROOT_PATHS = ['/', '/home', '/login', '/signup'];

function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const path = location.pathname;
      const isRoot = ROOT_PATHS.includes(path);

      if (!isRoot && canGoBack) {
        navigate(-1);
        return;
      }

      if (!isRoot && !canGoBack) {
        navigate('/home', { replace: true });
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

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BackButtonHandler />
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
        <Route
          path="/inquiry"
          element={
            <ProtectedRoute>
              <InquiryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CourtsProvider>
          <PushNotificationBootstrap />
          <AppRoutes />
        </CourtsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
