'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PdfContextType {
  pdfContent: string;
  setPdfContent: (content: string) => void;
  clearPdfContent: () => void;
}

const PdfContext = createContext<PdfContextType | undefined>(undefined);

export function PdfProvider({ children }: { children: ReactNode }) {
  const [pdfContent, setPdfContent] = useState<string>('');

  const clearPdfContent = () => {
    setPdfContent('');
  };

  return (
    <PdfContext.Provider value={{ pdfContent, setPdfContent, clearPdfContent }}>
      {children}
    </PdfContext.Provider>
  );
}

export function usePdfContext() {
  const context = useContext(PdfContext);
  if (context === undefined) {
    throw new Error('usePdfContext must be used within a PdfProvider');
  }
  return context;
} 