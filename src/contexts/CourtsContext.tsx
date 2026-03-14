import { createContext, useContext, useState, ReactNode } from 'react';

interface CourtsContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const CourtsContext = createContext<CourtsContextType | undefined>(undefined);

export function CourtsProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <CourtsContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </CourtsContext.Provider>
  );
}

export function useCourts() {
  const context = useContext(CourtsContext);
  if (context === undefined) {
    throw new Error('useCourts는 CourtsProvider 내에서 사용해야 합니다.');
  }
  return context;
}
