"use client";

import { useEffect, useState } from "react";

export default function AdminEventsPage() {
  const [RC, setRC] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    import("recharts")
      .then((m) => mounted && setRC(m))
      .catch(() => mounted && setRC(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (RC === null) {
    return <div className="p-6 text-sm text-gray-600">Loading charts…</div>;
  }
  if (RC === false) {
    return (
      <div className="p-6 text-sm text-rose-600">
        Charts disabled (Recharts not available).
      </div>
    );
  }

  const {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
  } = RC;

  const data = [
    { day: "Mon", events: 12 },
    { day: "Tue", events: 18 },
    { day: "Wed", events: 9 },
    { day: "Thu", events: 22 },
    { day: "Fri", events: 15 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Admin · Events</h1>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="events" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
