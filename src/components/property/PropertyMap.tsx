"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

interface PropertyMapProps {
  lat: number;
  lng: number;
  title: string;
  address: string;
}

export function PropertyMap({ lat, lng, title, address }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Basic check: if the div doesn't exist yet, do nothing
    if (!mapRef.current) return;

    // Dynamically import leaflet to avoid SSR errors
    import("leaflet").then((L) => {
      // CRITICAL FIX: Check if map was already initialized while we were loading the library
      if (mapInstanceRef.current) return;

      // Fix default icon paths for Leaflet in modern bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Initialize the map instance
      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom: 15,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      // Store the instance in the ref so we can track it and clean it up
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Create a custom styled marker
      const customIcon = L.divIcon({
        html: `
          <div style="
            background: #0A1628;
            border: 2px solid #C9A84C;
            border-radius: 50% 50% 50% 0;
            width: 32px;
            height: 32px;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(10,22,40,0.3);
          ">
            <span style="transform: rotate(45deg); color: #C9A84C; font-size: 14px;">⌂</span>
          </div>
        `,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      // Add the marker to the map
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Attach the popup
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
          <div style="font-weight: 600; font-size: 13px; color: #0A1628; margin-bottom: 4px;">${title}</div>
          <div style="font-size: 12px; color: #666;">${address}</div>
        </div>
      `);
    });

    // Cleanup function: This runs when the component unmounts
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, title, address]);

  return (
    <div className="map-container">
      {/* The map will be injected into this div */}
      <div
        ref={mapRef}
        className="h-72 lg:h-80 w-full rounded-xl"
        aria-label={`Map showing location of ${title}`}
      />
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <MapPin size={12} />
        <span>{address}</span>
      </div>
    </div>
  );
}