'use client';

import { createContext, FC, useEffect, useState } from 'react';

import jaJP from '../../locales/ja-JP.json';
import enUS from '../../locales/en-US.json';
import { commands } from '@/lib/bindings';

export type LocalizationContextType = {
  language: string;
  data: Partial<{ [key in string]: string }>;
  fallbackData: Partial<{ [key in string]: string }>;
  setLanguage: (language: string) => void;
};

export const LocalizationContext = createContext<LocalizationContextType>({
  language: 'en-US',
  data: {},
  fallbackData: {},
  setLanguage: () => {},
});

type Props = {
  children: React.ReactNode;
};

export const LocalizationContextProvider: FC<Props> = ({ children }) => {
  const [languageCode, setLanguageCode] = useState('en-US');
  const [localizationData, setLocalizationData] =
    useState<Partial<{ [key in string]: string }>>(enUS);

  const setLanguage = (language: string) => {
    if (language === languageCode) {
      return;
    }

    if (language === 'ja-JP') {
      setLocalizationData(jaJP);
    } else if (language === 'en-US') {
      setLocalizationData(enUS);
    } else {
      return;
    }

    setLanguageCode(language);
  };

  useEffect(() => {
    commands.getLanguage().then((result) => {
      if (result.status === 'ok') {
        setLanguage(result.data);
      } else {
        console.error('Failed to get language:', result.error);
      }
    });
  }, []);

  const contextValue: LocalizationContextType = {
    language: languageCode,
    data: localizationData,
    fallbackData: enUS,
    setLanguage,
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
};
