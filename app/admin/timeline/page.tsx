"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";

type VehicleEvent = {
  id: number;
  created_at: string;
  vehicle_id: number | null;
  car_number: number;
  event_type: string;
  event_label: string;
  from_location: string | null;
  to_location: string | null;
  from_status: string | null;
  to_status: string | null;
  person_id: number | null;
  person_name: string | null;
  performed_by: string | null;
  notes: string | null;
  source_table: string | null;
  source_id: number | null;
};

export default function VehicleTimelinePage() {
  const [events, setEvents] = useState<VehicleEvent[]>([]);
  const [carNumber, setCarNumber] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadEvents(carNumberFilter?: string) {
    setLoading(true);

    let query = supabase
      .from("vehicle_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (carNumberFilter?.trim()) {
      query = query.eq("car_number", Number(carNumberFilter.trim()));
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setEvents(data || []);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const text =
      `${event.car_number} ${event.event_type} ${event.event_label} ${event.from_location} ${event.to_location} ${event.from_status} ${event.to_status} ${event.person_name} ${event.performed_by} ${event.notes}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getEventBadge(eventType: string) {
    if (eventType === "CHECKED_OUT") return "bg-[#FFDE00] text-black";
    if (eventType === "CHECKED_IN") return "bg-[#367C2B] text-white";
    if (eventType === "LOCATION_CHANGED") return "bg-blue-100 text-blue-800";
    if (eventType === "STATUS_CHANGED") return "bg-purple-100 text-purple-800";
    if (eventType === "LOADED") return "bg-gray-200 text-black";
    return "bg-gray-100 text-black";
  }

  function eventDetails(event: VehicleEvent) {
    const details: string[] = [];

    if (event.from_location || event.to_location) {
      details.push(
        `Location: ${event.from_location || "—"} → ${
          event.to_location || "—"
        }`
      );
    }

    if (event.from_status || event.to_status) {
      details.push(
        `Status: ${event.from_status || "—"} → ${event.to_status || "—"}`
      );
    }

    if (event.person_name) {
      details.push(`Person: ${event.person_name}`);
    }

    if (event.performed_by) {
      details.push(`By: ${event.performed_by}`);
    }

    return details;
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">Vehicle Timeline</h1>

        <button
          onClick={() => loadEvents(carNumber)}
          className="bg-[#1F4E1A] text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 border-t-4 border-[#367C2B]">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_160px_160px]">
          <input
            value={carNumber}
            onChange={(e) => setCarNumber(e.target.value)}
            placeholder="Car #"
            className="border rounded p-3 w-full"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, person, location, notes..."
            className="border rounded p-3 w-full"
          />

          <button
            onClick={() => loadEvents(carNumber)}
            className="bg-[#367C2B] hover:bg-[#2e6e24] text-white rounded px-4 py-3 font-semibold"
          >
            Search
          </button>

          <button
            onClick={() => {
              setCarNumber("");
              setSearch("");
              loadEvents();
            }}
            className="bg-[#FFDE00] text-black rounded px-4 py-3 font-semibold"
          >
            Clear
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-3">
          Showing {filteredEvents.length} event(s)
          {carNumber ? ` for car #${carNumber}` : ""}
          {loading ? " — Loading..." : ""}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-4 text-gray-500">No vehicle events found.</div>
        ) : (
          filteredEvents.map((event) => {
            const details = eventDetails(event);

            return (
              <div key={event.id} className="p-4 border-b">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg text-[#1F4E1A]">
                      Car #{event.car_number}
                    </p>

                    <p className="text-sm text-gray-500">
                      {formatDateTime(event.created_at)}
                    </p>
                  </div>

                  <span
                    className={`h-fit rounded px-3 py-1 text-sm font-semibold ${getEventBadge(
                      event.event_type
                    )}`}
                  >
                    {event.event_type}
                  </span>
                </div>

                <p className="font-semibold mt-3">{event.event_label}</p>

                {details.length > 0 && (
                  <div className="grid gap-1 mt-2 text-sm text-gray-700">
                    {details.map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                )}

                {event.notes && (
                  <div className="mt-3 bg-[#F5F5F5] rounded p-3 text-sm">
                    <span className="font-semibold">Notes:</span> {event.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}