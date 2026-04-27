"use client";

import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

type Car = {
  id: number;
  car_number: number;
  current_location: string | null;
  status: string | null;
  car_model: string | null;
  type: string | null;
  color: string | null;
  vin: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  on_behalf_of: string | null;
  checked_out_by: string | null;
  time_out: string | null;
};

export default function Home() {
  const [pin, setPin] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [search, setSearch] = useState("");
  const [quickLocation, setQuickLocation] = useState("");

  async function loadCars() {
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .order("car_number");

    if (error) {
      alert(error.message);
      return;
    }

    setCars(data || []);
  }

  async function checkOutCar(car: Car) {
    const firstName = prompt("First name?");
    if (!firstName) return;

    const lastName = prompt("Last name?") || "";
    const phone = prompt("Phone?") || "";
    const email = prompt("Email?") || "";
    const onBehalfOf = prompt("On behalf of? Leave blank if not needed.") || "";
    const checkedOutBy = prompt("Checked out by initials?") || "";
    const location =
      prompt("Current location? Example: Clubhouse, Airport") ||
      car.current_location ||
      "Clubhouse";

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("cars")
      .update({
        status: "Checked Out",
        current_location: location,
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        on_behalf_of: onBehalfOf,
        checked_out_by: checkedOutBy,
        time_out: now,
      })
      .eq("id", car.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("checkout_history").insert({
      car_id: car.id,
      car_number: car.car_number,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      on_behalf_of: onBehalfOf,
      checked_out_by: checkedOutBy,
      time_out: now,
      start_location: location,
      notes: "",
    });

    loadCars();
  }

  async function checkInCar(car: Car) {
    const checkedInBy = prompt("Checked in by initials?") || "";
    const returnLocation =
      prompt("Return location? Example: Clubhouse, Airport") || "Clubhouse";
    const notes = prompt("Return notes? Leave blank if none.") || "";
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("cars")
      .update({
        status: "Available",
        current_location: returnLocation,
        first_name: null,
        last_name: null,
        phone: null,
        email: null,
        on_behalf_of: null,
        checked_out_by: null,
        time_in: now,
        notes,
      })
      .eq("id", car.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("checkout_history")
      .update({
        checked_in_by: checkedInBy,
        time_in: now,
        return_location: returnLocation,
        notes,
      })
      .eq("car_id", car.id)
      .is("time_in", null);

    loadCars();
  }

  useEffect(() => {
    if (authorized) loadCars();
  }, [authorized]);

  const locations = Array.from(
    new Set(
      cars
        .map((car) => car.current_location)
        .filter((location): location is string => Boolean(location))
    )
  ).sort();

  const availableCars = cars.filter((car) => car.status !== "Checked Out");

  const quickAvailableCars = availableCars.filter((car) => {
    if (!quickLocation) return true;
    return car.current_location === quickLocation;
  });

  const filteredCars = cars.filter((car) => {
    const text =
      `${car.car_number} ${car.color} ${car.car_model} ${car.type} ${car.current_location} ${car.status} ${car.first_name} ${car.last_name} ${car.on_behalf_of} ${car.vin}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  if (!authorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-4">JDC Transportation</h1>

        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="border rounded p-3 mb-3 w-full max-w-xs"
        />

        <button
          onClick={() => {
            if (pin === process.env.NEXT_PUBLIC_APP_PIN) setAuthorized(true);
            else alert("Incorrect PIN");
          }}
          className="bg-blue-600 text-white rounded px-6 py-3"
        >
          Enter
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">JDC Transportation</h1>

      <button
        onClick={loadCars}
        className="mb-4 bg-black text-white px-4 py-2 rounded w-full"
      >
        Refresh
      </button>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-bold mb-3">Quick Check Out</h2>

        <select
          value={quickLocation}
          onChange={(e) => setQuickLocation(e.target.value)}
          className="border rounded p-3 w-full mb-3"
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <select
          className="border rounded p-3 w-full"
          defaultValue=""
          onChange={(e) => {
            const selectedCar = cars.find(
              (car) => car.id === Number(e.target.value)
            );

            if (selectedCar) checkOutCar(selectedCar);

            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Select an available car...
          </option>

          {quickAvailableCars.map((car) => (
            <option key={car.id} value={car.id}>
              Car #{car.car_number} — {car.current_location || "Unknown"} —{" "}
              {car.color || ""} {car.car_model || ""} {car.type || ""}
            </option>
          ))}
        </select>
      </div>

      <input
        placeholder="Search car #, name, location, VIN..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded p-3 mb-3 w-full"
      />

      <div className="grid gap-3">
        {filteredCars.map((car) => (
          <div key={car.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Car #{car.car_number}</h2>
                <p>
                  {car.color || ""} {car.car_model || ""} {car.type || ""}
                </p>
                <p className="text-sm text-gray-600">
                  Location: {car.current_location || "Unknown"}
                </p>
              </div>

              <span
                className={`h-fit rounded px-3 py-1 text-sm font-semibold ${
                  car.status === "Checked Out"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {car.status || "Available"}
              </span>
            </div>

            {car.status === "Checked Out" && (
              <div className="mt-3 text-sm">
                <p>
                  Checked out to: {car.first_name} {car.last_name}
                </p>
                {car.phone && <p>Phone: {car.phone}</p>}
                {car.email && <p>Email: {car.email}</p>}
                {car.on_behalf_of && <p>On behalf of: {car.on_behalf_of}</p>}
                <p>Checked out by: {car.checked_out_by}</p>
              </div>
            )}

            <div className="mt-3">
              {car.status !== "Checked Out" ? (
                <button
                  onClick={() => checkOutCar(car)}
                  className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                >
                  Check Out
                </button>
              ) : (
                <button
                  onClick={() => checkInCar(car)}
                  className="bg-green-600 text-white px-4 py-2 rounded w-full"
                >
                  Check In
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}