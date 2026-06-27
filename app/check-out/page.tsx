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
      .select("id, first_name, last_name, phone, email, role")
      .order("last_name");

    setVehicles(vehicleData || []);
    setPeople(peopleData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (prefillLoaded || people.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const personIdParam = Number(params.get("personId"));
    const arrivalIdParam = Number(params.get("arrivalId"));

    const hasPersonId = Number.isInteger(personIdParam) && personIdParam > 0;
    const hasArrivalId = Number.isInteger(arrivalIdParam) && arrivalIdParam > 0;

    if (!hasPersonId && !hasArrivalId) {
      setPrefillLoaded(true);
      return;
    }

    async function prefillCheckout() {
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
        setPersonSearch(`${personToSelect.first_name} ${personToSelect.last_name}`);
      }

      setPrefillLoaded(true);
    }

    prefillCheckout();
  }, [people, prefillLoaded]);

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

  const matchingPeople = people
    .filter((p) => {
      const text =
        `${p.first_name} ${p.last_name} ${p.phone} ${p.email} ${p.role}`.toLowerCase();
      return text.includes(personSearch.toLowerCase());
    })
    .slice(0, 8);

  async function addNewPerson() {
    const firstName = prompt("First name?");
    if (!firstName) return;

    const lastName = prompt("Last name?");
    if (!lastName) return;

    const phone = prompt("Phone?") || "";
    const email = prompt("Email?") || "";

    const roleInput =
      prompt(`Role? Choose one:\n${ROLE_OPTIONS.join("\n")}`) || "Misc";

    const role = ROLE_OPTIONS.includes(roleInput) ? roleInput : "Misc";

    const { data, error } = await supabase
      .from("people")
      .insert({ first_name: firstName, last_name: lastName, phone, email, role })
      .select("id, first_name, last_name, phone, email, role")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setPeople((current) => [...current, data]);
    setSelectedPerson(data);
    setPersonSearch(`${data.first_name} ${data.last_name}`);
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
        <input
          value={personSearch}
          onChange={(e) => {
            setPersonSearch(e.target.value);
            setSelectedPerson(null);
          }}
          placeholder="Type player/staff name..."
          className="border rounded p-3 w-full"
          required
        />

        {!selectedPerson && personSearch && (
          <div className="border rounded mt-2 mb-4 bg-white overflow-hidden">
            {matchingPeople.length === 0 ? (
              <div className="p-3">
                <p className="text-gray-500 mb-2">No people found.</p>
                <button
                  onClick={addNewPerson}
                  className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-2 rounded w-full"
                >
                  Add New Person
                </button>
              </div>
            ) : (
              <>
                {matchingPeople.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPerson(p);
                      setPersonSearch(`${p.first_name} ${p.last_name}`);
                    }}
                    className="block w-full text-left p-3 border-b hover:bg-gray-100"
                  >
                    <div className="font-semibold">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {p.role || "Misc"}
                      {p.phone ? ` — ${p.phone}` : ""}
                    </div>
                  </button>
                ))}

                <button
                  onClick={addNewPerson}
                  className="block w-full text-left p-3 bg-[#FFDE00]/20 text-[#1F4E1A] font-semibold hover:bg-[#FFDE00]/30"
                >
                  + Add New Person
                </button>
              </>
            )}
          </div>
        )}

        {selectedPerson && (
          <div className="bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-3 my-4">
            Selected: {selectedPerson.first_name} {selectedPerson.last_name} —{" "}
            {selectedPerson.role || "Misc"}
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
