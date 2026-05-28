import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  CrowdLevel,
  Location,
  MOCK_LOCATIONS,
  MOCK_REPORTS,
  MY_REPORTS,
  Report,
} from '@/data/mockData';
import { averageReports } from '@/utils/crowdUtils';

interface AppContextValue {
  locations: Location[];
  reports: Report[];
  myReports: Report[];
  savedLocationIds: string[];
  recentLocationIds: string[];
  getLocationById: (id: string) => Location | undefined;
  getReportsForLocation: (id: string) => Report[];
  submitReport: (locationId: string, level: CrowdLevel, comment?: string) => void;
  toggleSaved: (id: string) => void;
  addRecentLocation: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>(MOCK_LOCATIONS);
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [myReports, setMyReports] = useState<Report[]>(MY_REPORTS);
  const [savedLocationIds, setSavedLocationIds] = useState<string[]>(['1', '3']);
  const [recentLocationIds, setRecentLocationIds] = useState<string[]>(['1', '3', '2']);

  const getLocationById = useCallback(
    (id: string) => locations.find(l => l.id === id),
    [locations]
  );

  const getReportsForLocation = useCallback(
    (id: string) => {
      const cutoff = Date.now() - 60 * 60 * 1000;
      return [...reports, ...myReports].filter(
        r => r.locationId === id && new Date(r.timestamp).getTime() > cutoff
      );
    },
    [reports, myReports]
  );

  const submitReport = useCallback(
    (locationId: string, level: CrowdLevel, comment?: string) => {
      const newReport: Report = {
        id: `r${Date.now()}`,
        locationId,
        userId: 'u1',
        userName: 'You',
        crowdLevel: level,
        comment,
        timestamp: new Date().toISOString(),
      };
      setMyReports(prev => {
        const updated = [newReport, ...prev];
        const cutoff = Date.now() - 60 * 60 * 1000;
        const recentForLocation = [
          ...updated.filter(r => r.locationId === locationId && new Date(r.timestamp).getTime() > cutoff),
          ...reports.filter(r => r.locationId === locationId && new Date(r.timestamp).getTime() > cutoff),
        ];
        setLocations(locs =>
          locs.map(l =>
            l.id === locationId ? { ...l, currentCrowd: averageReports(recentForLocation) } : l
          )
        );
        return updated;
      });
    },
    [reports]
  );

  const toggleSaved = useCallback((id: string) => {
    setSavedLocationIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const addRecentLocation = useCallback((id: string) => {
    setRecentLocationIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 10));
  }, []);

  return (
    <AppContext.Provider
      value={{
        locations,
        reports,
        myReports,
        savedLocationIds,
        recentLocationIds,
        getLocationById,
        getReportsForLocation,
        submitReport,
        toggleSaved,
        addRecentLocation,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
