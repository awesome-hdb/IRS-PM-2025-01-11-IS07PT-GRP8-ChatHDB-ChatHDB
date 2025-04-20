"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import GoogleMapsProvider from './GoogleMapsProvider';
import styles from './Map.module.css';
import { Loader } from '@googlemaps/js-api-loader';
import { toast } from 'react-hot-toast';
import { Train, School, ShoppingBag, Building2 } from 'lucide-react';

interface MapProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  markers: Array<{
    position: google.maps.LatLngLiteral;
    price: number;
    isMainLocation?: boolean;
    address?: string;
    transactionDate?: string;
    floorArea?: string;
    storeyRange?: string;
    flat_type?: string;
  }>;
  showAmenities?: boolean;
  onAmenitiesLoaded?: (amenities: Array<{
    type: string;
    name: string;
    distance: string;
    icon: JSX.Element;
  }>) => void;
}

interface AmenityMarker {
  position: google.maps.LatLngLiteral;
  type: string;
  name: string;
  distance: string;
  icon: JSX.Element;
}

interface MarkerWithInfoWindow extends google.maps.Marker {
  infoWindow?: google.maps.InfoWindow;
}

interface PropertyMarker {
  position: google.maps.LatLngLiteral;
  price: number;
  isMainLocation?: boolean;
  address?: string;
  transactionDate?: string;
  floorArea?: string;
  storeyRange?: string;
  flat_type?: string;
}

interface MapDivElement extends HTMLDivElement {
  dummyElement?: HTMLDivElement;
}

const AMENITY_ICONS = {
  bus_stop: '🚌',
  mrt: '🚆',
  school: '🏫',
  shopping: '🛍️',
  food: '🍽️',
  park: '🌳'
} as const;

let googleMapsLoaded = false;

