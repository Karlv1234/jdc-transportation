"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

const ROLE_OPTIONS = [
  "Player",
  "PGA Staff",
  "Tournament Staff",
  "Transportation Staff",
  "Misc",
];

type Vehicle = {
  id: number;
  car_number: number;
  make: string | null;
  model: string | null;
  type: string | null;
  color: string | null;
  current_location: string | null;
  status: string | null;
};

type Person = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  notes?: string | null;
};

type ArrivalPrefill = {
  id: number;
  person_id: number | null;
  arrival_method: string;
  airline: string | null;
  flight_number: string | null;
  flight_origin: string | null;
  tail_number: string | null;
  arrival_date: string | null;
  estimated_arrival_time: string | null;
  notes: string | null;
};

function formatArrivalPrefillNote(arrival: ArrivalPrefill) {
  const details = [
    `Arrival: ${arrival.arrival_method}`,
    arrival.airline ? `Airline: ${arrival.airline}` : "",
    arrival.flight_number ? `Flight: ${arrival.flight_number}` : "",
    arrival.flight_origin ? `From: ${arrival.flight_origin}` : "",
    arrival.tail_number ? `Tail: ${arrival.tail_number}` : "",
    arrival.arrival_date ? `Date: ${arrival.arrival_date}` : "",
    arrival.estimated_arrival_time ? `Time: ${arrival.estimated_arrival_time}` : "",
  ].filter(Boolean);

  if (arrival.notes) {
    details.push(`Arrival notes: ${arrival.notes}`);
  }

  return details.join(" | ");
}

function RequiredAsterisk() {
  return <span className="text-red-600 font-bold ml-1">*</span>;
}

