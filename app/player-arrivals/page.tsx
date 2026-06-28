"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Person = {
  id: number;
  first_name: string;
  last_name: string;
  role: string | null;
};

type ArrivalRow = {
  id: number;
  arrival_method: string;
  airline: string | null;
  flight_number: string | null;
  flight_origin: string | null;
  tail_number: string | null;
  arrival_date: string | null;
  estimated_arrival_time: string | null;
  status: string | null;
  notes: string | null;
};

type PassengerRow = {
  id: number;
  arrival_id: number;
  person_id: number;
  passenger_notes: string | null;
};

type ArrivalPassenger = Person & {
  passenger_link_id: number;
  checked_out: boolean;
};

type Arrival = ArrivalRow & {
  passengers: ArrivalPassenger[];
};

type OpenCheckout = {
  person_id: number | null;
};

type ArrivalForm = {
  arrival_method: string;
  airline: string;
  flight_number: string;
  flight_origin: string;
  tail_number: string;
  arrival_date: string;
  estimated_arrival_time: string;
  status: string;
  notes: string;
};

const ARRIVAL_METHODS = [
  "Commercial Flight",
  "Private Aircraft",
  "Rental Car",
  "Other",
];

const PERSON_TYPES = [
  "Player",
  "PGA Staff",
  "Tournament Staff",
  "Transportation Staff",
  "Misc",
];

