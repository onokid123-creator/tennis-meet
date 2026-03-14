import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';

interface CourtLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
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
    google: typeof google;
  }
}

export default function CourtMapSearch({
  selected,
  onSelect,
  title,
}: CourtMapSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<CourtLocation[]>([]);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultCenter = { lat: 37.5665, lng: 126.978 };

  useEffect(() => {
    if (!mapDivRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapDivRef.current, {
      center: defaultCenter,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapRef.current = map;
    serviceRef.current = new window.google.maps.places.PlacesService(map);
  }, []);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
    mapRef.current.setZoom(15);
    placeMarker(selected, mapRef.current);
  }, [selected]);

  const placeMarker = (court: CourtLocation, map: google.maps.Map) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    markerRef.current = new window.google.maps.Marker({
      map,
      position: { lat: court.lat, lng: court.lng },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#1B4332',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
  };

  const searchPlaces = useCallback((kw: string) => {
    if (!kw.trim() || !serviceRef.current) return;
    serviceRef.current.textSearch(
      { query: kw + ' 테니스장', region: 'kr' },
      (res, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && res) {
          const filtered = res.filter((r) =>
            (r.name ?? '').includes('테니스') ||
            (r.name ?? '').toLowerCase().includes('tennis') ||
            (r.types ?? []).includes('stadium') ||
            (r.types ?? []).includes('sports_complex')
          );
          const mapped: CourtLocation[] = filtered.slice(0, 8).map((r) => ({
            name: r.name ?? '',
            address: r.formatted_address ?? r.vicinity ?? '',
            lat: r.geometry?.location?.lat() ?? defaultCenter.lat,
            lng: r.geometry?.location?.lng() ?? defaultCenter.lng,
            placeId: r.place_id,
          }));
          setResults(mapped);
        } else {
          setResults([]);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => searchPlaces(val), 500);
  };

  const handleSelect = (court: CourtLocation) => {
    onSelect(court);
    setKeyword(court.name);
    setResults([]);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: court.lat, lng: court.lng });
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

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={mapDivRef} style={{ width: '100%', height: '220px' }} />
      </div>

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
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                🎾
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
