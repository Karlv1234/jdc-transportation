"use client";

import { useState } from "react";
import { supabase } from "../../../src/lib/supabase";

const LOCATION_OPTIONS = [
  "Airport",
  "Trailer",
  "Return Lot",
  "On Course",
  "Smart Lexus",
  "Checked Out",
];

type Vehicle = {
  id: number;
  car_number: number;
};

export default function MoveCarsPage() {
  const [carNumbersText, setCarNumbersText] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [message, setMessage] = useState("");
  const [missingCars, setMissingCars] = useState<number[]>([]);

  function parseCarNumbers(text: string) {
    return Array.from(
      new Set(
        text
          .split(/[,;\n\r\t ]+/)
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    );
  }

  async function moveCars() {
    setMessage("");
    setMissingCars([]);

    const carNumbers = parseCarNumbers(carNumbersText);

    if (carNumbers.length === 0) {
      alert("Enter at least one car number.");
      return;
    }

    if (!newLocation) {
      alert("Select a new location.");
      return;
    }

    const { data: foundCars, error: findError } = await supabase
      .from("vehicles")
      .select("id, car_number")
      .in("car_number", carNumbers);

    if (findError) {
      alert(findError.message);
      return;
    }

    const found = (foundCars || []) as Vehicle[];
    const foundNumbers = found.map((car) => car.car_number);

    const missing = carNumbers.filter(
      (number) => !foundNumbers.includes(number)
    );

    if (found.length === 0) {
      setMissingCars(missing);
      setMessage("No matching cars found.");
      return;
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({
        current_location: newLocation,
      })
      .in("car_number", foundNumbers);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    setMissingCars(missing);
    setMessage(
      `Moved ${found.length} car(s) to ${newLocation}. ${
        missing.length > 0 ? `${missing.length} car number(s) not found.` : ""
      }`
    );
  }

  function clearForm() {
    setCarNumbersText("");
    setNewLocation("");
    setMessage("");
    setMissingCars([]);
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <h1 className="text-3xl font-bold mb-4">Mass Move Cars</h1>

      <div className="bg-white rounded-lg shadow p-4 max-w-2xl border-t-4 border-[#367C2B]">
        <p className="text-sm text-gray-600 mb-4">
          Enter car numbers separated by commas, semicolons, spaces, or new
          lines. This updates the vehicle location only.
        </p>

        <label className="block font-semibold mb-1">Car Numbers</label>
        <textarea
          value={carNumbersText}
          onChange={(e) => setCarNumbersText(e.target.value)}
          placeholder="Example: 1, 2, 3; 14; 22"
          className="border rounded p-3 w-full mb-4 min-h-32"
        />

        <label className="block font-semibold mb-1">Move To Location</label>
        <select
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          className="border rounded p-3 w-full mb-4"
        >
          <option value="">Select location...</option>
          {LOCATION_OPTIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={moveCars}
            className="bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-3 rounded font-semibold"
          >
            Move Cars
          </button>

          <button
            onClick={clearForm}
            className="bg-[#FFDE00] text-black px-4 py-3 rounded font-semibold"
          >
            Clear
          </button>
        </div>

        {message && (
          <div className="mt-4 bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-4 text-[#1F4E1A] font-semibold">
            {message}
          </div>
        )}

        {missingCars.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded p-4">
            <p className="font-semibold text-red-700 mb-2">
              These car numbers were not found:
            </p>
            <p className="text-sm text-red-700">{missingCars.join(", ")}</p>
          </div>
        )}
      </div>
    </main>
  );
}