"use client";
/**
 * PersonalityContext - Manages personalities and selected persona
 */

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { listPersonalities, Personality as PersonaType } from '@/lib/calls/model-chat-conversation';

export interface PersonalityContextValue {
  personalities: PersonaType[];
  setPersonalities: React.Dispatch<React.SetStateAction<PersonaType[]>>;
  selectedPersonalityName: string | undefined;
  setSelectedPersonalityName: React.Dispatch<React.SetStateAction<string | undefined>>;
  selectedPersonalityIconUrl: string | undefined;
  setSelectedPersonalityIconUrl: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const PersonalityContext = createContext<PersonalityContextValue | undefined>(undefined);

export function PersonalityProvider({ children }: { children: ReactNode }) {
  const [personalities, setPersonalities] = useState<PersonaType[]>([]);
  const [selectedPersonalityName, setSelectedPersonalityName] = useState<string | undefined>(undefined);
  const [selectedPersonalityIconUrl, setSelectedPersonalityIconUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      try {
        const ps = await listPersonalities();
        setPersonalities(ps);
      } catch (err) {
        console.error("Failed to load personalities:", err);
      }
    })();
  }, []);

  const value = {
    personalities,
    setPersonalities,
    selectedPersonalityName,
    setSelectedPersonalityName,
    selectedPersonalityIconUrl,
    setSelectedPersonalityIconUrl,
  };

  return (
    <PersonalityContext.Provider value={value}>
      {children}
    </PersonalityContext.Provider>
  );
}

export function usePersonalityContext() {
  const context = useContext(PersonalityContext);
  if (context === undefined) {
    throw new Error('usePersonalityContext must be used within a PersonalityProvider');
  }
  return context;
}
