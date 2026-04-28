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

export default function CheckOutPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [location, setLocation] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [onBehalfOf, setOnBehalfOf] = useState("");
  const [checkedOutBy, setCheckedOutBy] = useState("");
  const [notes, setNotes] = useState("");

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

    if (checkoutError) return alert(checkoutError.message);

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({ status: "Checked Out" })
      .eq("id", selectedVehicle.id);

    if (vehicleError) return alert(vehicleError.message);

    alert(`Car #${selectedVehicle.car_number} checked out.`);

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
        <label className="block font-semibold mb-1">Location</label>
        <select
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
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
        <select
          value={selectedVehicle?.id || ""}
          onChange={(e) => {
            const vehicle = availableVehicles.find(
              (v) => v.id === Number(e.target.value)
            );
            setSelectedVehicle(vehicle || null);
          }}
          className="border rounded p-3 w-full mb-4"
        >
          <option value="">Select a car...</option>
          {availableVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              Car #{v.car_number} — {v.model || ""} — {v.type || ""} —{" "}
              {v.color || ""}
            </option>
          ))}
        </select>

        {selectedVehicle && (
          <div className="bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-3 mb-4">
            Selected: Car #{selectedVehicle.car_number} —{" "}
            {selectedVehicle.model || ""} — {selectedVehicle.type || ""} —{" "}
            {selectedVehicle.color || ""}
          </div>
        )}

        <label className="block font-semibold mb-1">Person</label>
        <input
          value={personSearch}
          onChange={(e) => {
            setPersonSearch(e.target.value);
            setSelectedPerson(null);
          }}
          placeholder="Type player/staff name..."
          className="border rounded p-3 w-full"
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
          className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-3 rounded w-full font-semibold"
        >
          Check Out Car
        </button>
      </div>
    </main>
  );
}