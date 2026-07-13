import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FCM } from '@capacitor-community/fcm';
import { supabase } from './lib/supabase';

let pushInitialized = false;
let pushRegistering = false;
let lastSavedToken: string | null = null;

type NotificationData = Record<string, unknown>;

const normalizeNotificationData = (value: unknown): NotificationData => {
  if (!value || typeof value !== 'object') return {};
  return value as NotificationData;
};

const readNotificationString = (
  data: NotificationData,
  keys: string[]
): string | null => {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getNotificationChatId = (data: NotificationData): string | null =>
  readNotificationString(data, [
    'chatId',
    'chat_id',
    'groupChatId',
    'group_chat_id',
  ]);

const getCurrentOpenChatId = (): string | null => {
  const match = window.location.pathname.match(
    /^\/(?:chat|group-chat|groupchat)\/([^/?#]+)/
  );

  return match?.[1] || null;
};

const createLocalNotificationId = (): number =>
  Math.floor(Date.now() % 2_000_000_000);

export default function PushNotificationBootstrap() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);

  const navigateFromNotificationData = (rawData: unknown) => {
    const data = normalizeNotificationData(rawData);
    const type = readNotificationString(data, ['type']);
    const chatId = getNotificationChatId(data);

    if (type === 'chat' && chatId) {
      navigateRef.current(`/chat/${chatId}`);
      return;
    }

    if (
      type === 'meal_proposal' ||
      type === 'application_accepted' ||
      type === 'application_rejected' ||
      type === 'match'
    ) {
      navigateRef.current('/applications');
      return;
    }

    if (
      (type === 'meal_proposal_accepted' ||
        type === 'meal_proposal_rejected' ||
        type === 'match_confirmed' ||
        type === 'match_cancelled') &&
      chatId
    ) {
      navigateRef.current(`/chat/${chatId}`);
      return;
    }

    if (type === 'court') {
      navigateRef.current('/home');
    }
  };

  const ensureLocalNotificationPermission = async () => {
    const current = await LocalNotifications.checkPermissions();

    if (current.display === 'granted') {
      return true;
    }

    if (
      current.display === 'prompt' ||
      current.display === 'prompt-with-rationale'
    ) {
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted';
    }

    return false;
  };

  const showForegroundNotification = async (
    notification: PushNotificationSchema
  ) => {
    const data = normalizeNotificationData(notification.data);
    const type = readNotificationString(data, ['type']);
    const notificationChatId = getNotificationChatId(data);
    const currentChatId = getCurrentOpenChatId();

    if (
      type === 'chat' &&
      notificationChatId &&
      currentChatId === notificationChatId
    ) {
      console.log(
        '[PUSH] foreground same chat notification suppressed',
        notificationChatId
      );
      return;
    }

    const permissionGranted = await ensureLocalNotificationPermission();

    if (!permissionGranted) {
      console.warn('[PUSH] local notification permission not granted');
      return;
    }

    const title =
      notification.title ||
      readNotificationString(data, ['title', 'senderName', 'sender_name']) ||
      '테니스미트';

    const body =
      notification.body ||
      readNotificationString(data, ['body', 'message', 'content']) ||
      '새 알림이 도착했습니다.';

    await LocalNotifications.schedule({
      notifications: [
        {
          id: createLocalNotificationId(),
          title,
          body,
          extra: data,
        },
      ],
    });

    console.log('[PUSH] foreground local notification displayed', {
      type,
      notificationChatId,
    });
  };

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (pushInitialized) {
      console.log('[PUSH] bootstrap skipped: already initialized');
      return;
    }

    pushInitialized = true;
    console.log('[PUSH] bootstrap start');

    const saveFcmToken = async (userId: string, tokenValue: string) => {
      if (!tokenValue) return;

      const cacheKey = `${userId}:${tokenValue}`;
      if (lastSavedToken === cacheKey) {
        console.log('[PUSH] save skipped: same token');
        return;
      }

      console.log('[PUSH] saveFcmToken start', userId, 'TOKEN_EXISTS');

      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: tokenValue })
        .eq('user_id', userId);

      if (error) {
        console.error('[PUSH] saveFcmToken error', error);
      } else {
        lastSavedToken = cacheKey;
        console.log('[PUSH] saveFcmToken success');
      }
    };

    const registerAndSaveToken = async () => {
      if (pushRegistering) {
        console.log('[PUSH] register skipped: already running');
        return;
      }

      pushRegistering = true;

      try {
        if (!Capacitor.isNativePlatform()) {
          console.log('[PUSH] skip: not native platform');
          return;
        }

        const permission = await PushNotifications.requestPermissions();
        console.log('[PUSH] permission', permission);

        if (permission.receive !== 'granted') {
          console.warn('[PUSH] permission not granted');
          return;
        }

        await PushNotifications.register();
        console.log('[PUSH] native push registered');

        // iOS can set the APNS device token slightly after register().
        // Wait briefly before requesting the FCM token, then retry enough times.
        await new Promise((resolve) => setTimeout(resolve, 1500));

        let tokenValue: string | null = null;

        for (let i = 0; i < 8; i += 1) {
          try {
            const fcmToken = await FCM.getToken();
            tokenValue = fcmToken?.token || null;
            if (tokenValue) break;
          } catch (e) {
            console.warn('[PUSH] FCM getToken retry', i + 1, e);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        console.log('[PUSH] fcm token result', tokenValue ? 'TOKEN_EXISTS' : 'NO_TOKEN');

        if (!tokenValue) return;

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        console.log('[PUSH] current user', user?.id || 'NO_USER');

        if (!user) {
          localStorage.setItem('pending_fcm_token', tokenValue);
          console.log('[PUSH] token saved to pending_fcm_token');
          return;
        }

        await saveFcmToken(user.id, tokenValue);
        localStorage.removeItem('pending_fcm_token');
      } catch (e) {
        console.error('[PUSH] registerAndSaveToken error', e);
      } finally {
        pushRegistering = false;
      }
    };

    const setup = async () => {
      await PushNotifications.addListener('registrationError', (err) => {
        console.error('[PUSH] registrationError', err);
      });

      await PushNotifications.addListener(
        'pushNotificationReceived',
        async (notification) => {
          console.log('[PUSH RECEIVED]', notification);

          try {
            await showForegroundNotification(notification);
          } catch (error) {
            console.error(
              '[PUSH] foreground notification handling failed',
              error
            );
          }
        }
      );

      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification) => {
          navigateFromNotificationData(notification.notification.data);
        }
      );

      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (notification) => {
          navigateFromNotificationData(notification.notification.extra);
        }
      );

      await registerAndSaveToken();
    };

    setup();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const pendingToken = localStorage.getItem('pending_fcm_token');

      if (session?.user && pendingToken) {
        await saveFcmToken(session.user.id, pendingToken);
        localStorage.removeItem('pending_fcm_token');
      }

      // 앱 시작 시 이미 registerAndSaveToken을 1회 실행한다.
      // auth 이벤트마다 다시 requestPermissions/register/getToken을 호출하면 iOS 복귀/라우팅 중 요청이 반복될 수 있다.
      // 로그인 이후에는 pending_fcm_token 저장만 처리한다.
    });

    return () => {
      authListener.subscription.unsubscribe();
      // PushNotifications listener는 앱 생명주기 동안 유지한다.
      // removeAllListeners/removeListener를 호출하면 라우팅 중 재등록이 반복되어 화면 fetch와 충돌할 수 있다.
    };
  }, []);

  return null;
}
