"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

interface PropertyMapProps {
  lat: number;
  lng: number;
  title: string;
  address: string;
}

// Dynamically load Leaflet (client-side only — SSR would fail)
export function PropertyMap({ lat, lng, title, address }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import leaflet
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom: 15,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // OpenStreetMap tiles (free, no API key)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom marker
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

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
          <div style="font-weight: 600; font-size: 13px; color: #0A1628; margin-bottom: 4px;">${title}</div>
          <div style="font-size: 12px; color: #666;">${address}</div>
        </div>
      `);
    });

    // Load Leaflet CSS dynamically
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, title, address]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="h-72 lg:h-80 w-full rounded-xl" aria-label={`Map showing location of ${title}`} />
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <MapPin size={12} />
        <span>{address}</span>
      </div>
    </div>
  );
}
