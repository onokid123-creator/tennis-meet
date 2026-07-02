import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { CapacitorHttp } from '@capacitor/core';

interface CourtLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  category?: string;
}

interface CourtMapSearchProps {
  selected: CourtLocation | null;
  onSelect: (court: CourtLocation) => void;
  markerColor: string;
  title: string;
  searchSuffix?: string;
}

declare global {
  interface Window {
    naver?: any;
    __naverMapPromise?: Promise<void>;
    __initNaverCourtMap?: () => void;
    navermap_authFailure?: () => void;
  }
}

const defaultCenter = { lat: 37.5665, lng: 126.978 };

const isTennisCourtLocation = (court: CourtLocation) => {
  const text = [
    court.name,
    court.address,
    court.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /테니스|tennis/.test(text);
};

function buildNaverStaticMapUrl(lat: number, lng: number, showMarker: boolean) {
  const params = new URLSearchParams({
    w: '640',
    h: '320',
    center: `${lng},${lat}`,
    level: '15',
    scale: '2',
    format: 'png',
  });

  if (showMarker) {
    params.set('markers', `type:d|size:mid|pos:${lng} ${lat}`);
  }

  return `https://maps.apigw.ntruss.com/map-static/v2/raster-cors?${params.toString()}`;
}

function loadNaverMapsScript() {
  return Promise.resolve();
}


export default function CourtMapSearch({
  selected,
  onSelect,
  markerColor,
  title,
  searchSuffix = '테니스장',
}: CourtMapSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<CourtLocation[]>([]);
  const [staticMapUrl, setStaticMapUrl] = useState('');

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keywordRef = useRef('');
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const placeMarker = useCallback((court: CourtLocation, map = mapRef.current) => {
    if (!window.naver?.maps || !map) return;

    const naver = window.naver;
    const position = new naver.maps.LatLng(court.lat, court.lng);

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new naver.maps.Marker({
      map,
      position,
      icon: {
        content: `
          <div style="
            width: 22px;
            height: 22px;
            border-radius: 999px;
            background: ${markerColor || '#1B4332'};
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.22);
          "></div>
        `,
        anchor: new naver.maps.Point(11, 11),
      },
    });
  }, [markerColor]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_NAVER_MAP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      setStaticMapUrl('');
      return;
    }

    const lat = selected?.lat ?? defaultCenter.lat;
    const lng = selected?.lng ?? defaultCenter.lng;
    const url = buildNaverStaticMapUrl(lat, lng, !!selected);

    let cancelled = false;
    let objectUrl = '';

    fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key': clientSecret,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Static Map failed ${response.status} ${text}`);
        }

        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setStaticMapUrl(objectUrl);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[CourtMapSearch] Static Map load failed:', message);
        setStaticMapUrl('');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected?.lat, selected?.lng, selected?.placeId]);

  useEffect(() => {
    if (!selected || !mapRef.current || !window.naver?.maps) return;

    const naver = window.naver;
    const position = new naver.maps.LatLng(selected.lat, selected.lng);

    mapRef.current.setCenter(position);
    mapRef.current.setZoom(15);
    placeMarker(selected, mapRef.current);
  }, [selected, placeMarker]);

  const mapGeocodeResults = (kw: string, addresses: any[]): CourtLocation[] => {
    return addresses.slice(0, 8).map((item, index) => {
      const lat = Number(item.y ?? item.point?.y ?? defaultCenter.lat);
      const lng = Number(item.x ?? item.point?.x ?? defaultCenter.lng);
      const name = String(item.name || item.title || kw).trim();
      const address = String(item.roadAddress || item.jibunAddress || item.address || '').trim();
      const category = String(item.category || item.categoryName || '').trim();

      return {
        name,
        address,
        lat,
        lng,
        category,
        placeId: `naver-local-${lng}-${lat}-${index}`,
      };
    });
  };

  const runGeocode = useCallback(async (kw: string, queries: string[], index = 0) => {
    const clientId = import.meta.env.VITE_NAVER_LOCAL_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_NAVER_LOCAL_CLIENT_SECRET;
    const query = queries[index];

    const cleanText = (value: unknown) => String(value ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    const parseNaverCoord = (value: unknown) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return 0;
      return Math.abs(n) > 1000 ? n / 10000000 : n;
    };

    if (!clientId || !clientSecret) {
      console.error('[CourtMapSearch] Naver Local Search key missing');
      setResults([]);
      return;
    }

    try {
      const response = await CapacitorHttp.get({
        url: 'https://openapi.naver.com/v1/search/local.json',
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
          Accept: 'application/json',
        },
        params: {
          query,
          display: '10',
          start: '1',
        },
      });

      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const items = data?.items ?? [];

      const addresses = items
        .map((item: any) => {
          const x = parseNaverCoord(item.mapx);
          const y = parseNaverCoord(item.mapy);
          const title = cleanText(item.title);
          const roadAddress = cleanText(item.roadAddress || item.address || title);
          const jibunAddress = cleanText(item.address || item.roadAddress || title);

          if (!x || !y) return null;

          return {
            title,
            name: title,
            roadAddress,
            jibunAddress,
            englishAddress: '',
            category: cleanText(item.category),
            x: String(x),
            y: String(y),
          };
        })
        .filter(Boolean);

      if (response.status >= 200 && response.status < 300 && addresses.length > 0) {
        const tennisResults = mapGeocodeResults(kw, addresses).filter(isTennisCourtLocation);

        if (tennisResults.length > 0) {
          setResults(tennisResults);
          return;
        }

        if (index + 1 < queries.length) {
          await runGeocode(kw, queries, index + 1);
          return;
        }

        setResults([]);
        return;
      }

      if (index + 1 < queries.length) {
        await runGeocode(kw, queries, index + 1);
        return;
      }

      console.warn('[CourtMapSearch] Naver Local Search no result:', query, response.status, data?.errorMessage ?? '');
      setResults([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[CourtMapSearch] Naver Local Search failed:', message);

      if (index + 1 < queries.length) {
        await runGeocode(kw, queries, index + 1);
        return;
      }

      setResults([]);
    }
  }, []);

  const searchPlaces = useCallback((kw: string) => {
    const clean = kw.trim();
    if (!clean) return;

    runGeocode(clean, [`${clean} ${searchSuffix}`, clean]);
  }, [runGeocode, searchSuffix]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    keywordRef.current = val;
    setKeyword(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => searchPlaces(val), 500);
  };

  const handleSelect = (court: CourtLocation) => {
    if (!isTennisCourtLocation(court)) {
      alert('테니스장만 선택할 수 있습니다.');
      return;
    }

    onSelect(court);
    setKeyword(court.name);
    keywordRef.current = court.name;
    setResults([]);

    if (mapRef.current && window.naver?.maps) {
      const naver = window.naver;
      const position = new naver.maps.LatLng(court.lat, court.lng);

      mapRef.current.setCenter(position);
      mapRef.current.setZoom(15);
      placeMarker(court, mapRef.current);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onChange={handleInputChange}
          placeholder="테니스장을 검색해보세요 (예: 이촌테니스)"
          className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300"
          style={{ fontSize: '16px' }}
          autoComplete="off"
        />
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
        {staticMapUrl ? (
          <img
            src={staticMapUrl}
            alt={selected ? `${selected.name} 위치 지도` : '기본 지도'}
            className="w-full h-[220px] object-cover"
          />
        ) : (
          <div className="w-full h-[220px] flex items-center justify-center text-sm text-gray-400">
            지도 설정을 확인해주세요.
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400 px-1">
        검색 결과에서 코트를 선택하면 지도에 위치가 표시됩니다.
      </p>

      {results.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={r.placeId ?? i}
              type="button"
              onClick={() => handleSelect(r)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition ${
                selected?.placeId === r.placeId && selected?.name === r.name
                  ? 'border-[#C9A84C] bg-[#FFF8EC]'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{r.address}</p>
              </div>
              {selected?.name === r.name && selected?.lat === r.lat && (
                <MapPin className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {selected && results.length === 0 && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-[#C9A84C] bg-[#FFF8EC]">
          <div className="w-10 h-10 rounded-lg bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0 text-lg">
            🎾
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{selected.name}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{selected.address}</p>
          </div>
          <MapPin className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
        </div>
      )}
    </div>
  );
}
