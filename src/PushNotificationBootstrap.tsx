import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';
import { supabase } from './lib/supabase';

export default function PushNotificationBootstrap() {
  const navigate = useNavigate();

  useEffect(() => {
    const saveFcmToken = async (userId: string, tokenValue: string) => {
  await supabase
    .from('profiles')
    .update({ fcm_token: tokenValue })
    .eq('user_id', userId);
};
      
   

    const registerAndSaveToken = async () => {
      try {
        if (!Capacitor.isNativePlatform()) {
          
          return;
        }

        const permission = await PushNotifications.requestPermissions();
       

        if (permission.receive !== 'granted') {
          
          return;
        }

        await PushNotifications.register();
        
        const fcmToken = await FCM.getToken();
       

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          localStorage.setItem('pending_fcm_token', fcmToken.token);
          
          return;
        }

        await saveFcmToken(user.id, fcmToken.token);
        localStorage.removeItem('pending_fcm_token');
      } catch (e) {
        
      }
    };

    PushNotifications.addListener('registrationError', (err) => {
     
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PUSH RECEIVED]', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const data = notification.notification.data;
      const type = data?.type;
      const chatId = data?.chatId;

      if (type === 'chat' && chatId) {
        navigate(`/chat/${chatId}`);
        return;
      }

      if (type === 'meal_proposal') {
        navigate('/applications');
        return;
      }

      if (
        (type === 'meal_proposal_accepted' ||
          type === 'meal_proposal_rejected' ||
          type === 'match_confirmed' ||
          type === 'match_cancelled') &&
        chatId
      ) {
        navigate(`/chat/${chatId}`);
        return;
      }

      if (type === 'match') {
        navigate('/applications');
        return;
      }

      if (type === 'court') {
        navigate('/home');
      }
    });

    registerAndSaveToken();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const pendingToken = localStorage.getItem('pending_fcm_token');

      if (session?.user && pendingToken) {
        await saveFcmToken(session.user.id, pendingToken);
        localStorage.removeItem('pending_fcm_token');
      }

      if (session?.user && Capacitor.isNativePlatform()) {
        await registerAndSaveToken();
      }
    });

    return () => {
      PushNotifications.removeAllListeners();
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}