const EMPTY_FORM: ArrivalForm = {
  arrival_method: "Commercial Flight",
  airline: "",
  flight_number: "",
  flight_origin: "",
  tail_number: "",
  arrival_date: "",
  estimated_arrival_time: "",
  status: "Expected",
  notes: "",
};

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateText: string | null) {
  if (!dateText) return "Date TBD";

  return new Date(`${dateText}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "Time TBD";

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeFlightNumber(airline: string, flightNumber: string) {
  const compact = flightNumber.replace(/\s+/g, "").toUpperCase();

  if (!compact) return "";

  if (/^([A-Z]{2}|[A-Z][0-9])\d+/.test(compact)) {
    return compact;
  }

  const normalizedAirline = airline.trim().toLowerCase();

  if (["american", "american airlines", "aa"].includes(normalizedAirline)) {
    return `AA${compact}`;
  }

  if (["delta", "delta air lines", "dl"].includes(normalizedAirline)) {
    return `DL${compact}`;
  }

  if (["united", "united airlines", "ua"].includes(normalizedAirline)) {
    return `UA${compact}`;
  }

  if (["allegiant", "allegiant air", "g4"].includes(normalizedAirline)) {
    return `G4${compact}`;
  }

  return compact;
}

function flightLabel(arrival: ArrivalRow) {
  if (arrival.arrival_method === "Commercial Flight") {
    return arrival.flight_number || "Commercial flight";
  }

  if (arrival.arrival_method === "Private Aircraft") {
    return arrival.tail_number || "Private aircraft";
  }

  return arrival.arrival_method;
}

function sameFlight(arrival: Arrival, form: ArrivalForm) {
  if (!form.arrival_date || arrival.arrival_date !== form.arrival_date) {
    return false;
  }

  if (
    form.arrival_method === "Commercial Flight" &&
    arrival.arrival_method === "Commercial Flight"
  ) {
    return (
      normalizeFlightNumber(form.airline, form.flight_number) ===
      normalizeFlightNumber(
        arrival.airline || "",
        arrival.flight_number || ""
      )
    );
  }

  if (
    form.arrival_method === "Private Aircraft" &&
    arrival.arrival_method === "Private Aircraft"
  ) {
    const formTail = form.tail_number
      .replace(/[\s-]+/g, "")
      .toUpperCase();
    const arrivalTail = (arrival.tail_number || "")
      .replace(/[\s-]+/g, "")
      .toUpperCase();
    const sameTime =
      (form.estimated_arrival_time || "") ===
      (arrival.estimated_arrival_time || "").slice(0, 5);

    if (formTail && arrivalTail) {
      return formTail === arrivalTail && sameTime;
    }

    return (
      !formTail &&
      !arrivalTail &&
      Boolean(form.airline.trim()) &&
      form.airline.trim().toLowerCase() ===
        (arrival.airline || "").trim().toLowerCase() &&
      sameTime
    );
  }

  return false;
}

function PassengerPicker({
  people,
  selectedIds,
  onChange,
  personArrivalLabels,
}: {
  people: Person[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  personArrivalLabels: Map<number, string>;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedPeople = selectedIds
    .map((id) => people.find((person) => person.id === id))
    .filter((person): person is Person => Boolean(person));

  const normalizedSearch = search.trim().toLowerCase();

  const matches = people
    .filter((person) => !selectedIds.includes(person.id))
    .filter((person) => {
      if (!normalizedSearch) return true;

      return `${person.first_name} ${person.last_name} ${person.role || ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .slice(0, 10);

  function addPerson(id: number) {
    onChange([...selectedIds, id]);
    setSearch("");
    setOpen(true);
  }

  function removePerson(id: number) {
    onChange(selectedIds.filter((personId) => personId !== id));
  }

  return (
    <div>
      <label className="mb-1 block font-semibold">
        People on This Arrival *
      </label>

      {selectedPeople.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedPeople.map((person) => (
            <span
              key={person.id}
              className="inline-flex items-center gap-2 rounded-full bg-[#1F4E1A] px-3 py-2 text-sm font-semibold text-white"
            >
              {person.first_name} {person.last_name}
              <button
                type="button"
                onClick={() => removePerson(person.id)}
                className="rounded-full px-1 hover:bg-white/20"
                aria-label={`Remove ${person.first_name} ${person.last_name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          placeholder="Type a player or staff name..."
          autoComplete="off"
          className="w-full rounded border p-3"
        />

        {open && (
          <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded border bg-white shadow-xl">
            {matches.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                No matching people available.
              </div>
            ) : (
              matches.map((person) => {
                const existingLabel = personArrivalLabels.get(person.id);

                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => addPerson(person.id)}
                    className="block w-full border-b p-3 text-left hover:bg-gray-100"
                  >
                    <div className="font-semibold">
                      {person.first_name} {person.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {person.role || "No type"}
                    </div>
                    {existingLabel && (
                      <div className="mt-1 text-xs font-semibold text-orange-700">
                        Currently assigned to {existingLabel}; saving will move
                        this person.
                      </div>
                    )}
                  </button>
                );
              })
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="block w-full bg-gray-100 p-2 text-center text-sm font-semibold"
            >
              Close list
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayerArrivalsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<ArrivalForm>({ ...EMPTY_FORM });
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonFirstName, setNewPersonFirstName] = useState("");
  const [newPersonLastName, setNewPersonLastName] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonType, setNewPersonType] = useState("Player");
  const [savingNewPerson, setSavingNewPerson] = useState(false);

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const [editingArrivalId, setEditingArrivalId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ArrivalForm>({ ...EMPTY_FORM });
  const [editPersonIds, setEditPersonIds] = useState<number[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const today = dateToInputValue(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateToInputValue(tomorrowDate);

  async function loadData() {
    setLoading(true);

    const [
      peopleResult,
      arrivalsResult,
      passengerResult,
      checkoutResult,
    ] = await Promise.all([
      supabase
        .from("people")
        .select("id, first_name, last_name, role")
        .order("last_name")
        .order("first_name"),
      supabase
        .from("player_arrivals")
        .select(
          "id, arrival_method, airline, flight_number, flight_origin, tail_number, arrival_date, estimated_arrival_time, status, notes"
        )
        .order("arrival_date", { ascending: true })
        .order("estimated_arrival_time", { ascending: true }),
      supabase
        .from("arrival_passengers")
        .select("id, arrival_id, person_id, passenger_notes"),
      supabase
        .from("checkouts")
        .select("person_id")
        .is("time_in", null),
    ]);

    const error =
      peopleResult.error ||
      arrivalsResult.error ||
      passengerResult.error ||
      checkoutResult.error;

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const loadedPeople = (peopleResult.data || []) as Person[];
    const peopleById = new Map(
      loadedPeople.map((person) => [person.id, person])
    );

    const checkedOutIds = new Set(
      ((checkoutResult.data || []) as OpenCheckout[])
        .map((checkout) => checkout.person_id)
        .filter((id): id is number => id !== null)
    );

    const passengersByArrival = new Map<number, ArrivalPassenger[]>();

    for (const link of (passengerResult.data || []) as PassengerRow[]) {
      const person = peopleById.get(link.person_id);
      if (!person) continue;

      const list = passengersByArrival.get(link.arrival_id) || [];
      list.push({
        ...person,
        passenger_link_id: link.id,
        checked_out: checkedOutIds.has(person.id),
      });
      passengersByArrival.set(link.arrival_id, list);
    }

    const loadedArrivals = ((arrivalsResult.data || []) as ArrivalRow[]).map(
      (arrival) => ({
        ...arrival,
        passengers: (passengersByArrival.get(arrival.id) || []).sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(
            `${b.last_name} ${b.first_name}`
          )
        ),
      })
    );

    setPeople(loadedPeople);
    setArrivals(loadedArrivals);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const personArrivalLabels = useMemo(() => {
    const result = new Map<number, string>();

    for (const arrival of arrivals) {
      for (const passenger of arrival.passengers) {
        result.set(
          passenger.id,
          `${flightLabel(arrival)} on ${formatDate(arrival.arrival_date)}`
        );
      }
    }

    return result;
  }, [arrivals]);

  const existingFlight = useMemo(
    () => arrivals.find((arrival) => sameFlight(arrival, form)) || null,
    [arrivals, form]
  );

  const visibleArrivals = useMemo(
    () =>
      arrivals.filter(
        (arrival) =>
          arrival.passengers.length === 0 ||
          arrival.passengers.some((passenger) => !passenger.checked_out)
      ),
    [arrivals]
  );

  const filteredArrivals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleArrivals.filter((arrival) => {
      const passengerNames = arrival.passengers
        .map(
          (passenger) =>
            `${passenger.first_name} ${passenger.last_name} ${passenger.role || ""}`
        )
        .join(" ");

      const searchable = [
        passengerNames,
        arrival.arrival_method,
        arrival.airline,
        arrival.flight_number,
        arrival.flight_origin,
        arrival.tail_number,
        arrival.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (!methodFilter || arrival.arrival_method === methodFilter)
      );
    });
  }, [visibleArrivals, search, methodFilter]);

  const todayArrivals = filteredArrivals.filter(
    (arrival) => arrival.arrival_date === today
  );

  const tomorrowArrivals = filteredArrivals.filter(
    (arrival) => arrival.arrival_date === tomorrow
  );

  function updateForm<K extends keyof ArrivalForm>(
    key: K,
    value: ArrivalForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateEditForm<K extends keyof ArrivalForm>(
    key: K,
    value: ArrivalForm[K]
  ) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function resetAddForm() {
    setForm({ ...EMPTY_FORM });
    setSelectedPersonIds([]);
  }

  async function saveNewPerson() {
    const firstName = newPersonFirstName.trim();
    const lastName = newPersonLastName.trim();

    if (!firstName || !lastName) {
      alert("Please enter a first and last name.");
      return;
    }

    const duplicate = people.find(
      (person) =>
        person.first_name.trim().toLowerCase() === firstName.toLowerCase() &&
        person.last_name.trim().toLowerCase() === lastName.toLowerCase()
    );

    if (
      duplicate &&
      !window.confirm(
        `${duplicate.first_name} ${duplicate.last_name} already exists. Select the existing person instead?`
      )
    ) {
      return;
    }

    if (duplicate) {
      setSelectedPersonIds((current) =>
        current.includes(duplicate.id) ? current : [...current, duplicate.id]
      );
      setShowNewPersonForm(false);
      return;
    }

    setSavingNewPerson(true);

    const { data, error } = await supabase
      .from("people")
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone: newPersonPhone.trim() || null,
        email: newPersonEmail.trim() || null,
        role: newPersonType,
        notes: null,
      })
      .select("id, first_name, last_name, role")
      .single();

    setSavingNewPerson(false);

    if (error) {
      alert(error.message);
      return;
    }

    const person = data as Person;

    setPeople((current) =>
      [...current, person].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`
        )
      )
    );
    setSelectedPersonIds((current) => [...current, person.id]);
    setShowNewPersonForm(false);
    setNewPersonFirstName("");
    setNewPersonLastName("");
    setNewPersonPhone("");
    setNewPersonEmail("");
    setNewPersonType("Player");
  }

  async function saveArrival() {
    if (selectedPersonIds.length === 0) {
      alert("Select at least one person.");
      return;
    }

    if (!form.arrival_date) {
      alert("Arrival date is required.");
      return;
    }

    if (
      form.arrival_method === "Commercial Flight" &&
      !form.flight_number.trim()
    ) {
      alert("Commercial flights require a flight number.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("save_arrival_flight", {
      p_arrival_id: existingFlight?.id || null,
      p_arrival_method: form.arrival_method,
      p_airline: form.airline || null,
      p_flight_number:
        form.arrival_method === "Commercial Flight"
          ? normalizeFlightNumber(form.airline, form.flight_number)
          : null,
      p_flight_origin: form.flight_origin || null,
      p_tail_number:
        form.arrival_method === "Private Aircraft"
          ? form.tail_number
          : null,
      p_arrival_date: form.arrival_date,
      p_estimated_arrival_time: form.estimated_arrival_time || null,
      p_status: form.status || "Expected",
      p_notes: form.notes || null,
      p_person_ids: selectedPersonIds,
      p_replace_passengers: false,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      existingFlight
        ? `People added to existing ${flightLabel(existingFlight)} arrival.`
        : "Arrival created."
    );

    resetAddForm();
    await loadData();
  }

  function beginEdit(arrival: Arrival) {
    setEditingArrivalId(arrival.id);
    setEditForm({
      arrival_method: arrival.arrival_method,
      airline: arrival.airline || "",
      flight_number: arrival.flight_number || "",
      flight_origin: arrival.flight_origin || "",
      tail_number: arrival.tail_number || "",
      arrival_date: arrival.arrival_date || "",
      estimated_arrival_time:
        arrival.estimated_arrival_time?.slice(0, 5) || "",
      status: arrival.status || "Expected",
      notes: arrival.notes || "",
    });
    setEditPersonIds(arrival.passengers.map((passenger) => passenger.id));
  }

  async function saveEdit() {
    if (editingArrivalId === null) return;

    if (editPersonIds.length === 0) {
      alert("An arrival must have at least one person.");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase.rpc("save_arrival_flight", {
      p_arrival_id: editingArrivalId,
      p_arrival_method: editForm.arrival_method,
      p_airline: editForm.airline || null,
      p_flight_number:
        editForm.arrival_method === "Commercial Flight"
          ? normalizeFlightNumber(
              editForm.airline,
              editForm.flight_number
            )
          : null,
      p_flight_origin: editForm.flight_origin || null,
      p_tail_number:
        editForm.arrival_method === "Private Aircraft"
          ? editForm.tail_number
          : null,
      p_arrival_date: editForm.arrival_date,
      p_estimated_arrival_time:
        editForm.estimated_arrival_time || null,
      p_status: editForm.status || "Expected",
      p_notes: editForm.notes || null,
      p_person_ids: editPersonIds,
      p_replace_passengers: true,
    });

    setSavingEdit(false);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingArrivalId(null);
    await loadData();
  }

  async function deleteArrival(id: number) {
    if (
      !window.confirm(
        "Delete this flight/arrival and remove everyone assigned to it?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("player_arrivals")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  function ArrivalCard({
    arrival,
    showDate,
  }: {
    arrival: Arrival;
    showDate: boolean;
  }) {
    const activePassengers = arrival.passengers.filter(
      (passenger) => !passenger.checked_out
    );

    return (
      <details className="group border-b last:border-b-0">
        <summary className="cursor-pointer list-none p-4 hover:bg-gray-50">
          <div className="grid gap-2 md:grid-cols-[125px_150px_1fr_110px] md:items-center">
            <div>
              {showDate && (
                <div className="text-xs font-semibold text-gray-500">
                  {formatDate(arrival.arrival_date)}
                </div>
              )}
              <div className="text-lg font-bold text-[#1F4E1A]">
                {formatTime(arrival.estimated_arrival_time)}
              </div>
            </div>

            <div>
              <div className="font-bold">{flightLabel(arrival)}</div>
              <div className="text-xs text-gray-500">
                {arrival.arrival_method}
              </div>
            </div>

            <div>
              <div className="font-semibold">
                {activePassengers
                  .map(
                    (passenger) =>
                      `${passenger.first_name} ${passenger.last_name}`
                  )
                  .join(", ") || "No people waiting"}
              </div>
              <div className="text-xs text-gray-500">
                {arrival.flight_origin
                  ? `From ${arrival.flight_origin}`
                  : arrival.airline || ""}
              </div>
            </div>

            <div className="text-sm font-bold text-gray-700">
              {activePassengers.length} waiting
            </div>
          </div>
        </summary>

        <div className="bg-gray-50 px-4 pb-4">
          <div className="rounded border bg-white p-4">
            <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
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
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {arrival.status || "Expected"}
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
                  <span className="font-semibold">Flight:</span>{" "}
                  {arrival.flight_number}
                </p>
              )}
              {arrival.tail_number && (
                <p>
                  <span className="font-semibold">Tail:</span>{" "}
                  {arrival.tail_number}
                </p>
              )}
              {arrival.flight_origin && (
                <p>
                  <span className="font-semibold">From:</span>{" "}
                  {arrival.flight_origin}
                </p>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 font-semibold">
                People on this arrival ({arrival.passengers.length})
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {arrival.passengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className={`flex items-center justify-between gap-3 rounded border p-3 ${
                      passenger.checked_out
                        ? "bg-gray-100 text-gray-500"
                        : "bg-white"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">
                        {passenger.first_name} {passenger.last_name}
                      </div>
                      <div className="text-xs">
                        {passenger.role || "No type"}
                        {passenger.checked_out ? " — checked out" : ""}
                      </div>
                    </div>

                    {!passenger.checked_out && (
                      <Link
                        href={`/check-out?personId=${passenger.id}&arrivalId=${arrival.id}`}
                        className="rounded bg-[#367C2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2e6e24]"
                      >
                        Check Out
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {arrival.notes && (
              <div className="mt-4 rounded bg-gray-50 p-3 text-sm">
                <div className="mb-1 font-semibold">Arrival Notes</div>
                <div className="whitespace-pre-wrap">{arrival.notes}</div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => beginEdit(arrival)}
                className="rounded bg-[#FFDE00] px-4 py-2 font-bold text-[#1F4E1A]"
              >
                Edit Flight & People
              </button>

              <button
                type="button"
                onClick={() => deleteArrival(arrival.id)}
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              >
                Delete Arrival
              </button>
            </div>
          </div>
        </div>
      </details>
    );
  }

  function ArrivalList({
    title,
    records,
    showDate,
  }: {
    title: string;
    records: Arrival[];
    showDate: boolean;
  }) {
    return (
      <section className="mb-5">
        <h2 className="mb-2 text-xl font-bold text-[#1F4E1A]">{title}</h2>
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          {records.length > 0 ? (
            records.map((arrival) => (
              <ArrivalCard
                key={arrival.id}
                arrival={arrival}
                showDate={showDate}
              />
            ))
          ) : (
            <div className="p-4 text-gray-500">No arrivals found.</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Arrivals by Flight</h1>
            <p className="mt-1 text-sm text-gray-600">
              One arrival record can contain multiple players or staff.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/player-arrivals/flights"
              className="rounded bg-[#FFDE00] px-4 py-2 font-bold text-[#1F4E1A]"
            >
              MLI 48-Hour Flights
            </Link>
            <button
              type="button"
              onClick={loadData}
              className="rounded bg-[#1F4E1A] px-4 py-2 text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        <section className="mb-5 max-w-4xl rounded-lg border-t-4 border-[#367C2B] bg-white p-4 shadow">
          <h2 className="mb-3 text-xl font-bold text-[#1F4E1A]">
            Add Flight or Arrival
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold">
                Arrival Method
              </label>
              <select
                value={form.arrival_method}
                onChange={(event) =>
                  updateForm("arrival_method", event.target.value)
                }
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
              <label className="mb-1 block font-semibold">Status</label>
              <input
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value)
                }
                className="w-full rounded border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">
                Arrival Date *
              </label>
              <input
                type="date"
                value={form.arrival_date}
                onChange={(event) =>
                  updateForm("arrival_date", event.target.value)
                }
                className="w-full rounded border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">
                Estimated Arrival Time
              </label>
              <input
                type="time"
                value={form.estimated_arrival_time}
                onChange={(event) =>
                  updateForm(
                    "estimated_arrival_time",
                    event.target.value
                  )
                }
                className="w-full rounded border p-3"
              />
            </div>

            {(form.arrival_method === "Commercial Flight" ||
              form.arrival_method === "Private Aircraft") && (
              <div>
                <label className="mb-1 block font-semibold">
                  {form.arrival_method === "Private Aircraft"
                    ? "Operator"
                    : "Airline"}
                </label>
                <input
                  value={form.airline}
                  onChange={(event) =>
                    updateForm("airline", event.target.value)
                  }
                  className="w-full rounded border p-3"
                />
              </div>
            )}

            {form.arrival_method === "Commercial Flight" && (
              <div>
                <label className="mb-1 block font-semibold">
                  Flight Number *
                </label>
                <input
                  value={form.flight_number}
                  onChange={(event) =>
                    updateForm("flight_number", event.target.value)
                  }
                  placeholder="Example: DL4950"
                  className="w-full rounded border p-3"
                />
              </div>
            )}

            {form.arrival_method === "Private Aircraft" && (
              <div>
                <label className="mb-1 block font-semibold">
                  Tail Number
                </label>
                <input
                  value={form.tail_number}
                  onChange={(event) =>
                    updateForm("tail_number", event.target.value)
                  }
                  placeholder="Optional when tail number is pending"
                  className="w-full rounded border p-3"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="mb-1 block font-semibold">
                Coming From / Origin
              </label>
              <input
                value={form.flight_origin}
                onChange={(event) =>
                  updateForm("flight_origin", event.target.value)
                }
                className="w-full rounded border p-3"
              />
            </div>

            <div className="md:col-span-2">
              <PassengerPicker
                people={people}
                selectedIds={selectedPersonIds}
                onChange={setSelectedPersonIds}
                personArrivalLabels={personArrivalLabels}
              />

              <button
                type="button"
                onClick={() => setShowNewPersonForm((current) => !current)}
                className="mt-2 text-sm font-semibold text-[#1F4E1A] underline"
              >
                + Add a new person
              </button>
            </div>

            {showNewPersonForm && (
              <div className="md:col-span-2 rounded border-2 border-[#FFDE00] bg-[#FFDE00]/10 p-4">
                <div className="mb-3 font-bold text-[#1F4E1A]">
                  Add New Person
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={newPersonFirstName}
                    onChange={(event) =>
                      setNewPersonFirstName(event.target.value)
                    }
                    placeholder="First name"
                    className="rounded border bg-white p-3"
                  />
                  <input
                    value={newPersonLastName}
                    onChange={(event) =>
                      setNewPersonLastName(event.target.value)
                    }
                    placeholder="Last name"
                    className="rounded border bg-white p-3"
                  />
                  <select
                    value={newPersonType}
                    onChange={(event) =>
                      setNewPersonType(event.target.value)
                    }
                    className="rounded border bg-white p-3"
                  >
                    {PERSON_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newPersonPhone}
                    onChange={(event) =>
                      setNewPersonPhone(event.target.value)
                    }
                    placeholder="Phone"
                    className="rounded border bg-white p-3"
                  />
                  <input
                    value={newPersonEmail}
                    onChange={(event) =>
                      setNewPersonEmail(event.target.value)
                    }
                    placeholder="Email"
                    type="email"
                    className="rounded border bg-white p-3 md:col-span-2"
                  />
                </div>

                <button
                  type="button"
                  onClick={saveNewPerson}
                  disabled={savingNewPerson}
                  className="mt-3 rounded bg-[#367C2B] px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {savingNewPerson
                    ? "Saving Person..."
                    : "Save and Add Person"}
                </button>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="mb-1 block font-semibold">Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateForm("notes", event.target.value)
                }
                rows={4}
                className="w-full rounded border p-3"
              />
            </div>
          </div>

          {existingFlight && (
            <div className="mt-4 rounded border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
              <span className="font-bold">
                Existing flight found:
              </span>{" "}
              {flightLabel(existingFlight)} on{" "}
              {formatDate(existingFlight.arrival_date)}. Saving will add the
              selected people to that one record rather than creating a
              duplicate.
            </div>
          )}

          <button
            type="button"
            onClick={saveArrival}
            disabled={saving}
            className="mt-4 w-full rounded bg-[#367C2B] px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : existingFlight
                ? "Add People to Existing Arrival"
                : "Create Arrival"}
          </button>
        </section>

        <section className="mb-5 grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search flight, tail number, origin, or person..."
            className="rounded border p-3"
          />
          <select
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
            className="rounded border bg-white p-3"
          >
            <option value="">All arrival methods</option>
            {ARRIVAL_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </section>

        {loading ? (
          <div className="rounded bg-white p-8 text-center text-gray-500">
            Loading arrivals...
          </div>
        ) : (
          <>
            <ArrivalList
              title="Today's Arrivals"
              records={todayArrivals}
              showDate={false}
            />
            <ArrivalList
              title="Tomorrow's Arrivals"
              records={tomorrowArrivals}
              showDate={false}
            />
            <ArrivalList
              title="All Active Arrivals"
              records={filteredArrivals}
              showDate
            />
          </>
        )}

        {editingArrivalId !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#1F4E1A] px-5 py-4 text-white">
                <div>
                  <h2 className="text-xl font-bold">
                    Edit Flight & Passenger Manifest
                  </h2>
                  <p className="text-sm text-white/80">
                    Changes apply to everyone on this arrival.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingArrivalId(null)}
                  className="px-3 py-1 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={editForm.arrival_method}
                    onChange={(event) =>
                      updateEditForm(
                        "arrival_method",
                        event.target.value
                      )
                    }
                    className="rounded border bg-white p-3"
                  >
                    {ARRIVAL_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>

                  <input
                    value={editForm.status}
                    onChange={(event) =>
                      updateEditForm("status", event.target.value)
                    }
                    placeholder="Status"
                    className="rounded border p-3"
                  />

                  <input
                    type="date"
                    value={editForm.arrival_date}
                    onChange={(event) =>
                      updateEditForm(
                        "arrival_date",
                        event.target.value
                      )
                    }
                    className="rounded border p-3"
                  />

                  <input
                    type="time"
                    value={editForm.estimated_arrival_time}
                    onChange={(event) =>
                      updateEditForm(
                        "estimated_arrival_time",
                        event.target.value
                      )
                    }
                    className="rounded border p-3"
                  />

                  {(editForm.arrival_method === "Commercial Flight" ||
                    editForm.arrival_method === "Private Aircraft") && (
                    <input
                      value={editForm.airline}
                      onChange={(event) =>
                        updateEditForm("airline", event.target.value)
                      }
                      placeholder={
                        editForm.arrival_method === "Private Aircraft"
                          ? "Operator"
                          : "Airline"
                      }
                      className="rounded border p-3"
                    />
                  )}

                  {editForm.arrival_method === "Commercial Flight" && (
                    <input
                      value={editForm.flight_number}
                      onChange={(event) =>
                        updateEditForm(
                          "flight_number",
                          event.target.value
                        )
                      }
                      placeholder="Flight number"
                      className="rounded border p-3"
                    />
                  )}

                  {editForm.arrival_method === "Private Aircraft" && (
                    <input
                      value={editForm.tail_number}
                      onChange={(event) =>
                        updateEditForm(
                          "tail_number",
                          event.target.value
                        )
                      }
                      placeholder="Tail number"
                      className="rounded border p-3"
                    />
                  )}

                  <input
                    value={editForm.flight_origin}
                    onChange={(event) =>
                      updateEditForm(
                        "flight_origin",
                        event.target.value
                      )
                    }
                    placeholder="Origin"
                    className="rounded border p-3 md:col-span-2"
                  />

                  <div className="md:col-span-2">
                    <PassengerPicker
                      people={people}
                      selectedIds={editPersonIds}
                      onChange={setEditPersonIds}
                      personArrivalLabels={personArrivalLabels}
                    />
                  </div>

                  <textarea
                    value={editForm.notes}
                    onChange={(event) =>
                      updateEditForm("notes", event.target.value)
                    }
                    rows={4}
                    placeholder="Arrival notes"
                    className="rounded border p-3 md:col-span-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t bg-gray-50 p-4">
                <button
                  type="button"
                  onClick={() => setEditingArrivalId(null)}
                  className="rounded bg-gray-200 px-5 py-3 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="rounded bg-[#367C2B] px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Flight"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
