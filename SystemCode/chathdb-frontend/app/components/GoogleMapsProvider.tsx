"use client";

import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Loader as LoaderIcon } from 'lucide-react';

// NO declare global NEEDED

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places', 'visualization', 'geometry'],
      region: 'SG',
    });

    loader.load()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
      });
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}