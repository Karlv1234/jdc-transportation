"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Person = {
  id: number;
  first_name: string;
  last_name: string;
  role: string | null;
};

type Arrival = {
  id: number;
  person_id: number | null;
  player_first_name: string;
  player_last_name: string;
  arrival_method: string;
  airline: string | null;
  flight_number: string | null;
  flight_origin: string | null;
  tail_number: string | null;
  arrival_date: string | null;
  estimated_arrival_time: string | null;
  notes: string | null;
};

type OpenCheckout = {
  person_id: number | null;
};

const ARRIVAL_METHODS = [
  "Commercial Flight",
  "Rental Car",
  "Private Aircraft",
  "Other",
];

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateText: string | null) {
  if (!dateText) return "";

  return new Date(`${dateText}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PlayerArrivalsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [openCheckouts, setOpenCheckouts] = useState<OpenCheckout[]>([]);

  const [personSearch, setPersonSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const [arrivalMethod, setArrivalMethod] = useState("Commercial Flight");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightOrigin, setFlightOrigin] = useState("");
  const [tailNumber, setTailNumber] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const today = dateToInputValue(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateToInputValue(tomorrowDate);

  async function loadData() {
    const { data: peopleData, error: peopleError } = await supabase
      .from("people")
      .select("id, first_name, last_name, role")
      .eq("role", "Player")
      .order("last_name");

    if (peopleError) {
      alert(peopleError.message);
      return;
    }

    const { data: arrivalData, error: arrivalError } = await supabase
      .from("player_arrivals")
      .select(
        "id, person_id, player_first_name, player_last_name, arrival_method, airline, flight_number, flight_origin, tail_number, arrival_date, estimated_arrival_time, notes"
      )
      .order("arrival_date", { ascending: true })
      .order("estimated_arrival_time", { ascending: true });

    if (arrivalError) {
      alert(arrivalError.message);
      return;
    }

    const { data: checkoutData, error: checkoutError } = await supabase
      .from("checkouts")
      .select("person_id")
      .is("time_in", null);

    if (checkoutError) {
      alert(checkoutError.message);
      return;
    }

    setPeople(peopleData || []);
    setArrivals(arrivalData || []);
    setOpenCheckouts(checkoutData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const checkedOutPersonIds = openCheckouts
    .map((checkout) => checkout.person_id)
    .filter((id): id is number => id !== null);

  const visibleArrivals = arrivals.filter((arrival) => {
    if (!arrival.person_id) return true;
    return !checkedOutPersonIds.includes(arrival.person_id);
  });

  const matchingPeople = people
    .filter((person) => {
      const text = `${person.first_name} ${person.last_name}`.toLowerCase();
      return text.includes(personSearch.toLowerCase());
    })
    .slice(0, 8);

  const todayArrivals = visibleArrivals.filter(
    (arrival) => arrival.arrival_date === today
  );

  const tomorrowArrivals = visibleArrivals.filter(
    (arrival) => arrival.arrival_date === tomorrow
  );

  const filteredArrivals = visibleArrivals.filter((arrival) => {
    const text =
      `${arrival.player_first_name} ${arrival.player_last_name} ${arrival.arrival_method} ${arrival.airline} ${arrival.flight_number} ${arrival.flight_origin} ${arrival.tail_number} ${arrival.notes}`.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesMethod =
      !methodFilter || arrival.arrival_method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  async function addNewPlayer() {
    const typedName = personSearch.trim();
    const parts = typedName.split(" ").filter(Boolean);

    const suggestedFirst = parts[0] || "";
    const suggestedLast = parts.slice(1).join(" ") || "";

    const firstName = prompt("First name?", suggestedFirst);
    if (!firstName) return;

    const lastName = prompt("Last name?", suggestedLast);
    if (!lastName) return;

    const phone = prompt("Phone? Optional.") || "";
    const email = prompt("Email? Optional.") || "";

    const { data, error } = await supabase
      .from("people")
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        role: "Player",
        notes: "",
      })
      .select("id, first_name, last_name, role")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setPeople((current) => [...current, data]);
    setSelectedPerson(data);
    setPersonSearch(`${data.first_name} ${data.last_name}`);
  }

  async function addArrival() {
    if (!selectedPerson) {
      alert("Please select or add a player.");
      return;
    }

    if (!arrivalDate) {
      alert("Please enter an arrival date.");
      return;
    }

    if (!arrivalTime) {
      alert("Please enter an estimated arrival time.");
      return;
    }

    const isFlight =
      arrivalMethod === "Commercial Flight" ||
      arrivalMethod === "Private Aircraft";

    const arrivalPayload = {
      person_id: selectedPerson.id,
      player_first_name: selectedPerson.first_name,
      player_last_name: selectedPerson.last_name,
      arrival_method: arrivalMethod,
      airline: arrivalMethod === "Commercial Flight" ? airline : "",
      flight_number: arrivalMethod === "Commercial Flight" ? flightNumber : "",
      flight_origin: isFlight ? flightOrigin : "",
      tail_number: arrivalMethod === "Private Aircraft" ? tailNumber : "",
      arrival_date: arrivalDate,
      estimated_arrival_time: arrivalTime,
      notes,
    };

    const { data: existingArrivals, error: findError } = await supabase
      .from("player_arrivals")
      .select("id")
      .eq("person_id", selectedPerson.id)
      .order("id", { ascending: true })
      .limit(1);

    if (findError) {
      alert(findError.message);
      return;
    }

    const existingArrival = existingArrivals?.[0];

    if (existingArrival) {
      const { error } = await supabase
        .from("player_arrivals")
        .update(arrivalPayload)
        .eq("id", existingArrival.id);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Existing arrival updated.");
    } else {
      const { error } = await supabase
        .from("player_arrivals")
        .insert(arrivalPayload);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Arrival added.");
    }

    setPersonSearch("");
    setSelectedPerson(null);
    setArrivalMethod("Commercial Flight");
    setAirline("");
    setFlightNumber("");
    setFlightOrigin("");
    setTailNumber("");
    setArrivalDate("");
    setArrivalTime("");
    setNotes("");

    loadData();
  }

  async function updateArrival(id: number, updates: Partial<Arrival>) {
    const { error } = await supabase
      .from("player_arrivals")
      .update(updates)
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function deleteArrival(id: number) {
    const confirmed = confirm("Delete this arrival record?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("player_arrivals")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function getTravelCode(arrival: Arrival) {
    if (arrival.arrival_method === "Commercial Flight") {
      return arrival.flight_number || "No flight #";
    }

    if (arrival.arrival_method === "Private Aircraft") {
      return arrival.tail_number || "No tail #";
    }

    return "";
  }

  function ArrivalCard({ arrival }: { arrival: Arrival }) {
    return (
      <details className="border-b group">
        <summary className="cursor-pointer list-none p-3 hover:bg-gray-50">
          <div className="grid grid-cols-[90px_1fr] md:grid-cols-[100px_1fr_180px_140px] gap-2 items-center">
            <div className="font-bold text-[#1F4E1A]">
              {formatTime(arrival.estimated_arrival_time)}
            </div>

            <div className="font-semibold">
              {arrival.player_first_name} {arrival.player_last_name}
            </div>

            <div className="text-sm text-gray-700">
              {arrival.arrival_method}
            </div>

            <div className="text-sm font-semibold text-gray-700">
              {getTravelCode(arrival)}
            </div>
          </div>
        </summary>

        <div className="px-3 pb-4 bg-gray-50">
          <div className="bg-white rounded border p-3">
            <div className="grid gap-2 md:grid-cols-2 text-sm mb-3">
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {formatDate(arrival.arrival_date)}
              </p>

              <p>
                <span className="font-semibold">Time:</span>{" "}
                {formatTime(arrival.estimated_arrival_time)}
              </p>

              <p>
                <span className="font-semibold">Method:</span>{" "}
                {arrival.arrival_method}
              </p>

              {arrival.airline && (
                <p>
                  <span className="font-semibold">Airline:</span>{" "}
                  {arrival.airline}
                </p>
              )}

              {arrival.flight_number && (
                <p>
                  <span className="font-semibold">Flight #:</span>{" "}
                  {arrival.flight_number}
                </p>
              )}

              {arrival.flight_origin && (
                <p>
                  <span className="font-semibold">Coming From:</span>{" "}
                  {arrival.flight_origin}
                </p>
              )}

              {arrival.tail_number && (
                <p>
                  <span className="font-semibold">Tail #:</span>{" "}
                  {arrival.tail_number}
                </p>
              )}
            </div>

            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Notes
            </label>

            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
              <textarea
                defaultValue={arrival.notes || ""}
                onBlur={(e) =>
                  updateArrival(arrival.id, { notes: e.target.value })
                }
                placeholder="Notes..."
                className="border rounded p-2 w-full"
              />

              <button
                onClick={() => deleteArrival(arrival.id)}
                className="bg-gray-200 hover:bg-gray-300 rounded px-3 py-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </details>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">Player Arrivals</h1>

        <button
          onClick={loadData}
          className="bg-[#1F4E1A] text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <section className="bg-white rounded-lg shadow p-4 mb-4 border-t-4 border-[#367C2B] max-w-3xl">
        <h2 className="text-xl font-bold text-[#1F4E1A] mb-3">
          Add Arrival
        </h2>

        <label className="block font-semibold mb-1">Player</label>
        <input
          value={personSearch}
          onChange={(e) => {
            setPersonSearch(e.target.value);
            setSelectedPerson(null);
          }}
          placeholder="Type player name..."
          className="border rounded p-3 w-full"
        />

        {!selectedPerson && personSearch && (
          <div className="border rounded mt-2 mb-4 bg-white overflow-hidden">
            {matchingPeople.length === 0 ? (
              <div className="p-3">
                <p className="text-gray-500 mb-2">No players found.</p>

                <button
                  onClick={addNewPlayer}
                  className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-2 rounded w-full"
                >
                  Add New Player
                </button>
              </div>
            ) : (
              <>
                {matchingPeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      setSelectedPerson(person);
                      setPersonSearch(
                        `${person.first_name} ${person.last_name}`
                      );
                    }}
                    className="block w-full text-left p-3 border-b hover:bg-gray-100"
                  >
                    {person.first_name} {person.last_name}
                  </button>
                ))}

                <button
                  onClick={addNewPlayer}
                  className="block w-full text-left p-3 bg-[#FFDE00]/20 text-[#1F4E1A] font-semibold hover:bg-[#FFDE00]/30"
                >
                  + Add New Player
                </button>
              </>
            )}
          </div>
        )}

        {selectedPerson && (
          <div className="bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-3 my-4">
            Selected: {selectedPerson.first_name} {selectedPerson.last_name}
          </div>
        )}

        <label className="block font-semibold mb-1">Arrival Method</label>
        <select
          value={arrivalMethod}
          onChange={(e) => setArrivalMethod(e.target.value)}
          className="border rounded p-3 w-full mb-4"
        >
          {ARRIVAL_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        {arrivalMethod === "Commercial Flight" && (
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block font-semibold mb-1">Airline</label>
              <input
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="Example: American"
                className="border rounded p-3 w-full mb-4"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Flight Number</label>
              <input
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="Example: AA 1234"
                className="border rounded p-3 w-full mb-4"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Coming From</label>
              <input
                value={flightOrigin}
                onChange={(e) => setFlightOrigin(e.target.value)}
                placeholder="Example: Chicago ORD"
                className="border rounded p-3 w-full mb-4"
              />
            </div>
          </div>
        )}

        {arrivalMethod === "Private Aircraft" && (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block font-semibold mb-1">Tail Number</label>
              <input
                value={tailNumber}
                onChange={(e) => setTailNumber(e.target.value)}
                placeholder="Example: N123AB"
                className="border rounded p-3 w-full mb-4"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Coming From</label>
              <input
                value={flightOrigin}
                onChange={(e) => setFlightOrigin(e.target.value)}
                placeholder="Example: Scottsdale SDL"
                className="border rounded p-3 w-full mb-4"
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block font-semibold mb-1">Arrival Date</label>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="border rounded p-3 w-full mb-4"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">
              Estimated Arrival Time
            </label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="border rounded p-3 w-full mb-4"
            />
          </div>
        </div>

        <label className="block font-semibold mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          className="border rounded p-3 w-full mb-4"
        />

        <button
          onClick={addArrival}
          className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-3 rounded w-full font-semibold"
        >
          Add / Update Arrival
        </button>
      </section>

      <div className="grid gap-4 mb-4">
        <section className="bg-white rounded-lg shadow overflow-hidden border-t-4 border-[#367C2B]">
          <div className="p-4 bg-white">
            <h2 className="text-2xl font-bold text-[#1F4E1A]">
              Today&apos;s Arrivals
            </h2>
            <p className="text-sm text-gray-600">{formatDate(today)}</p>
          </div>

          {todayArrivals.length === 0 ? (
            <div className="p-4 text-gray-500">
              No active arrivals scheduled today.
            </div>
          ) : (
            todayArrivals.map((arrival) => (
              <ArrivalCard key={arrival.id} arrival={arrival} />
            ))
          )}
        </section>

        <section className="bg-white rounded-lg shadow overflow-hidden border-t-4 border-[#FFDE00]">
          <div className="p-4 bg-white">
            <h2 className="text-2xl font-bold text-[#1F4E1A]">
              Tomorrow&apos;s Arrivals
            </h2>
            <p className="text-sm text-gray-600">{formatDate(tomorrow)}</p>
          </div>

          {tomorrowArrivals.length === 0 ? (
            <div className="p-4 text-gray-500">
              No active arrivals scheduled tomorrow.
            </div>
          ) : (
            tomorrowArrivals.map((arrival) => (
              <ArrivalCard key={arrival.id} arrival={arrival} />
            ))
          )}
        </section>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 border-t-4 border-[#FFDE00]">
        <h2 className="text-xl font-bold text-[#1F4E1A] mb-3">
          All Active Arrivals
        </h2>

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player, flight, origin, tail number, notes..."
            className="border rounded p-3 w-full"
          />

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="border rounded p-3 w-full"
          >
            <option value="">All methods</option>
            {ARRIVAL_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredArrivals.map((arrival) => (
          <ArrivalCard key={arrival.id} arrival={arrival} />
        ))}

        {filteredArrivals.length === 0 && (
          <div className="p-4 text-gray-500">No active arrivals found.</div>
        )}
      </div>
    </main>
  );
}

