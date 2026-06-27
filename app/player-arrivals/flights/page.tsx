"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Flight = {
  id: string;
  faFlightId: string | null;
  flightNumber: string | null;
  flightNumberIcao: string | null;
  operatorCode: string | null;
  flightType: string;
  registration: string | null;
  aircraftType: string | null;
  origin: {
    code: string | null;
    codeIata: string | null;
    codeIcao: string | null;
    name: string | null;
    city: string | null;
  };
  destination: {
    code: string | null;
    name: string | null;
  };
  scheduledArrival: string | null;
  estimatedArrival: string | null;
  arrivalTime: string | null;
  arrivalDelaySeconds: number | null;
  status: string;
  cancelled: boolean;
  diverted: boolean;
  gate: string | null;
  terminal: string | null;
  baggageClaim: string | null;
  codeshares: string[];
};

type FlightsResponse = {
  airport: {
    codeIata: string;
    codeIcao: string;
    name: string;
    timezone: string;
  };
  fetchedAt: string;
  windowStart: string;
  windowEnd: string;
  flightCount: number;
  flights: Flight[];
  error?: string;
};

const TIMEZONE = "America/Chicago";
const AUTO_REFRESH_MS = 15 * 60 * 1000;

function formatDateTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateHeading(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function delayMinutes(seconds: number | null) {
  if (seconds === null) return null;
  return Math.round(seconds / 60);
}

function statusClass(flight: Flight) {
  const status = flight.status.toLowerCase();

  if (flight.cancelled || status.includes("cancel")) {
    return "bg-red-100 text-red-800";
  }

  if (flight.diverted || status.includes("divert")) {
    return "bg-orange-100 text-orange-800";
  }

  if (status.includes("arriv")) {
    return "bg-blue-100 text-blue-800";
  }

  if (
    status.includes("route") ||
    status.includes("airborne") ||
    status.includes("active")
  ) {
    return "bg-yellow-100 text-yellow-900";
  }

  return "bg-green-100 text-green-800";
}

function arrivalDifference(flight: Flight) {
  if (!flight.scheduledArrival || !flight.estimatedArrival) return null;

  return Math.round(
    (new Date(flight.estimatedArrival).getTime() -
      new Date(flight.scheduledArrival).getTime()) /
      60000
  );
}

export default function MliFlightBoardPage() {
  const [data, setData] = useState<FlightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [flightType, setFlightType] = useState("All");

  async function loadFlights(manual = false) {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch("/api/mli-arrivals", {
        cache: "no-store",
      });

      const payload = (await response.json()) as FlightsResponse;

      if (!response.ok) {
        throw new Error(
          payload.error || `Unable to load flights (${response.status}).`
        );
      }

      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load MLI arrivals."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFlights();

    const interval = window.setInterval(
      () => loadFlights(true),
      AUTO_REFRESH_MS
    );

    return () => window.clearInterval(interval);
  }, []);

  const filteredFlights = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (data?.flights || []).filter((flight) => {
      const typeMatches =
        flightType === "All" || flight.flightType === flightType;

      const searchable = [
        flight.flightNumber,
        flight.flightNumberIcao,
        flight.operatorCode,
        flight.registration,
        flight.aircraftType,
        flight.origin.code,
        flight.origin.city,
        flight.origin.name,
        flight.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return typeMatches && (!query || searchable.includes(query));
    });
  }, [data, search, flightType]);

  const groupedFlights = useMemo(() => {
    const groups = new Map<string, Flight[]>();

    for (const flight of filteredFlights) {
      if (!flight.arrivalTime) continue;

      const key = dateKey(flight.arrivalTime);
      const current = groups.get(key) || [];
      current.push(flight);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [filteredFlights]);

  const totals = useMemo(() => {
    const flights = data?.flights || [];

    return {
      total: flights.length,
      airline: flights.filter((flight) => flight.flightType === "Airline")
        .length,
      generalAviation: flights.filter(
        (flight) => flight.flightType === "General_Aviation"
      ).length,
      attention: flights.filter((flight) => {
        const delay = delayMinutes(flight.arrivalDelaySeconds);

        return (
          flight.cancelled ||
          flight.diverted ||
          (delay !== null && delay >= 15)
        );
      }).length,
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Link
                href="/player-arrivals"
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                ← Player Arrivals
              </Link>
            </div>

            <h1 className="text-3xl font-bold text-[#1F4E1A]">
              MLI Inbound Flights
            </h1>

            <p className="mt-1 text-gray-600">
              All expected arrivals at Quad Cities International Airport for
              the next 48 hours. Times are shown in Central Time.
            </p>

            {data && (
              <p className="mt-2 text-xs text-gray-500">
                Window: {formatDateTime(data.windowStart)} through{" "}
                {formatDateTime(data.windowEnd)} · Last updated{" "}
                {formatDateTime(data.fetchedAt)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadFlights(true)}
            disabled={refreshing}
            className="rounded bg-[#1F4E1A] px-4 py-3 font-semibold text-white hover:bg-[#173b14] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh Flights"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded border border-red-300 bg-red-50 p-4 text-red-800">
            <div className="font-bold">Flight board unavailable</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Total Arrivals
            </div>
            <div className="mt-1 text-3xl font-bold text-[#1F4E1A]">
              {totals.total}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Airline Flights
            </div>
            <div className="mt-1 text-3xl font-bold text-[#1F4E1A]">
              {totals.airline}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              General Aviation
            </div>
            <div className="mt-1 text-3xl font-bold text-[#1F4E1A]">
              {totals.generalAviation}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Needs Attention
            </div>
            <div className="mt-1 text-3xl font-bold text-red-700">
              {totals.attention}
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Search Flights
            </label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Flight number, airline, origin, city, tail number..."
              className="w-full rounded border p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Flight Type
            </label>
            <select
              value={flightType}
              onChange={(event) => setFlightType(event.target.value)}
              className="w-full rounded border bg-white p-3"
            >
              <option value="All">All flights</option>
              <option value="Airline">Airline</option>
              <option value="General_Aviation">General aviation</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
            Loading MLI arrivals...
          </div>
        ) : groupedFlights.length === 0 ? (
          <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
            No matching arrivals were found in this 48-hour window.
          </div>
        ) : (
          <div className="space-y-5">
            {groupedFlights.map(([date, flights]) => (
              <section key={date}>
                <h2 className="mb-2 text-xl font-bold text-[#1F4E1A]">
                  {formatDateHeading(flights[0].arrivalTime as string)}
                </h2>

                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="hidden grid-cols-[110px_130px_1.4fr_120px_110px_110px_120px] gap-3 bg-gray-100 px-4 py-3 text-sm font-bold lg:grid">
                    <div>Arrival</div>
                    <div>Flight</div>
                    <div>Origin</div>
                    <div>Status</div>
                    <div>Delay</div>
                    <div>Gate</div>
                    <div>Aircraft</div>
                  </div>

                  {flights.map((flight) => {
                    const delay =
                      delayMinutes(flight.arrivalDelaySeconds) ??
                      arrivalDifference(flight);

                    const scheduledDiffers =
                      flight.scheduledArrival &&
                      flight.estimatedArrival &&
                      formatTime(flight.scheduledArrival) !==
                        formatTime(flight.estimatedArrival);

                    return (
                      <details
                        key={flight.id}
                        className="group border-t first:border-t-0"
                      >
                        <summary className="cursor-pointer list-none px-4 py-4 hover:bg-gray-50">
                          <div className="grid gap-3 lg:grid-cols-[110px_130px_1.4fr_120px_110px_110px_120px] lg:items-center">
                            <div>
                              <div className="text-lg font-bold text-[#1F4E1A]">
                                {formatTime(flight.arrivalTime)}
                              </div>
                              {scheduledDiffers && (
                                <div className="text-xs text-gray-500">
                                  Sched.{" "}
                                  {formatTime(flight.scheduledArrival)}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="font-bold">
                                {flight.flightNumber || "Private/Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {flight.flightType === "General_Aviation"
                                  ? "General aviation"
                                  : flight.operatorCode || "Airline"}
                              </div>
                            </div>

                            <div>
                              <div className="font-semibold">
                                {flight.origin.code || "Unknown origin"}
                              </div>
                              <div className="text-sm text-gray-600">
                                {[flight.origin.city, flight.origin.name]
                                  .filter(Boolean)
                                  .join(" — ") || "Origin details unavailable"}
                              </div>
                            </div>

                            <div>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                  flight
                                )}`}
                              >
                                {flight.status}
                              </span>
                            </div>

                            <div
                              className={
                                delay !== null && delay >= 15
                                  ? "font-bold text-red-700"
                                  : delay !== null && delay > 0
                                    ? "font-semibold text-yellow-800"
                                    : "text-gray-600"
                              }
                            >
                              {delay === null
                                ? "—"
                                : delay > 0
                                  ? `+${delay} min`
                                  : delay < 0
                                    ? `${delay} min`
                                    : "On time"}
                            </div>

                            <div>
                              {flight.gate ||
                                flight.terminal ||
                                "—"}
                            </div>

                            <div>
                              {flight.aircraftType ||
                                flight.registration ||
                                "—"}
                            </div>
                          </div>
                        </summary>

                        <div className="bg-gray-50 px-4 pb-4">
                          <div className="grid gap-3 rounded border bg-white p-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <div className="font-semibold text-gray-500">
                                Scheduled Arrival
                              </div>
                              <div>
                                {formatDateTime(flight.scheduledArrival)}
                              </div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-500">
                                Current Arrival
                              </div>
                              <div>
                                {formatDateTime(flight.arrivalTime)}
                              </div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-500">
                                Tail Number
                              </div>
                              <div>{flight.registration || "Unknown"}</div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-500">
                                Aircraft
                              </div>
                              <div>{flight.aircraftType || "Unknown"}</div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-500">
                                Arrival Gate
                              </div>
                              <div>{flight.gate || "Unknown"}</div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-500">
                                Terminal
                              </div>
                              <div>{flight.terminal || "Unknown"}</div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-500">
                                Baggage Claim
                              </div>
                              <div>{flight.baggageClaim || "Unknown"}</div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-500">
                                Codeshares
                              </div>
                              <div>
                                {flight.codeshares.length > 0
                                  ? flight.codeshares.join(", ")
                                  : "None listed"}
                              </div>
                            </div>

                            {flight.flightNumberIcao && (
                              <div className="md:col-span-2 lg:col-span-4">
                                <a
                                  href={`https://www.flightaware.com/live/flight/${encodeURIComponent(
                                    flight.flightNumberIcao
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-[#1F4E1A] underline"
                                >
                                  Open live flight tracking
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-5 text-xs text-gray-500">
          Flight information is supplied by FlightAware AeroAPI and may change.
          The page refreshes automatically every 15 minutes.
        </p>
      </div>
    </main>
  );
}
