import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Schedule } from '../types';

interface ScheduleContextType {
  selectedSchedule: Schedule | null;
  setSelectedSchedule: (schedule: Schedule | null) => void;
  selectedScheduleId: string | null;
  setSelectedScheduleId: (scheduleId: string | null) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useScheduleContext must be used within a ScheduleProvider');
  }
  return context;
};

interface ScheduleProviderProps {
  children: ReactNode;
}

export const ScheduleProvider: React.FC<ScheduleProviderProps> = ({ children }) => {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // Persist selected schedule ID to localStorage
  useEffect(() => {
    const savedScheduleId = localStorage.getItem('selectedScheduleId');
    if (savedScheduleId) {
      setSelectedScheduleId(savedScheduleId);
    }
  }, []);

  useEffect(() => {
    if (selectedScheduleId) {
      localStorage.setItem('selectedScheduleId', selectedScheduleId);
    } else {
      localStorage.removeItem('selectedScheduleId');
    }
  }, [selectedScheduleId]);

  // Update schedule ID when schedule changes
  useEffect(() => {
    if (selectedSchedule?._id !== selectedScheduleId) {
      setSelectedScheduleId(selectedSchedule?._id || null);
    }
  }, [selectedSchedule, selectedScheduleId]);

  const value: ScheduleContextType = {
    selectedSchedule,
    setSelectedSchedule,
    selectedScheduleId,
    setSelectedScheduleId,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
};
