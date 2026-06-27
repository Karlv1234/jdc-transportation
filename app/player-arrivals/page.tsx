"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const PERSON_TYPES = [
  "Player",
  "PGA Staff",
  "Tournament Staff",
  "Transportation Staff",
  "Misc",
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

  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonFirstName, setNewPersonFirstName] = useState("");
  const [newPersonLastName, setNewPersonLastName] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonType, setNewPersonType] = useState("Player");

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

  const [editingArrivalId, setEditingArrivalId] = useState<number | null>(null);
  const [editArrivalMethod, setEditArrivalMethod] = useState("Commercial Flight");
  const [editAirline, setEditAirline] = useState("");
  const [editFlightNumber, setEditFlightNumber] = useState("");
  const [editFlightOrigin, setEditFlightOrigin] = useState("");
  const [editTailNumber, setEditTailNumber] = useState("");
  const [editArrivalDate, setEditArrivalDate] = useState("");
  const [editArrivalTime, setEditArrivalTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingArrivalEdit, setSavingArrivalEdit] = useState(false);

  const today = dateToInputValue(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateToInputValue(tomorrowDate);

  async function loadData() {
    const { data: peopleData, error: peopleError } = await supabase
      .from("people")
      .select("id, first_name, last_name, role")
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

  function openNewPersonForm() {
    const typedName = personSearch.trim();
    const parts = typedName.split(" ").filter(Boolean);

    setNewPersonFirstName(parts[0] || "");
    setNewPersonLastName(parts.slice(1).join(" ") || "");
    setNewPersonPhone("");
    setNewPersonEmail("");
    setNewPersonType("Player");
    setShowNewPersonForm(true);
    setSelectedPerson(null);
  }

  function cancelNewPerson() {
    setShowNewPersonForm(false);
    setNewPersonFirstName("");
    setNewPersonLastName("");
    setNewPersonPhone("");
    setNewPersonEmail("");
    setNewPersonType("Player");
  }

  async function saveNewPerson() {
    const firstName = newPersonFirstName.trim();
    const lastName = newPersonLastName.trim();

    if (!firstName || !lastName) {
      alert("Please enter a first and last name.");
      return;
    }

    const { data, error } = await supabase
      .from("people")
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone: newPersonPhone.trim(),
        email: newPersonEmail.trim(),
        role: newPersonType,
        notes: "",
      })
      .select("id, first_name, last_name, role")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setPeople((current) =>
      [...current, data].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`
        )
      )
    );
    setSelectedPerson(data);
    setPersonSearch(`${data.first_name} ${data.last_name}`);
    cancelNewPerson();
  }

  async function addArrival() {
    if (!selectedPerson) {
      alert("Please select or add a person.");
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

  function beginEditArrival(arrival: Arrival) {
    setEditingArrivalId(arrival.id);
    setEditArrivalMethod(arrival.arrival_method || "Commercial Flight");
    setEditAirline(arrival.airline || "");
    setEditFlightNumber(arrival.flight_number || "");
    setEditFlightOrigin(arrival.flight_origin || "");
    setEditTailNumber(arrival.tail_number || "");
    setEditArrivalDate(arrival.arrival_date || "");
    setEditArrivalTime(
      arrival.estimated_arrival_time
        ? arrival.estimated_arrival_time.slice(0, 5)
        : ""
    );
    setEditNotes(arrival.notes || "");
  }

  function cancelEditArrival() {
    setEditingArrivalId(null);
  }

  async function saveArrivalEdits(id: number) {
    if (!editArrivalDate) {
      alert("Please enter an arrival date.");
      return;
    }

    const isCommercial = editArrivalMethod === "Commercial Flight";
    const isPrivate = editArrivalMethod === "Private Aircraft";
    const isFlight = isCommercial || isPrivate;

    const updatePayload = {
      arrival_method: editArrivalMethod,
      airline: isCommercial || isPrivate ? editAirline.trim() || null : null,
      flight_number: isCommercial ? editFlightNumber.trim() || null : null,
      flight_origin: editFlightOrigin.trim() || null,
      tail_number: isPrivate ? editTailNumber.trim() || null : null,
      arrival_date: editArrivalDate,
      estimated_arrival_time: editArrivalTime || null,
      notes: editNotes.trim() || null,
    };

    setSavingArrivalEdit(true);

    const { error } = await supabase
      .from("player_arrivals")
      .update(updatePayload)
      .eq("id", id);

    setSavingArrivalEdit(false);

    if (error) {
      alert(error.message);
      return;
    }

    setArrivals((current) =>
      current.map((arrival) =>
        arrival.id === id
          ? {
              ...arrival,
              ...updatePayload,
            }
          : arrival
      )
    );

    setEditingArrivalId(null);
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

  function ArrivalCard({
    arrival,
    showDate = false,
  }: {
    arrival: Arrival;
    showDate?: boolean;
  }) {
    return (
      <details className="border-b group">
        <summary className="cursor-pointer list-none p-3 hover:bg-gray-50">
          <div
            className={
              showDate
                ? "grid grid-cols-[120px_1fr] md:grid-cols-[140px_1fr_180px_140px] gap-2 items-center"
                : "grid grid-cols-[90px_1fr] md:grid-cols-[100px_1fr_180px_140px] gap-2 items-center"
            }
          >
            <div className="text-[#1F4E1A]">
              {showDate && (
                <div className="text-xs font-semibold text-gray-600">
                  {formatDate(arrival.arrival_date)}
                </div>
              )}

              <div className="font-bold">
                {formatTime(arrival.estimated_arrival_time) || "Time TBD"}
              </div>
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

        <div className="bg-gray-50 px-3 pb-4">
          <div className="rounded border bg-white p-3">
            <div className="mb-3 grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {formatDate(arrival.arrival_date)}
              </p>

              <p>
                <span className="font-semibold">Time:</span>{" "}
                {formatTime(arrival.estimated_arrival_time) || "TBD"}
              </p>

              <p>
                <span className="font-semibold">Method:</span>{" "}
                {arrival.arrival_method}
              </p>

              {arrival.airline && (
                <p>
                  <span className="font-semibold">
                    {arrival.arrival_method === "Private Aircraft"
                      ? "Operator:"
                      : "Airline:"}
                  </span>{" "}
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

            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold text-gray-500">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-sm">
                {arrival.notes || "No notes"}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => beginEditArrival(arrival)}
                className="rounded bg-[#FFDE00] px-4 py-2 font-bold text-[#1F4E1A] hover:bg-yellow-300"
              >
                Edit Arrival
              </button>

              {arrival.person_id ? (
                <Link
                  href={`/check-out?personId=${arrival.person_id}&arrivalId=${arrival.id}`}
                  className="rounded bg-[#367C2B] px-4 py-2 text-center font-semibold text-white hover:bg-[#2e6e24]"
                >
                  Check Out
                </Link>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded bg-gray-100 px-4 py-2 text-gray-400"
                >
                  Check Out
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteArrival(arrival.id)}
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
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

        <label className="block font-semibold mb-1">Person</label>
        <input
          value={personSearch}
          onChange={(e) => {
            setPersonSearch(e.target.value);
            setSelectedPerson(null);
          }}
          placeholder="Type person name..."
          className="border rounded p-3 w-full"
        />

        {!selectedPerson && personSearch && (
          <div className="border rounded mt-2 mb-4 bg-white overflow-hidden">
            {matchingPeople.length === 0 ? (
              <div className="p-3">
                <p className="text-gray-500 mb-2">No people found.</p>

                <button
                  onClick={openNewPersonForm}
                  className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-2 rounded w-full"
                >
                  Add New Person
                </button>
              </div>
            ) : (
              <>
                {matchingPeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      setSelectedPerson(person);
                      setShowNewPersonForm(false);
                      setPersonSearch(
                        `${person.first_name} ${person.last_name}`
                      );
                    }}
                    className="block w-full text-left p-3 border-b hover:bg-gray-100"
                  >
                    <span className="font-semibold">
                      {person.first_name} {person.last_name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {person.role || "No type"}
                    </span>
                  </button>
                ))}

                <button
                  onClick={openNewPersonForm}
                  className="block w-full text-left p-3 bg-[#FFDE00]/20 text-[#1F4E1A] font-semibold hover:bg-[#FFDE00]/30"
                >
                  + Add New Person
                </button>
              </>
            )}
          </div>
        )}

        {showNewPersonForm && (
          <div className="border-2 border-[#367C2B] rounded-lg p-4 my-4 bg-green-50">
            <h3 className="font-bold text-lg text-[#1F4E1A] mb-3">
              Add New Person
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  First Name *
                </label>
                <input
                  value={newPersonFirstName}
                  onChange={(e) => setNewPersonFirstName(e.target.value)}
                  className="border rounded p-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Last Name *
                </label>
                <input
                  value={newPersonLastName}
                  onChange={(e) => setNewPersonLastName(e.target.value)}
                  className="border rounded p-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Type of Person *
                </label>
                <select
                  value={newPersonType}
                  onChange={(e) => setNewPersonType(e.target.value)}
                  className="border rounded p-3 w-full"
                >
                  {PERSON_TYPES.map((personType) => (
                    <option key={personType} value={personType}>
                      {personType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Phone
                </label>
                <input
                  value={newPersonPhone}
                  onChange={(e) => setNewPersonPhone(e.target.value)}
                  type="tel"
                  className="border rounded p-3 w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">
                  Email
                </label>
                <input
                  value={newPersonEmail}
                  onChange={(e) => setNewPersonEmail(e.target.value)}
                  type="email"
                  className="border rounded p-3 w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={cancelNewPerson}
                className="bg-gray-200 hover:bg-gray-300 rounded px-4 py-2 font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveNewPerson}
                className="bg-[#367C2B] hover:bg-[#2e6e24] text-white rounded px-4 py-2 font-semibold"
              >
                Save Person
              </button>
            </div>
          </div>
        )}

        {selectedPerson && (
          <div className="bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-3 my-4">
            Selected: {selectedPerson.first_name} {selectedPerson.last_name}
            <span className="ml-2 text-sm text-gray-600">
              ({selectedPerson.role || "No type"})
            </span>
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
          <ArrivalCard
            key={arrival.id}
            arrival={arrival}
            showDate
          />
        ))}

        {filteredArrivals.length === 0 && (
          <div className="p-4 text-gray-500">No active arrivals found.</div>
        )}
      </div>

      {editingArrivalId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-arrival-title"
        >
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b bg-[#1F4E1A] px-4 py-4 text-white md:px-6">
              <div>
                <h2 id="edit-arrival-title" className="text-xl font-bold">
                  Edit Arrival
                </h2>
                <p className="mt-1 text-sm text-white/85">
                  {arrivals.find((arrival) => arrival.id === editingArrivalId)
                    ?.player_first_name}{" "}
                  {arrivals.find((arrival) => arrival.id === editingArrivalId)
                    ?.player_last_name}
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEditArrival}
                disabled={savingArrivalEdit}
                className="rounded px-3 py-1 text-2xl leading-none hover:bg-white/15 disabled:opacity-50"
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-4 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold">
                    Arrival Method
                  </label>
                  <select
                    value={editArrivalMethod}
                    onChange={(e) => setEditArrivalMethod(e.target.value)}
                    className="w-full rounded border bg-white p-3"
                  >
                    {ARRIVAL_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold">
                    Arrival Date
                  </label>
                  <input
                    type="date"
                    value={editArrivalDate}
                    onChange={(e) => setEditArrivalDate(e.target.value)}
                    className="w-full rounded border p-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold">
                    Estimated Arrival Time
                  </label>
                  <input
                    type="time"
                    value={editArrivalTime}
                    onChange={(e) => setEditArrivalTime(e.target.value)}
                    className="w-full rounded border p-3"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This may be left blank when the time is still TBD.
                  </p>
                </div>

                {(editArrivalMethod === "Commercial Flight" ||
                  editArrivalMethod === "Private Aircraft") && (
                  <div>
                    <label className="mb-1 block font-semibold">
                      {editArrivalMethod === "Private Aircraft"
                        ? "Operator"
                        : "Airline"}
                    </label>
                    <input
                      value={editAirline}
                      onChange={(e) => setEditAirline(e.target.value)}
                      className="w-full rounded border p-3"
                      placeholder={
                        editArrivalMethod === "Private Aircraft"
                          ? "Example: NetJets"
                          : "Example: American"
                      }
                    />
                  </div>
                )}

                {editArrivalMethod === "Commercial Flight" && (
                  <div>
                    <label className="mb-1 block font-semibold">
                      Flight Number
                    </label>
                    <input
                      value={editFlightNumber}
                      onChange={(e) => setEditFlightNumber(e.target.value)}
                      className="w-full rounded border p-3"
                      placeholder="Example: AA4034"
                    />
                  </div>
                )}

                {editArrivalMethod === "Private Aircraft" && (
                  <div>
                    <label className="mb-1 block font-semibold">
                      Tail Number
                    </label>
                    <input
                      value={editTailNumber}
                      onChange={(e) => setEditTailNumber(e.target.value)}
                      className="w-full rounded border p-3"
                      placeholder="Example: N444AM"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="mb-1 block font-semibold">
                    Coming From / Origin
                  </label>
                  <input
                    value={editFlightOrigin}
                    onChange={(e) => setEditFlightOrigin(e.target.value)}
                    className="w-full rounded border p-3"
                    placeholder="Example: Chicago ORD"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block font-semibold">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={5}
                    className="w-full rounded border p-3"
                    placeholder="Party size, luggage, vehicle request, pickup details..."
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t bg-gray-50 px-4 py-4 md:px-6">
              <button
                type="button"
                onClick={cancelEditArrival}
                disabled={savingArrivalEdit}
                className="rounded bg-gray-200 px-5 py-3 font-semibold hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => saveArrivalEdits(editingArrivalId)}
                disabled={savingArrivalEdit}
                className="rounded bg-[#367C2B] px-5 py-3 font-semibold text-white hover:bg-[#2e6e24] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingArrivalEdit ? "Saving..." : "Save Arrival"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
