'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
// import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

import MarketDashboard from '@/components/MarketDashboard';
import { Event } from '@/components/MapInner';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { getProgram } from '@/app/utils/anchor';

// Dynamic import for Map to avoid SSR
const Map = dynamic(() => import('@/components/MapInner'), { ssr: false });

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  useEffect(() => {
    // Start with some mock events for visualization immediately
    const mockEvents: Event[] = [
      { id: 'SHIBUYA-DEMO', lat: 35.6591, lng: 139.7006, description: 'Pedestrian Crossing Congestion > 85%', settlementTime: Math.floor(Date.now() / 1000) + 7200, publicKey: '11111111111111111111111111111111' },
      { id: 'SHINJUKU-EXIT', lat: 35.6905, lng: 139.6995, description: 'Taxi Wait Time > 15 mins', settlementTime: Math.floor(Date.now() / 1000) + 3600, publicKey: '11111111111111111111111111111112' },
      { id: 'GINZA-CROSS', lat: 35.671989, lng: 139.763997, description: 'Traffic Speed < 10km/h', settlementTime: Math.floor(Date.now() / 1000) + 5000, publicKey: '11111111111111111111111111111113' }
    ];
    setEvents(mockEvents);

    const fetchEvents = async () => {
      try {
        // Read-Only Fetch (wallet can be null)
        const program = getProgram(connection, wallet);
        // @ts-ignore
        const evs = await program.account.congestionEvent.all();
        const mapped = evs.map((e: any) => ({
          id: e.account.eventId,
          // Mock coordinates derived from index for demo (spread them out)
          lat: 35.65 + (Math.random() * 0.1),
          lng: 139.65 + (Math.random() * 0.1),
          description: e.account.description,
          settlementTime: e.account.settlementTime.toNumber(),
          publicKey: e.publicKey.toBase58()
        }));
        // Merge real events with static mock events
        setEvents([...mockEvents, ...mapped]);
      } catch (e) { console.error("Failed to fetch on-chain events", e); }
    };
    fetchEvents();
  }, [wallet, connection]);

  return (
    <main className="flex h-screen flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shadow-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold">G</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            GUCC <span className="text-slate-500 font-normal ml-2 text-sm hidden sm:inline">Global Urban Congestion Contract</span>
          </h1>
        </div>
        <WalletMultiButton className="!bg-slate-800 hover:!bg-slate-700 !h-10 !rounded-lg" />
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 relative z-0">
          <Map events={events} onSelectEvent={setSelectedEvent} />

          {/* Overlay for quick stats or instructions */}
          <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur p-4 rounded-xl text-white max-w-xs border border-slate-700 shadow-xl">
            <h3 className="font-bold mb-1">Live Congestion Map</h3>
            <p className="text-xs text-gray-400">Real-time settlement based on Google Maps Traffic Data.</p>
            <div className="mt-2 flex gap-2">
              <span className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded">High Traffic</span>
              <span className="text-xs bg-green-900/50 text-green-200 px-2 py-1 rounded">Low Traffic</span>
            </div>
          </div>
        </div>

        {/* Sidebar for Dashboard */}
        <div className={`w-96 bg-slate-900 border-l border-slate-800 overflow-y-auto transition-all duration-300 absolute right-0 h-full z-[500] shadow-2xl transform ${selectedEvent ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:static'}`}>
          <div className="sticky top-0 bg-slate-900 p-2 z-10 flex justify-end lg:hidden">
            <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white">Close</button>
          </div>
          <MarketDashboard event={selectedEvent} />
        </div>
      </div>
    </main>
  );
}
