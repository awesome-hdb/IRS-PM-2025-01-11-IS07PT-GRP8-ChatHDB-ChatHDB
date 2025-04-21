"use client";

import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

// NO declare global NEEDED!

interface GoogleMapsWrapperProps {
  children: React.ReactNode;
}

export default function GoogleMapsWrapper({ children }: GoogleMapsWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google) { // Now correctly typed!
      setIsLoaded(true);
      return;
    }

    // Load Google Maps Script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}