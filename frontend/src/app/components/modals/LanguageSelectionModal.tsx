'use client';

import React from 'react';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { LanguageSelectionModalApp } from './LanguageSelectionModalApp';
import { LanguageSelectionModalLanding } from './LanguageSelectionModalLanding';

export function LanguageSelectionModal() {
  const { languageModalVariant } = useLanguage();

  if (languageModalVariant === 'landing') {
    return <LanguageSelectionModalLanding />;
  }
  
  return <LanguageSelectionModalApp />;
}
