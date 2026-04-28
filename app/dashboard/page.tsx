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
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .order("car_number");

    const { data: checkoutData } = await supabase
      .from("checkouts")
      .select("*")
      .is("time_in", null)
      .order("time_out", { ascending: false })
      .limit(10);

    setVehicles(vehicleData || []);
    setCheckouts(checkoutData || []);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const total = vehicles.length;
  const available = vehicles.filter((v) => v.status === "Available").length;
  const checkedOut = vehicles.filter((v) => v.status === "Checked Out").length;
  const hold = vehicles.filter((v) => v.status === "Hold").length;

  const locations = Array.from(
    new Set(vehicles.map((v) => v.current_location || "Unknown"))
  ).sort();

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <button
          onClick={loadDashboard}
          className="bg-[#1F4E1A] text-white px-4 py-2 rounded"
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
          <p className="text-3xl font-bold text-[#367C2B]">{available}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Checked Out</p>
          <p className="text-3xl font-bold text-[#FFDE00]">{checkedOut}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Hold</p>
          <p className="text-3xl font-bold text-gray-600">{hold}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-bold mb-3">Cars by Location</h2>

        {locations.map((location) => {
          const count = vehicles.filter(
            (v) => (v.current_location || "Unknown") === location
          ).length;

          return (
            <div
              key={location}
              className="flex justify-between border-b py-2 text-sm"
            >
              <span>{location}</span>
              <span className="font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-3">Currently Checked Out</h2>

        {checkouts.length === 0 ? (
          <p className="text-gray-500">No cars currently checked out.</p>
        ) : (
          <div className="grid gap-3">
            {checkouts.map((c) => (
              <div key={c.id} className="border rounded p-3">
                <div className="flex justify-between">
                  <p className="font-bold">Car #{c.car_number}</p>

                  <span className="bg-[#FFDE00] text-black px-3 py-1 rounded text-sm font-semibold">
                    Checked Out
                  </span>
                </div>

                <p className="text-sm mt-1">
                  {c.person_first_name} {c.person_last_name}
                </p>

                {c.on_behalf_of && (
                  <p className="text-sm text-gray-600">
                    On behalf of: {c.on_behalf_of}
                  </p>
                )}

                <p className="text-sm text-gray-600">
                  Location: {c.start_location || "Unknown"}
                </p>

                <p className="text-sm text-gray-600">By: {c.checked_out_by}</p>

                {c.time_out && (
                  <p className="text-xs text-gray-500">
                    {new Date(c.time_out).toLocaleString()}
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