"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

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
  organization: string | null;
};

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

  async function loadData() {
    const { data: vehicleData, error: vehicleError } = await supabase
      .from("vehicles")
      .select("*")
      .order("car_number");

    if (vehicleError) {
      alert(vehicleError.message);
      return;
    }

    const { data: peopleData, error: peopleError } = await supabase
      .from("people")
      .select("*")
      .order("last_name");

    if (peopleError) {
      alert(peopleError.message);
      return;
    }

    setVehicles(vehicleData || []);
    setPeople(peopleData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const locations = Array.from(
    new Set(
      vehicles
        .map((v) => v.current_location)
        .filter((l): l is string => Boolean(l))
    )
  ).sort();

  const availableVehicles = vehicles.filter(
    (v) =>
      v.status !== "Checked Out" &&
      (!location || v.current_location === location)
  );

  const matchingVehicles = availableVehicles
    .filter((v) => {
      const text =
        `${v.car_number} ${v.color} ${v.make} ${v.model} ${v.type} ${v.current_location}`.toLowerCase();
      return text.includes(vehicleSearch.toLowerCase());
    })
    .slice(0, 8);

  const matchingPeople = people
    .filter((p) => {
      const text =
        `${p.first_name} ${p.last_name} ${p.phone} ${p.email} ${p.role} ${p.organization}`.toLowerCase();
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
    const role = prompt("Role? Example: Golfer, Caddie, Staff") || "";
    const organization = prompt("Organization?") || "";

    const { data, error } = await supabase
      .from("people")
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        role,
        organization,
      })
      .select()
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
    if (!selectedVehicle) {
      alert("Please select a car.");
      return;
    }

    if (!selectedPerson) {
      alert("Please select a person.");
      return;
    }

    if (!checkedOutBy.trim()) {
      alert("Please enter who checked this out.");
      return;
    }

    const now = new Date().toISOString();

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
      start_location: selectedVehicle.current_location,
      checkout_notes: notes,
      status: "Checked Out",
    });

    if (checkoutError) {
      alert(checkoutError.message);
      return;
    }

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({
        status: "Checked Out",
      })
      .eq("id", selectedVehicle.id);

    if (vehicleError) {
      alert(vehicleError.message);
      return;
    }

    alert(`Car #${selectedVehicle.car_number} checked out.`);

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
    <main className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">Check Out</h1>

      <div className="bg-white rounded-lg shadow p-4 max-w-xl">
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

        <label className="block font-semibold mb-1">Available Car</label>
        <input
          value={vehicleSearch}
          onChange={(e) => {
            setVehicleSearch(e.target.value);
            setSelectedVehicle(null);
          }}
          placeholder="Type car #, model, color..."
          className="border rounded p-3 w-full"
        />

        {!selectedVehicle && vehicleSearch && (
          <div className="border rounded mt-2 mb-4 bg-white overflow-hidden">
            {matchingVehicles.length === 0 ? (
              <div className="p-3 text-gray-500">No available cars found.</div>
            ) : (
              matchingVehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVehicle(v);
                    setVehicleSearch(
                      `Car #${v.car_number} — ${v.color || ""} ${
                        v.make || ""
                      } ${v.model || ""} — ${v.type || ""}`
                    );
                  }}
                  className="block w-full text-left p-3 border-b hover:bg-gray-100"
                >
                  <div className="font-semibold">Car #{v.car_number}</div>
                  <div className="text-sm text-gray-600">
                    {v.color || ""} {v.make || ""} {v.model || ""} —{" "}
                    {v.type || ""} — {v.current_location || "Unknown"}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {selectedVehicle && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 my-4">
            Selected: Car #{selectedVehicle.car_number} —{" "}
            {selectedVehicle.color || ""} {selectedVehicle.make || ""}{" "}
            {selectedVehicle.model || ""}
          </div>
        )}

        <label className="block font-semibold mb-1">Person</label>
        <input
          value={personSearch}
          onChange={(e) => {
            setPersonSearch(e.target.value);
            setSelectedPerson(null);
          }}
          placeholder="Type golfer/staff name..."
          className="border rounded p-3 w-full"
        />

        {!selectedPerson && personSearch && (
          <div className="border rounded mt-2 mb-4 bg-white overflow-hidden">
            {matchingPeople.length === 0 ? (
              <div className="p-3">
                <p className="text-gray-500 mb-2">No people found.</p>

                <button
                  onClick={addNewPerson}
                  className="bg-green-600 text-white px-4 py-2 rounded w-full"
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
                      {p.role || "Person"}
                      {p.organization ? ` — ${p.organization}` : ""}
                      {p.phone ? ` — ${p.phone}` : ""}
                    </div>
                  </button>
                ))}

                <button
                  onClick={addNewPerson}
                  className="block w-full text-left p-3 bg-green-50 text-green-700 font-semibold hover:bg-green-100"
                >
                  + Add New Person
                </button>
              </>
            )}
          </div>
        )}

        {selectedPerson && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 my-4">
            Selected: {selectedPerson.first_name} {selectedPerson.last_name}
            {selectedPerson.role ? ` — ${selectedPerson.role}` : ""}
          </div>
        )}

        <label className="block font-semibold mb-1">On Behalf Of</label>
        <input
          value={onBehalfOf}
          onChange={(e) => setOnBehalfOf(e.target.value)}
          placeholder="Optional"
          className="border rounded p-3 w-full mb-4"
        />

        <label className="block font-semibold mb-1">Checked Out By</label>
        <input
          value={checkedOutBy}
          onChange={(e) => setCheckedOutBy(e.target.value)}
          placeholder="Initials"
          className="border rounded p-3 w-full mb-4"
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
          className="bg-blue-600 text-white px-4 py-3 rounded w-full font-semibold"
        >
          Check Out Car
        </button>
      </div>
    </main>
  );
}
