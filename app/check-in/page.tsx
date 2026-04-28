"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Vehicle = {
  id: number;
  car_number: number;
  model: string | null;
  type: string | null;
  color: string | null;
  current_location: string | null;
  status: string | null;
};

type Checkout = {
  id: number;
  vehicle_id: number | null;
  car_number: number | null;
  person_first_name: string | null;
  person_last_name: string | null;
};

const RETURN_LOCATIONS = ["Airport", "Trailer", "Return Lot"];

export default function CheckInPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [carSearch, setCarSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [returnLocation, setReturnLocation] = useState("");
  const [checkedInBy, setCheckedInBy] = useState("");
  const [notes, setNotes] = useState("");

  async function loadData() {
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "Checked Out")
      .order("car_number");

    const { data: checkoutData } = await supabase
      .from("checkouts")
      .select("*")
      .is("time_in", null);

    setVehicles(vehicleData || []);
    setCheckouts(checkoutData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const matchingVehicles = vehicles
    .filter((v) => String(v.car_number).includes(carSearch.trim()))
    .slice(0, 10);

  const selectedCheckout =
    checkouts.find((c) => c.vehicle_id === selectedVehicle?.id) ||
    checkouts.find((c) => c.car_number === selectedVehicle?.car_number) ||
    null;

  function selectVehicle(v: Vehicle) {
    setSelectedVehicle(v);
    setCarSearch(String(v.car_number));
  }

  async function submitCheckIn() {
    if (!selectedVehicle) return alert("Please select a car.");
    if (!returnLocation) return alert("Select return location.");
    if (!checkedInBy.trim()) return alert("Enter initials.");

    const now = new Date().toISOString();

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({
        status: "Available",
        current_location: returnLocation,
        notes,
      })
      .eq("id", selectedVehicle.id);

    if (vehicleError) return alert(vehicleError.message);

    if (selectedCheckout) {
      const { error: checkoutError } = await supabase
        .from("checkouts")
        .update({
          checked_in_by: checkedInBy,
          time_in: now,
          return_location: returnLocation,
          return_notes: notes,
          status: "Checked In",
        })
        .eq("id", selectedCheckout.id);

      if (checkoutError) return alert(checkoutError.message);
    }

    alert(`Car #${selectedVehicle.car_number} checked in.`);

    setCarSearch("");
    setSelectedVehicle(null);
    setReturnLocation("");
    setCheckedInBy("");
    setNotes("");

    loadData();
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <h1 className="text-3xl font-bold mb-4">Check In</h1>

      <div className="bg-white rounded-lg shadow p-4 max-w-xl">
        <label className="block font-semibold mb-1">Search Car #</label>

        <input
          value={carSearch}
          onChange={(e) => {
            setCarSearch(e.target.value);
            setSelectedVehicle(null);
          }}
          placeholder="Type car number..."
          className="border rounded p-3 w-full"
        />

        {!selectedVehicle && carSearch && (
          <div className="border rounded mt-2 mb-4 bg-white overflow-hidden">
            {matchingVehicles.length === 0 ? (
              <div className="p-3 text-gray-500">No matches</div>
            ) : (
              matchingVehicles.map((v) => {
                const checkout =
                  checkouts.find((c) => c.vehicle_id === v.id) ||
                  checkouts.find((c) => c.car_number === v.car_number);

                return (
                  <button
                    key={v.id}
                    onClick={() => selectVehicle(v)}
                    className="block w-full text-left p-3 border-b hover:bg-gray-100"
                  >
                    <div className="font-semibold text-[#1F4E1A]">
                      Car #{v.car_number}
                    </div>

                    <div className="text-sm text-gray-600">
                      {v.model} — {v.type} — {v.color}
                    </div>

                    <div className="text-sm text-gray-600">
                      {checkout?.person_first_name}{" "}
                      {checkout?.person_last_name}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {selectedVehicle && (
          <div className="bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-3 mb-4">
            <p className="font-semibold">
              Selected: Car #{selectedVehicle.car_number}
            </p>

            {selectedCheckout && (
              <p className="text-sm text-gray-700">
                Checked out to: {selectedCheckout.person_first_name}{" "}
                {selectedCheckout.person_last_name}
              </p>
            )}
          </div>
        )}

        <label className="block font-semibold mb-1">Return Location</label>
        <select
          value={returnLocation}
          onChange={(e) => setReturnLocation(e.target.value)}
          className="border rounded p-3 w-full mb-4"
        >
          <option value="">Select...</option>
          {RETURN_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <label className="block font-semibold mb-1">Checked In By</label>
        <input
          value={checkedInBy}
          onChange={(e) => setCheckedInBy(e.target.value)}
          placeholder="Initials"
          className="border rounded p-3 w-full mb-4"
        />

        <label className="block font-semibold mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional check-in notes"
          className="border rounded p-3 w-full mb-4"
        />

        <button
          onClick={submitCheckIn}
          className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-3 rounded w-full font-semibold"
        >
          Check In Vehicle
        </button>
      </div>
    </main>
  );
}