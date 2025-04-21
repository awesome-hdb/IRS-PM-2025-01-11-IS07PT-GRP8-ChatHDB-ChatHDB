/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.maps {
  namespace visualization {
    class HeatmapLayer extends google.maps.MVCObject {
      constructor(opts?: HeatmapLayerOptions);
      getData(): MVCArray<LatLng|WeightedLocation>;
      setData(data: MVCArray<LatLng|WeightedLocation>|Array<LatLng|WeightedLocation>): void;
      setMap(map: Map|null): void;
      getMap(): Map|null;
    }

    interface HeatmapLayerOptions {
      data?: MVCArray<LatLng|WeightedLocation>|Array<LatLng|WeightedLocation>;
      dissipating?: boolean;
      gradient?: string[];
      map?: Map;
      maxIntensity?: number;
      opacity?: number;
      radius?: number;
    }

    interface WeightedLocation {
      location: LatLng;
      weight: number;
    }
  }
}

export {}; 