export default function CheckOutPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [location, setLocation] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personComboOpen, setPersonComboOpen] = useState(false);
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonFirstName, setNewPersonFirstName] = useState("");
  const [newPersonLastName, setNewPersonLastName] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("Player");
  const [newPersonNotes, setNewPersonNotes] = useState("");
  const [savingNewPerson, setSavingNewPerson] = useState(false);
  const [onBehalfOf, setOnBehalfOf] = useState("");
  const [checkedOutBy, setCheckedOutBy] = useState("");
  const [notes, setNotes] = useState("");
  const [prefillLoaded, setPrefillLoaded] = useState(false);

  async function loadData() {
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .order("car_number");

    const { data: peopleData } = await supabase
      .from("people")
      .select("id, first_name, last_name, phone, email, role, notes")
      .order("last_name");

    setVehicles(vehicleData || []);
    setPeople(peopleData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (
      prefillLoaded ||
      vehicles.length === 0 ||
      people.length === 0
    ) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const personIdParam = Number(params.get("personId"));
    const arrivalIdParam = Number(params.get("arrivalId"));
    const vehicleIdParam = Number(params.get("vehicleId"));
    const carNumberParam = Number(params.get("carNumber"));

    const hasPersonId = Number.isInteger(personIdParam) && personIdParam > 0;
    const hasArrivalId = Number.isInteger(arrivalIdParam) && arrivalIdParam > 0;
    const hasVehicleId =
      Number.isInteger(vehicleIdParam) && vehicleIdParam > 0;
    const hasCarNumber =
      Number.isInteger(carNumberParam) && carNumberParam > 0;

    if (
      !hasPersonId &&
      !hasArrivalId &&
      !hasVehicleId &&
      !hasCarNumber
    ) {
      setPrefillLoaded(true);
      return;
    }

    async function prefillCheckout() {
      const vehicleToSelect =
        (hasVehicleId
          ? vehicles.find((vehicle) => vehicle.id === vehicleIdParam)
          : null) ||
        (hasCarNumber
          ? vehicles.find(
              (vehicle) => vehicle.car_number === carNumberParam
            )
          : null) ||
        null;

      if (
        vehicleToSelect &&
        vehicleToSelect.status !== "Checked Out"
      ) {
        setSelectedVehicle(vehicleToSelect);
        setVehicleSearch(String(vehicleToSelect.car_number));

        if (
          vehicleToSelect.current_location &&
          vehicleToSelect.current_location !== "Checked Out"
        ) {
          setLocation(vehicleToSelect.current_location);
        }
      }

      let personToSelect = hasPersonId
        ? people.find((person) => person.id === personIdParam) || null
        : null;

      if (hasArrivalId) {
        const { data: arrivalData, error: arrivalError } = await supabase
          .from("player_arrivals")
          .select(
            "id, person_id, arrival_method, airline, flight_number, flight_origin, tail_number, arrival_date, estimated_arrival_time, notes"
          )
          .eq("id", arrivalIdParam)
          .single();

        if (!arrivalError && arrivalData) {
          const arrival = arrivalData as ArrivalPrefill;

          if (!personToSelect && arrival.person_id) {
            personToSelect =
              people.find((person) => person.id === arrival.person_id) || null;
          }

          setNotes(formatArrivalPrefillNote(arrival));
        }
      }

      if (personToSelect) {
        setSelectedPerson(personToSelect);
        setPersonSearch(
          `${personToSelect.first_name} ${personToSelect.last_name}`
        );
      }

      setPrefillLoaded(true);
    }

    prefillCheckout();
  }, [vehicles, people, prefillLoaded]);

  const availableVehicles = vehicles.filter(
    (v) =>
      v.status !== "Checked Out" &&
      (!location || v.current_location === location)
  );

  const locations = Array.from(
    new Set(
      vehicles
        .filter((v) => v.status !== "Checked Out")
        .map((v) => v.current_location)
        .filter((l): l is string => Boolean(l))
        .filter((l) => l !== "Checked Out")
    )
  ).sort();

  const normalizedVehicleSearch = vehicleSearch.trim();

  const matchingVehicles = availableVehicles
    .filter((vehicle) =>
      String(vehicle.car_number).includes(normalizedVehicleSearch)
    )
    .sort((a, b) => {
      const aExact =
        String(a.car_number) === normalizedVehicleSearch ? 0 : 1;
      const bExact =
        String(b.car_number) === normalizedVehicleSearch ? 0 : 1;

      return aExact - bExact || a.car_number - b.car_number;
    })
    .slice(0, 8);

  function chooseVehicle(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setVehicleSearch(String(vehicle.car_number));
  }

  const normalizedPersonSearch = personSearch.trim().toLowerCase();

  const matchingPeople = people
    .filter((person) => {
      if (!normalizedPersonSearch) return true;

      const searchable = [
        person.first_name,
        person.last_name,
        `${person.first_name} ${person.last_name}`,
        person.phone,
        person.email,
        person.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedPersonSearch);
    })
    .sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`
      )
    )
    .slice(0, 8);

  function choosePerson(person: Person) {
    setSelectedPerson(person);
    setPersonSearch(`${person.first_name} ${person.last_name}`);
    setPersonComboOpen(false);
    setShowNewPersonForm(false);
  }

  function openNewPersonForm() {
    const parts = personSearch.trim().split(/\s+/).filter(Boolean);

    if (parts.length > 0 && !newPersonFirstName) {
      setNewPersonFirstName(parts[0]);
    }

    if (parts.length > 1 && !newPersonLastName) {
      setNewPersonLastName(parts.slice(1).join(" "));
    }

    setSelectedPerson(null);
    setPersonComboOpen(false);
    setShowNewPersonForm(true);
  }

  function cancelNewPerson() {
    setShowNewPersonForm(false);
    setNewPersonFirstName("");
    setNewPersonLastName("");
    setNewPersonPhone("");
    setNewPersonEmail("");
    setNewPersonRole("Player");
    setNewPersonNotes("");
  }

  async function saveNewPerson() {
    const firstName = newPersonFirstName.trim();
    const lastName = newPersonLastName.trim();

    if (!firstName || !lastName) {
      alert("First and last name are required.");
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
        `${duplicate.first_name} ${duplicate.last_name} already exists. Add another person with the same name?`
      )
    ) {
      choosePerson(duplicate);
      cancelNewPerson();
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
        role: newPersonRole,
        notes: newPersonNotes.trim() || null,
      })
      .select("id, first_name, last_name, phone, email, role, notes")
      .single();

    setSavingNewPerson(false);

    if (error) {
      alert(error.message);
      return;
    }

    const createdPerson = data as Person;

    setPeople((current) =>
      [...current, createdPerson].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`
        )
      )
    );

    choosePerson(createdPerson);
    cancelNewPerson();
  }

  async function submitCheckout() {
    if (!selectedVehicle) return alert("Please select a car.");
    if (!selectedPerson) return alert("Please select a person.");
    if (!checkedOutBy.trim()) return alert("Please enter who checked this out.");

    const now = new Date().toISOString();
    const startLocation = selectedVehicle.current_location || "Unknown";

    const { error: checkoutError } = await supabase.from("checkouts").insert({
      vehicle_id: selectedVehicle.id,
      person_id: selectedPerson.id,
      car_number: selectedVehicle.car_number,
      person_first_name: selectedPerson.first_name,
      person_last_name: selectedPerson.last_name,
      phone: selectedPerson.phone,
      email: selectedPerson.email,
      on_behalf_of: onBehalfOf,
      checked_out_by: checkedOutBy,
      time_out: now,
      start_location: startLocation,
      checkout_notes: notes,
      status: "Checked Out",
    });

    if (checkoutError) return alert(checkoutError.message);

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({
        status: "Checked Out",
        current_location: "Checked Out",
      })
      .eq("id", selectedVehicle.id);

    if (vehicleError) return alert(vehicleError.message);

    alert(`Car #${selectedVehicle.car_number} checked out.`);

    setLocation("");
    setVehicleSearch("");
    setSelectedVehicle(null);
    setPersonSearch("");
    setSelectedPerson(null);
    setPersonComboOpen(false);
    cancelNewPerson();
    setOnBehalfOf("");
    setCheckedOutBy("");
    setNotes("");
    loadData();
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <h1 className="text-3xl font-bold mb-4">Check Out</h1>

      <div className="bg-white rounded-lg shadow p-4 max-w-xl">
        <p className="text-xs text-gray-500 mb-3">
          <RequiredAsterisk /> indicates a required field.
        </p>

        <label className="block font-semibold mb-1">Location</label>
        <select
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setVehicleSearch("");
            setSelectedVehicle(null);
          }}
          className="border rounded p-3 w-full mb-4"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <label className="block font-semibold mb-1">
          Car Number
          <RequiredAsterisk />
        </label>

        <input
          value={vehicleSearch}
          onChange={(e) => {
            const nextValue = e.target.value.replace(/[^0-9]/g, "");
            setVehicleSearch(nextValue);

            const exactVehicle = availableVehicles.find(
              (vehicle) => String(vehicle.car_number) === nextValue
            );

            setSelectedVehicle(exactVehicle || null);
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Type the car number..."
          className="border rounded p-3 w-full"
          required
        />

        {!selectedVehicle && normalizedVehicleSearch && (
          <div className="border rounded mt-2 mb-4 bg-white overflow-hidden">
            {matchingVehicles.length === 0 ? (
              <div className="p-3 text-gray-500">
                No available car #{normalizedVehicleSearch}
                {location ? ` at ${location}` : ""}.
              </div>
            ) : (
              matchingVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => chooseVehicle(vehicle)}
                  className="block w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-100"
                >
                  <div className="font-semibold">
                    Car #{vehicle.car_number}
                  </div>
                  <div className="text-sm text-gray-600">
                    {vehicle.model || "Unknown model"}
                    {vehicle.type ? ` — ${vehicle.type}` : ""}
                    {vehicle.color ? ` — ${vehicle.color}` : ""}
                    {vehicle.current_location
                      ? ` — ${vehicle.current_location}`
                      : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        <details className="mb-4 mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-[#1F4E1A]">
            Browse all available cars
          </summary>

          <select
            value={selectedVehicle?.id || ""}
            onChange={(e) => {
              const vehicle = availableVehicles.find(
                (item) => item.id === Number(e.target.value)
              );

              if (vehicle) {
                chooseVehicle(vehicle);
              } else {
                setSelectedVehicle(null);
                setVehicleSearch("");
              }
            }}
            className="border rounded p-3 w-full mt-2"
          >
            <option value="">Select a car...</option>
            {availableVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                Car #{vehicle.car_number} — {vehicle.model || ""} —{" "}
                {vehicle.type || ""} — {vehicle.color || ""}
              </option>
            ))}
          </select>
        </details>

        {selectedVehicle && (
          <div className="bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-3 mb-4 flex items-start justify-between gap-3">
            <div>
              <div>
                Selected: Car #{selectedVehicle.car_number} —{" "}
                {selectedVehicle.model || ""} — {selectedVehicle.type || ""} —{" "}
                {selectedVehicle.color || ""}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {selectedVehicle.current_location || "Unknown location"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setVehicleSearch("");
                setSelectedVehicle(null);
              }}
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        <label className="block font-semibold mb-1">
          Person
          <RequiredAsterisk />
        </label>

        <div className="relative">
          <input
            value={personSearch}
            onFocus={() => {
              if (!selectedPerson && !showNewPersonForm) {
                setPersonComboOpen(true);
              }
            }}
            onChange={(e) => {
              setPersonSearch(e.target.value);
              setSelectedPerson(null);
              setShowNewPersonForm(false);
              setPersonComboOpen(true);
            }}
            placeholder="Type player or staff name..."
            autoComplete="off"
            className="border rounded p-3 w-full"
            required
          />

          {personComboOpen && !selectedPerson && !showNewPersonForm && (
            <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded border bg-white shadow-lg">
              {matchingPeople.length > 0 ? (
                matchingPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => choosePerson(person)}
                    className="block w-full border-b p-3 text-left hover:bg-gray-100"
                  >
                    <div className="font-semibold">
                      {person.first_name} {person.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {person.role || "Misc"}
                      {person.phone ? ` — ${person.phone}` : ""}
                      {person.email ? ` — ${person.email}` : ""}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500">
                  No matching people found.
                </div>
              )}

              <button
                type="button"
                onClick={openNewPersonForm}
                className="block w-full bg-[#FFDE00]/25 p-3 text-left font-bold text-[#1F4E1A] hover:bg-[#FFDE00]/40"
              >
                + Add New Person
                {personSearch.trim() ? `: ${personSearch.trim()}` : ""}
              </button>
            </div>
          )}
        </div>

        {!selectedPerson && !showNewPersonForm && (
          <button
            type="button"
            onClick={openNewPersonForm}
            className="mt-2 text-sm font-semibold text-[#1F4E1A] underline"
          >
            Person not listed? Add them here
          </button>
        )}

        {showNewPersonForm && (
          <div className="my-4 rounded-lg border-2 border-[#FFDE00] bg-[#FFDE00]/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#1F4E1A]">
                Add New Person
              </h2>

              <button
                type="button"
                onClick={cancelNewPerson}
                disabled={savingNewPerson}
                className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  First Name
                  <RequiredAsterisk />
                </label>
                <input
                  value={newPersonFirstName}
                  onChange={(e) => setNewPersonFirstName(e.target.value)}
                  className="w-full rounded border bg-white p-3"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Last Name
                  <RequiredAsterisk />
                </label>
                <input
                  value={newPersonLastName}
                  onChange={(e) => setNewPersonLastName(e.target.value)}
                  className="w-full rounded border bg-white p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Type of Person
                </label>
                <select
                  value={newPersonRole}
                  onChange={(e) => setNewPersonRole(e.target.value)}
                  className="w-full rounded border bg-white p-3"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Phone
                </label>
                <input
                  value={newPersonPhone}
                  onChange={(e) => setNewPersonPhone(e.target.value)}
                  type="tel"
                  className="w-full rounded border bg-white p-3"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Email
                </label>
                <input
                  value={newPersonEmail}
                  onChange={(e) => setNewPersonEmail(e.target.value)}
                  type="email"
                  className="w-full rounded border bg-white p-3"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Notes
                </label>
                <textarea
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded border bg-white p-3"
                  placeholder="Optional person notes"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={saveNewPerson}
              disabled={savingNewPerson}
              className="mt-4 w-full rounded bg-[#367C2B] px-4 py-3 font-semibold text-white hover:bg-[#2e6e24] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingNewPerson ? "Saving Person..." : "Save and Select Person"}
            </button>
          </div>
        )}

        {selectedPerson && (
          <div className="my-4 flex items-start justify-between gap-3 rounded border border-[#FFDE00] bg-[#FFDE00]/20 p-3">
            <div>
              <div className="font-semibold">
                Selected: {selectedPerson.first_name}{" "}
                {selectedPerson.last_name}
              </div>
              <div className="text-sm text-gray-600">
                {selectedPerson.role || "Misc"}
                {selectedPerson.phone ? ` — ${selectedPerson.phone}` : ""}
                {selectedPerson.email ? ` — ${selectedPerson.email}` : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPerson(null);
                setPersonSearch("");
                setPersonComboOpen(true);
              }}
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Change
            </button>
          </div>
        )}

        <label className="block font-semibold mb-1">On Behalf Of</label>
        <input
          value={onBehalfOf}
          onChange={(e) => setOnBehalfOf(e.target.value)}
          placeholder="Optional"
          className="border rounded p-3 w-full mb-4"
        />

        <label className="block font-semibold mb-1">
          Checked Out By
          <RequiredAsterisk />
        </label>
        <input
          value={checkedOutBy}
          onChange={(e) => setCheckedOutBy(e.target.value)}
          placeholder="Initials"
          className="border rounded p-3 w-full mb-4"
          required
        />

        <label className="block font-semibold mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional checkout notes"
          className="border rounded p-3 w-full mb-4"
        />

        <button
          onClick={submitCheckout}
          className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-3 rounded w-full font-semibold"
        >
          Check Out Car
        </button>
      </div>
    </main>
  );
}