function MapComponent({ center, zoom, markers, showAmenities = true, onAmenitiesLoaded }: MapProps) {
  const mapRef = useRef<MapDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const markersRef = useRef<MarkerWithInfoWindow[]>([]);
  const [amenityMarkers, setAmenityMarkers] = useState<AmenityMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const initialAnimationPlayed = useRef(false);
  const amenitiesLoaded = useRef(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      styles: isDarkMode ? [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ] : [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ],
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.TOP_RIGHT
      },
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER
      }
    });

    setMapInstance(map);

    const service = new google.maps.places.PlacesService(map);
    setPlacesService(service);
  }, [center, zoom, mapInstance]);

  useEffect(() => {
    if (!mapInstance || !placesService || !showAmenities) return;
    
    if (amenitiesLoaded.current) return;
    
    setLoading(true);
    amenitiesLoaded.current = true;
    
    const searchTypes = [
      { type: 'subway_station', icon: <Train className="h-5 w-5" /> },
      { type: 'school', icon: <School className="h-5 w-5" /> },
      { type: 'shopping_mall', icon: <ShoppingBag className="h-5 w-5" /> },
      { type: 'bus_station', icon: <Train className="h-5 w-5" /> },
      { type: 'park', icon: <Building2 className="h-5 w-5" /> }
    ];

    const amenities: AmenityMarker[] = [];
    let completedSearches = 0;

    const handleSearchComplete = (
      results: google.maps.places.PlaceResult[] | null,
      status: google.maps.places.PlacesServiceStatus,
      searchType: { type: string; icon: JSX.Element }
    ) => {
      completedSearches++;
      
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        results.slice(0, 5).forEach(place => {
          if (place.geometry?.location) {
            const amenity: AmenityMarker = {
              type: searchType.type,
              name: place.name || '',
              icon: searchType.icon,
              position: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              distance: google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(center),
                place.geometry.location
              ).toFixed(0) + 'm'
            };
            amenities.push(amenity);
          }
        });
      }

      if (completedSearches === searchTypes.length) {
        const sortedAmenities = amenities
          .sort((a, b) => parseInt(a.distance) - parseInt(b.distance))
          .slice(0, 15);
        
        setAmenityMarkers(sortedAmenities);
        if (onAmenitiesLoaded) {
          onAmenitiesLoaded(sortedAmenities);
        }
        setLoading(false);
      }
    };

    searchTypes.forEach(searchType => {
      const request = {
        location: center,
        radius: 1000,
        type: searchType.type
      };

      placesService.nearbySearch(
        request,
        (results, status) => handleSearchComplete(results, status, searchType)
      );
    });
  }, [mapInstance, placesService, center, showAmenities, onAmenitiesLoaded]);

  useEffect(() => {
    if (mapInstance) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      const shouldAnimate = !initialAnimationPlayed.current;
      
      // Create all markers immediately without animation first
      const newMarkers: MarkerWithInfoWindow[] = [];
      
      markers.forEach((marker) => {
        const markerInstance = new google.maps.Marker({
          position: marker.position,
          map: shouldAnimate ? null : mapInstance, // Don't add to map yet if animating
          icon: {
            path: marker.isMainLocation 
              ? "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              : "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
            fillColor: marker.isMainLocation ? '#FF4444' : getPriceColor(marker.price),
            fillOpacity: shouldAnimate ? 0 : 0.9, // Start transparent if animating
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: marker.isMainLocation ? 2.5 : 2,
            anchor: new google.maps.Point(12, 22)
          },
          animation: null,
          title: marker.isMainLocation ? 'Your Location' : `$${marker.price.toLocaleString()}`
        });

        const infoWindow = createInfoWindow(marker, mapInstance);
        markerInstance.addListener('click', () => {
          markersRef.current.forEach(m => m.infoWindow?.close());
          infoWindow.open(mapInstance, markerInstance);
        });

        (markerInstance as MarkerWithInfoWindow).infoWindow = infoWindow;
        newMarkers.push(markerInstance as MarkerWithInfoWindow);
      });
      
      amenityMarkers.forEach((amenity) => {
        const markerInstance = new google.maps.Marker({
          position: amenity.position,
          map: shouldAnimate ? null : mapInstance, // Don't add to map yet if animating
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              createAmenityIcon(amenity.type, shouldAnimate ? 0 : 1)
            )}`,
            scaledSize: new google.maps.Size(32, 32)
          },
          animation: null,
          title: `${amenity.name} (${amenity.distance})`
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <div class="font-semibold">${amenity.name}</div>
              <div class="text-sm text-gray-600">${amenity.distance} away</div>
            </div>
          `
        });

        markerInstance.addListener('click', () => {
          markersRef.current.forEach(m => m.infoWindow?.close());
          infoWindow.open(mapInstance, markerInstance);
        });

        (markerInstance as MarkerWithInfoWindow).infoWindow = infoWindow;
        newMarkers.push(markerInstance as MarkerWithInfoWindow);
      });
      
      markersRef.current = newMarkers;
      
      // Create a function to animate remaining markers
      const animateRemainingMarkers = function() {
        // Add remaining markers with a staggered fade-in
        newMarkers.forEach((marker, index) => {
          if (marker.getTitle() === 'Your Location') return; // Skip main marker
          
          setTimeout(() => {
            marker.setMap(mapInstance);
            
            // Fade in the marker
            let opacity = 0;
            const fadeInterval = setInterval(() => {
              opacity += 0.1;
              if (opacity >= 0.9) {
                clearInterval(fadeInterval);
                opacity = 0.9;
              }
              
              const icon = marker.getIcon();
              if (typeof icon === 'object' && icon !== null) {
                if ('fillOpacity' in icon) {
                  // For SVG path icons
                  marker.setIcon({
                    ...(icon as google.maps.Symbol),
                    fillOpacity: opacity
                  });
                } else if ('url' in icon) {
                  // For URL-based icons
                  const currentIcon = icon as google.maps.Icon;
                  if (currentIcon && currentIcon.url) {
                    // Create a new SVG with the updated opacity
                    const newUrl = currentIcon.url.includes('data:image/svg+xml') 
                      ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                          createAmenityIcon(getIconTypeFromUrl(currentIcon.url), opacity)
                        )}`
                      : currentIcon.url;
                    
                    marker.setIcon({
                      ...currentIcon,
                      url: newUrl
                    });
                  }
                }
              }
            }, 20);
          }, index * 50); // Stagger by 50ms per marker
        });
      };

      // Find the main marker if it exists
      const mainMarker = newMarkers.find(marker => marker.getTitle() === 'Your Location');
      
      if (mainMarker) {
        // Add main marker first
        mainMarker.setMap(mapInstance);
        
        // Fade in the main marker
        let opacity = 0;
        const fadeInterval = setInterval(() => {
          opacity += 0.1;
          if (opacity >= 0.9) {
            clearInterval(fadeInterval);
            opacity = 0.9;
            
            // After main marker is visible, add other markers with staggered timing
            animateRemainingMarkers();
          }
          
          const icon = mainMarker.getIcon() as google.maps.Symbol;
          mainMarker.setIcon({
            ...icon,
            fillOpacity: opacity
          });
        }, 30);
      } else {
        // No main marker, just animate all markers
        animateRemainingMarkers();
      }
      
      initialAnimationPlayed.current = true;

      mapInstance.addListener('click', () => {
        markersRef.current.forEach(marker => marker.infoWindow?.close());
      });

      const mainLocation = markers.find(marker => marker.isMainLocation);
      
      if (mainLocation) {
        mapInstance.setCenter(mainLocation.position);
        mapInstance.setZoom(15);
      } else {
        const bounds = new google.maps.LatLngBounds();
        [...markers, ...amenityMarkers].forEach(marker => bounds.extend(marker.position));
        mapInstance.fitBounds(bounds, 50);
      }
    }
  }, [mapInstance, markers, amenityMarkers]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={styles.mapContainer}
      ref={mapRef}
    >
      {loading && (
        <div className={styles.loadingIndicator + " dark:bg-gray-800 dark:text-gray-200"}>
          Loading amenities...
        </div>
      )}
    </motion.div>
  );
}

function createAmenityIcon(type: string, opacity: number = 1): string {
  const emoji = AMENITY_ICONS[type as keyof typeof AMENITY_ICONS] ?? '🍽️';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" opacity="${opacity}">
      <circle cx="16" cy="16" r="14" fill="white" stroke="#666666" stroke-width="2"/>
      <text x="16" y="22" text-anchor="middle" font-size="16">${emoji}</text>
    </svg>
  `;
}

function createInfoWindow(marker: PropertyMarker, map: google.maps.Map): google.maps.InfoWindow {
  const content = document.createElement('div');
  content.className = styles.infoWindowContent;
  
  content.style.opacity = '0';
  content.style.transform = 'translateY(10px)';
  content.style.transition = 'all 0.3s ease-out';

  content.innerHTML = `
    <div class="${styles.propertyDetails}">
      ${marker.isMainLocation ? `
        <div class="${styles.mainInfo}">
          <div class="${styles.infoRow}">
            <div class="${styles.locationBadge}">
              <svg xmlns="http://www.w3.org/2000/svg" class="${styles.locationIcon}" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <div class="${styles.priceAmount}">Your Location</div>
              <div class="${styles.infoText}">${marker.address || ''}</div>
            </div>
          </div>
        </div>
      ` : `
        <div class="${styles.mainInfo}">
          <div class="${styles.infoRow}">
            <div class="${styles.priceBadge} bg-${getPriceColorClass(marker.price)}">
              <span class="${styles.priceText}">$</span>
            </div>
            <div class="${styles.priceAmount}">$${marker.price.toLocaleString()}</div>
          </div>
        </div>

        ${marker.address ? `
          <div>
            <div class="${styles.infoLabel}">Location</div>
            <div class="${styles.infoRow}">
              <svg class="${styles.infoIcon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div class="${styles.infoText}">${marker.address}</div>
            </div>
          </div>
        ` : ''}

        <div class="${styles.divider}"></div>

        <div class="grid grid-cols-2 gap-4">
          ${marker.transactionDate ? `
            <div>
              <div class="${styles.infoLabel}">TOP Date</div>
              <div class="${styles.infoRow}">
                <svg class="${styles.infoIcon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div class="${styles.infoText}">${marker.transactionDate}</div>
              </div>
            </div>
          ` : ''}

          ${marker.floorArea ? `
            <div>
              <div class="${styles.infoLabel}">Floor Area</div>
              <div class="${styles.infoRow}">
                <svg class="${styles.infoIcon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                </svg>
                <div class="${styles.infoText}">${marker.floorArea}sqm</div>
              </div>
            </div>
          ` : ''}

          ${marker.storeyRange ? `
            <div>
              <div class="${styles.infoLabel}">Floor Level</div>
              <div class="${styles.infoRow}">
                <svg class="${styles.infoIcon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div class="${styles.infoText}">${marker.storeyRange}</div>
              </div>
            </div>
          ` : ''}

          ${marker.flat_type ? `
            <div>
              <div class="${styles.infoLabel}">Flat Type</div>
              <div class="${styles.infoRow}">
                <svg class="${styles.infoIcon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <div class="${styles.infoText}">${marker.flat_type}</div>
              </div>
            </div>
          ` : ''}
        </div>
      `}
    </div>
  `;

  const infoWindow = new google.maps.InfoWindow({
    content: content,
    maxWidth: 400,
    pixelOffset: new google.maps.Size(0, -20)
  });

  google.maps.event.addListener(map, 'click', () => {
    infoWindow.close();
  });

  google.maps.event.addListener(infoWindow, 'domready', () => {
    const content = document.querySelector(`.${styles.infoWindowContent}`) as HTMLElement;
    if (content) {
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    }
  });

  return infoWindow;
}

function getPriceColorClass(price: number): string {
  if (price < 400000) return 'emerald-500';
  if (price < 600000) return 'amber-500';
  return 'red-500';
}

function getPriceColor(price: number): string {
  if (price < 400000) return '#10B981';  // emerald-500
  if (price < 600000) return '#F59E0B';  // amber-500
  return '#EF4444';  // red-500
}

function getIconTypeFromUrl(url: string): string {
  // Try to extract the emoji from the SVG URL
  for (const [type, emoji] of Object.entries(AMENITY_ICONS)) {
    if (url.includes(encodeURIComponent(emoji))) {
      return type;
    }
  }
  return 'food'; // Default type
}

function getIconColor(type: string): string {
  switch (type) {
    case 'restaurant': return '#FF5722';
    case 'school': return '#2196F3';
    case 'transit': return '#4CAF50';
    // Add more cases as needed
    default: return '#9E9E9E';
  }
}

function getIconPath(type: string): string {
  switch (type) {
    case 'restaurant': 
      return '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>';
    case 'school': 
      return '<path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>';
    // Add more cases as needed
    default: 
      return '<circle cx="12" cy="12" r="8"/>';
  }
}

export default function Map(props: MapProps) {
  return (
    <GoogleMapsProvider>
      <MapComponent {...props} />
    </GoogleMapsProvider>
  );
}
