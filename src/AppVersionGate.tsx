import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from './lib/supabase';

type Platform = 'ios' | 'android';

type VersionSetting = {
  platform: Platform;
  latest_version: string;
  min_required_version: string;
  force_update: boolean;
  store_url: string;
  message: string;
};

function parseVersion(version: string): number[] {
  return version
    .split('.')
    .map((part) => Number.parseInt(part.replace(/[^\d]/g, '') || '0', 10));
}

function isVersionLower(current: string, minimum: string): boolean {
  const currentParts = parseVersion(current);
  const minimumParts = parseVersion(minimum);
  const length = Math.max(currentParts.length, minimumParts.length);

  for (let i = 0; i < length; i += 1) {
    const currentValue = currentParts[i] ?? 0;
    const minimumValue = minimumParts[i] ?? 0;

    if (currentValue < minimumValue) return true;
    if (currentValue > minimumValue) return false;
  }

  return false;
}

export default function AppVersionGate() {
  const [requiredSetting, setRequiredSetting] = useState<VersionSetting | null>(null);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    let cancelled = false;

    const checkVersion = async () => {
      if (!Capacitor.isNativePlatform()) return;

      const platform = Capacitor.getPlatform();
      if (platform !== 'ios' && platform !== 'android') return;

      try {
        const info = await App.getInfo();
        const appVersion = info.version || '0.0.0';

        const { data, error } = await supabase.rpc('get_admin_app_version_settings');

        if (error || !data || cancelled) return;

        const setting = (data as VersionSetting[]).find((item) => item.platform === platform);
        if (!setting) return;

        const shouldForceUpdate =
          setting.force_update &&
          isVersionLower(appVersion, setting.min_required_version);

        if (shouldForceUpdate) {
          setCurrentVersion(appVersion);
          setRequiredSetting(setting);
        }
      } catch (error) {
        console.warn('[AppVersionGate] version check failed:', error);
      }
    };

    checkVersion();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!requiredSetting) return null;

  const handleUpdate = () => {
    if (!requiredSetting.store_url) return;
    window.open(requiredSetting.store_url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl px-6 py-7 shadow-2xl text-center"
        style={{ background: '#fff' }}
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
        >
          <span className="text-2xl">⬆️</span>
        </div>

        <h2 className="text-lg font-extrabold text-gray-900 mb-2">
          업데이트가 필요합니다
        </h2>

        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-4">
          {requiredSetting.message || '새 버전이 출시되었습니다. 업데이트 후 이용해주세요.'}
        </p>

        <div className="rounded-2xl bg-gray-50 px-4 py-3 mb-5 text-xs text-gray-500">
          현재 버전 {currentVersion} · 최소 지원 버전 {requiredSetting.min_required_version}
        </div>

        <button
          type="button"
          onClick={handleUpdate}
          disabled={!requiredSetting.store_url}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
        >
          스토어에서 업데이트
        </button>
      </div>
    </div>
  );
}
