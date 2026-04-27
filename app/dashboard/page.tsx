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

type Checkout = {
  id: number;
  car_number: number | null;
  person_first_name: string | null;
  person_last_name: string | null;
  on_behalf_of: string | null;
  checked_out_by: string | null;
  time_out: string | null;
  start_location: string | null;
  status: string | null;
};

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);

  async function loadDashboard() {
    const { data: vehicleData, error: vehicleError } = await supabase
      .from("vehicles")
      .select("*")
      .order("car_number");

    if (vehicleError) {
      alert(vehicleError.message);
      return;
    }

    const { data: checkoutData, error: checkoutError } = await supabase
      .from("checkouts")
      .select("*")
      .is("time_in", null)
      .order("time_out", { ascending: false })
      .limit(10);

    if (checkoutError) {
      alert(checkoutError.message);
      return;
    }

    setVehicles(vehicleData || []);
    setCheckouts(checkoutData || []);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const total = vehicles.length;
  const available = vehicles.filter((v) => v.status === "Available").length;
  const checkedOut = vehicles.filter((v) => v.status === "Checked Out").length;
  const maintenance = vehicles.filter((v) => v.status === "Maintenance").length;

  const locations = Array.from(
    new Set(vehicles.map((v) => v.current_location || "Unknown"))
  ).sort();

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <button
          onClick={loadDashboard}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Cars</p>
          <p className="text-3xl font-bold">{total}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-3xl font-bold text-green-700">{available}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Checked Out</p>
          <p className="text-3xl font-bold text-red-700">{checkedOut}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Maintenance</p>
          <p className="text-3xl font-bold text-yellow-700">{maintenance}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-bold mb-3">Cars by Location</h2>

        <div className="grid gap-2">
          {locations.map((location) => {
            const locationCars = vehicles.filter(
              (v) => (v.current_location || "Unknown") === location
            );

            return (
              <div
                key={location}
                className="flex justify-between border-b pb-2 text-sm"
              >
                <span>{location}</span>
                <span className="font-bold">{locationCars.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-3">Currently Checked Out</h2>

        {checkouts.length === 0 ? (
          <p className="text-gray-500">No cars are currently checked out.</p>
        ) : (
          <div className="grid gap-3">
            {checkouts.map((checkout) => (
              <div key={checkout.id} className="border rounded p-3">
                <p className="font-bold">Car #{checkout.car_number}</p>

                <p className="text-sm">
                  {checkout.person_first_name} {checkout.person_last_name}
                </p>

                {checkout.on_behalf_of && (
                  <p className="text-sm text-gray-600">
                    On behalf of: {checkout.on_behalf_of}
                  </p>
                )}

                <p className="text-sm text-gray-600">
                  Location: {checkout.start_location || "Unknown"}
                </p>

                <p className="text-sm text-gray-600">
                  Checked out by: {checkout.checked_out_by || "Unknown"}
                </p>

                {checkout.time_out && (
                  <p className="text-xs text-gray-500">
                    Time out: {new Date(checkout.time_out).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}