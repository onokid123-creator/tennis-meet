import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

declare const CdvPurchase: any;

const IOS_TICKET_5_ID = 'tennis_meet_ticket';
const IOS_TICKET_10_ID = 'tennis_meet_ticket_10';
const IOS_INTEREST_TICKET_5_ID = 'tennis_meet_interest_ticket';
const IOS_INTEREST_TICKET_10_ID = 'tennis_meet_interest_ticket_10';

const ANDROID_TICKET_5_ID = 'dating_ticket_5';
const ANDROID_TICKET_10_ID = 'dating_ticket_10';
const ANDROID_INTEREST_TICKET_5_ID = 'dating_interest_ticket_5';
const ANDROID_INTEREST_TICKET_10_ID = 'dating_interest_ticket_10';

const MONTHLY_PREMIUM_ID = 'dating_monthly_premium';

let billingInitialized = false;

function isBillingAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof CdvPurchase !== 'undefined' &&
    !!(window as any).cordova
  );
}

function getNativePlatformName() {
  return Capacitor.getPlatform();
}

function getBillingPlatform() {
  const { Platform } = CdvPurchase;
  const platform = getNativePlatformName();

  if (platform === 'ios') return Platform.APPLE_APPSTORE;
  if (platform === 'android') return Platform.GOOGLE_PLAY;

  return Platform.TEST;
}

function getPlatformProductIds() {
  const platform = getNativePlatformName();

  if (platform === 'android') {
    return {
      ticket5: ANDROID_TICKET_5_ID,
      ticket10: ANDROID_TICKET_10_ID,
      interestTicket5: ANDROID_INTEREST_TICKET_5_ID,
      interestTicket10: ANDROID_INTEREST_TICKET_10_ID,
      monthlyPremium: MONTHLY_PREMIUM_ID,
    };
  }

  return {
    ticket5: IOS_TICKET_5_ID,
    ticket10: IOS_TICKET_10_ID,
    interestTicket5: IOS_INTEREST_TICKET_5_ID,
    interestTicket10: IOS_INTEREST_TICKET_10_ID,
    monthlyPremium: MONTHLY_PREMIUM_ID,
  };
}

function resolveProductId(productId: string) {
  const ids = getPlatformProductIds();
  const platform = getNativePlatformName();

  if (platform === 'android') {
    if (productId === IOS_TICKET_5_ID) return ids.ticket5;
    if (productId === IOS_TICKET_10_ID) return ids.ticket10;
    if (productId === IOS_INTEREST_TICKET_5_ID) return ids.interestTicket5;
    if (productId === IOS_INTEREST_TICKET_10_ID) return ids.interestTicket10;
  }

  if (platform === 'ios') {
    if (productId === ANDROID_TICKET_5_ID) return ids.ticket5;
    if (productId === ANDROID_TICKET_10_ID) return ids.ticket10;
    if (productId === ANDROID_INTEREST_TICKET_5_ID) return ids.interestTicket5;
    if (productId === ANDROID_INTEREST_TICKET_10_ID) return ids.interestTicket10;
  }

  return productId;
}

function isTicket5(productId: string) {
  return productId === IOS_TICKET_5_ID || productId === ANDROID_TICKET_5_ID;
}

function isTicket10(productId: string) {
  return productId === IOS_TICKET_10_ID || productId === ANDROID_TICKET_10_ID;
}

function isInterestTicket5(productId: string) {
  return productId === IOS_INTEREST_TICKET_5_ID || productId === ANDROID_INTEREST_TICKET_5_ID;
}

function isInterestTicket10(productId: string) {
  return productId === IOS_INTEREST_TICKET_10_ID || productId === ANDROID_INTEREST_TICKET_10_ID;
}

