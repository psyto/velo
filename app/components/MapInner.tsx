'use client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix default icon issue in Leaflet + Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export interface Event {
    id: string;
    lat: number;
    lng: number;
    description: string;
    settlementTime: number;
    publicKey: string;
}

export default function MapInner({ events, onSelectEvent }: { events: Event[], onSelectEvent: (e: Event) => void }) {
    return (
        <MapContainer center={[35.6762, 139.6503]} zoom={12} style={{ height: '500px', width: '100%', borderRadius: '10px' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {events.map(ev => (
                <Marker key={ev.id} position={[ev.lat, ev.lng]} eventHandlers={{ click: () => onSelectEvent(ev) }}>
                    <Popup>
                        <div className="text-black">
                            <h3 className="font-bold">{ev.id}</h3>
                            <p>{ev.description}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
            <Circle center={[35.6591, 139.7006]} radius={800} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }}>
                <Popup className="text-black">High Congestion: Shibuya</Popup>
            </Circle>
        </MapContainer>
    );
}