async function waitForProduct(productId: string, platform: any, timeoutMs = 8000) {
  const { store } = CdvPurchase;
  const start = Date.now();

  try {
    await store.update();
  } catch (e) {
    console.log('[billing] waitForProduct 첫 store.update 실패:', e);
  }

  while (Date.now() - start < timeoutMs) {
    const product = store.get(productId, platform);
    console.log('[billing] 상품 확인 중:', productId, product);

    if (product) return product;

    try {
      await store.update();
    } catch (e) {
      console.log('[billing] 반복 store.update 실패:', e);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
}

export async function initBilling() {
  if (!isBillingAvailable()) {
    console.log('[billing] 웹/미지원 환경이라 초기화 건너뜀');
    return;
  }

  if (billingInitialized) {
    console.log('[billing] 이미 초기화됨');
    return;
  }

  const { store, ProductType, LogLevel } = CdvPurchase;
  const platform = getBillingPlatform();
  const ids = getPlatformProductIds();

  store.verbosity = LogLevel.DEBUG;

  store.register([
    {
      id: ids.ticket5,
      type: ProductType.CONSUMABLE,
      platform,
    },
    {
      id: ids.ticket10,
      type: ProductType.CONSUMABLE,
      platform,
    },
    {
      id: ids.interestTicket5,
      type: ProductType.CONSUMABLE,
      platform,
    },
    {
      id: ids.interestTicket10,
      type: ProductType.CONSUMABLE,
      platform,
    },
    {
      id: ids.monthlyPremium,
      type: ProductType.PAID_SUBSCRIPTION,
      platform,
    },
  ]);

  store.when().productUpdated((product: any) => {
    console.log('[billing] 상품 로드됨:', product.id, product.title, product.price);
  });

  store.when().approved(async (transaction: any) => {
    console.log('[billing] 결제 승인됨:', transaction.products);

    const productId = transaction.products?.[0]?.id;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log('[billing] 로그인 유저 없음');
      transaction.finish();
      return;
    }

    if (isTicket5(productId) || isTicket10(productId)) {
      const addCount = isTicket5(productId) ? 5 : 10;

      const { data: profile } = await supabase
        .from('profiles')
        .select('ticket_count')
        .eq('user_id', user.id)
        .single();

      const currentTicketCount = profile?.ticket_count ?? 0;

      await supabase
        .from('profiles')
        .update({
          ticket_count: currentTicketCount + addCount,
        })
        .eq('user_id', user.id);
    }

    if (isInterestTicket5(productId) || isInterestTicket10(productId)) {
      const addCount = isInterestTicket5(productId) ? 5 : 10;

      const { data: profile } = await supabase
        .from('profiles')
        .select('interest_ticket_count')
        .eq('user_id', user.id)
        .single();

      const currentTicketCount = profile?.interest_ticket_count ?? 0;

      await supabase
        .from('profiles')
        .update({
          interest_ticket_count: currentTicketCount + addCount,
        })
        .eq('user_id', user.id);
    }

    if (productId === MONTHLY_PREMIUM_ID) {
      await supabase
        .from('profiles')
        .update({
          is_subscribed: true,
        })
        .eq('user_id', user.id);
    }

    transaction.finish();
  });

  store.error((error: any) => {
    console.log('[billing] 에러:', error);
  });

  const errors = await store.initialize([platform]);

  if (errors?.length) {
    console.log('[billing] initialize errors:', errors);
  }

  try {
    await store.update();
  } catch (e) {
    console.log('[billing] store.update 실패:', e);
  }

  billingInitialized = true;
  console.log('[billing] initialize 완료');
}

export async function purchaseProduct(productId: string) {
  if (!isBillingAvailable()) {
    throw new Error('현재 환경에서는 결제를 사용할 수 없습니다.');
  }

  if (!billingInitialized) {
    await initBilling();
  }

  const { store } = CdvPurchase;
  const platform = getBillingPlatform();
  const resolvedProductId = resolveProductId(productId);

  const product = await waitForProduct(resolvedProductId, platform);

  if (!product) {
    throw new Error(`상품을 찾을 수 없습니다: ${resolvedProductId}`);
  }

  const offer = product.getOffer ? product.getOffer() : product.offers?.[0];

  if (!offer) {
    throw new Error(`구매 가능한 오퍼가 없습니다: ${resolvedProductId}`);
  }

  const error = offer.order
    ? await offer.order()
    : await store.order(offer);

  if (error) {
    throw new Error(error.message || '결제 요청에 실패했습니다.');
  }
}

export async function openSubscriptionManager() {
  if (!isBillingAvailable()) return;

  const { store } = CdvPurchase;
  const platform = getBillingPlatform();

  if (store.manageSubscriptions) {
    await store.manageSubscriptions(platform);
  }
}

export const BILLING_IDS = {
  ticket5: IOS_TICKET_5_ID,
  ticket10: IOS_TICKET_10_ID,
  monthlyPremium: MONTHLY_PREMIUM_ID,
};
