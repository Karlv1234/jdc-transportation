"use client";

import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

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
  vehicle_id: number | null;
  car_number: number | null;
  person_first_name: string | null;
  person_last_name: string | null;
  on_behalf_of: string | null;
  checked_out_by: string | null;
  time_out: string | null;
  start_location: string | null;
  status: string | null;
};

type SelectedList = {
  title: string;
  vehicles: Vehicle[];
};

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [selectedList, setSelectedList] = useState<SelectedList | null>(null);

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
      .order("time_out", { ascending: false });

    if (checkoutError) {
      alert(checkoutError.message);
      return;
    }

    setVehicles(vehicleData || []);
    setCheckouts(checkoutData || []);
    setSelectedList(null);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const total = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === "Available");
  const checkedOutVehicles = vehicles.filter((v) => v.status === "Checked Out");
  const holdVehicles = vehicles.filter((v) => v.status === "Hold");

  const locations = Array.from(
    new Set(vehicles.map((v) => v.current_location || "Unknown"))
  ).sort();

  function getCheckoutForVehicle(vehicle: Vehicle) {
    return (
      checkouts.find((c) => c.vehicle_id === vehicle.id) ||
      checkouts.find((c) => c.car_number === vehicle.car_number) ||
      null
    );
  }

  function normalizedStatus(vehicle: Vehicle) {
    return (vehicle.status || "").trim().toLowerCase();
  }

  function vehicleIsCheckedOut(vehicle: Vehicle) {
    return (
      normalizedStatus(vehicle) === "checked out" ||
      Boolean(getCheckoutForVehicle(vehicle))
    );
  }

  function vehicleIsAvailable(vehicle: Vehicle) {
    return (
      normalizedStatus(vehicle) === "available" &&
      !vehicleIsCheckedOut(vehicle)
    );
  }

  function showList(title: string, list: Vehicle[]) {
    setSelectedList({
      title,
      vehicles: [...list].sort((a, b) => a.car_number - b.car_number),
    });
  }

  function getStatusBadge(status: string | null) {
    if (status === "Checked Out") return "bg-[#FFDE00] text-black";
    if (status === "Available") return "bg-[#367C2B] text-white";
    if (status === "Hold") return "bg-gray-300 text-black";
    return "bg-gray-200 text-black";
  }

  function openCheckIn(vehicle: Vehicle) {
    const params = new URLSearchParams({
      vehicleId: String(vehicle.id),
      carNumber: String(vehicle.car_number),
    });

    window.location.href = `/check-in?${params.toString()}`;
  }

  function openCheckOut(vehicle: Vehicle) {
    const params = new URLSearchParams({
      vehicleId: String(vehicle.id),
      carNumber: String(vehicle.car_number),
    });

    window.location.href = `/check-out?${params.toString()}`;
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Click any car total or location to open the car list and use its
            Check In or Check Out button.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/check-in";
            }}
            className="rounded bg-[#367C2B] px-4 py-2 font-semibold text-white hover:bg-[#2e6e24]"
          >
            Quick Check In
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/check-out";
            }}
            className="rounded bg-[#FFDE00] px-4 py-2 font-semibold text-black hover:bg-yellow-300"
          >
            Quick Check Out
          </button>

          <button
            type="button"
            onClick={loadDashboard}
            className="rounded bg-[#1F4E1A] px-4 py-2 text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button
          onClick={() => showList("All Cars", vehicles)}
          className="bg-white rounded-lg shadow p-4 text-left hover:ring-2 hover:ring-[#367C2B]"
        >
          <p className="text-sm text-gray-500">Total Cars</p>
          <p className="text-3xl font-bold">{total}</p>
        </button>

        <button
          onClick={() => showList("Available Cars", availableVehicles)}
          className="bg-white rounded-lg shadow p-4 text-left hover:ring-2 hover:ring-[#367C2B]"
        >
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-3xl font-bold text-[#367C2B]">
            {availableVehicles.length}
          </p>
        </button>

        <button
          onClick={() => showList("Checked Out Cars", checkedOutVehicles)}
          className="bg-white rounded-lg shadow p-4 text-left hover:ring-2 hover:ring-[#FFDE00]"
        >
          <p className="text-sm text-gray-500">Checked Out</p>
          <p className="text-3xl font-bold text-[#FFDE00]">
            {checkedOutVehicles.length}
          </p>
        </button>

        <button
          onClick={() => showList("Hold Cars", holdVehicles)}
          className="bg-white rounded-lg shadow p-4 text-left hover:ring-2 hover:ring-gray-400"
        >
          <p className="text-sm text-gray-500">Hold</p>
          <p className="text-3xl font-bold text-gray-600">
            {holdVehicles.length}
          </p>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-bold mb-3">Cars by Location</h2>

        {locations.map((location) => {
          const carsAtLocation = vehicles.filter(
            (v) => (v.current_location || "Unknown") === location
          );

          return (
            <button
              key={location}
              onClick={() => showList(`Cars at ${location}`, carsAtLocation)}
              className="flex justify-between border-b py-2 text-sm w-full text-left hover:bg-gray-50 px-2 rounded"
            >
              <span>{location}</span>
              <span className="font-bold">{carsAtLocation.length}</span>
            </button>
          );
        })}
      </div>

      {selectedList && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 border-t-4 border-[#367C2B]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-xl font-bold text-[#1F4E1A]">
                {selectedList.title}
              </h2>
              <p className="text-sm text-gray-600">
                Showing {selectedList.vehicles.length} car(s)
              </p>
            </div>

            <button
              onClick={() => setSelectedList(null)}
              className="bg-gray-200 hover:bg-gray-300 rounded px-3 py-2 text-sm"
            >
              Hide
            </button>
          </div>

          {selectedList.vehicles.length === 0 ? (
            <p className="text-gray-500">No cars found for this selection.</p>
          ) : (
            <div className="grid gap-2">
              {selectedList.vehicles.map((vehicle) => {
                const checkout = getCheckoutForVehicle(vehicle);

                return (
                  <div
                    key={vehicle.id}
                    className="border rounded p-3 bg-[#F5F5F5]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#1F4E1A]">
                          Car #{vehicle.car_number}
                        </p>

                        <p className="text-sm text-gray-700">
                          {vehicle.color || ""} {vehicle.make || ""}{" "}
                          {vehicle.model || ""} {vehicle.type || ""}
                        </p>

                        <p className="text-sm text-gray-600">
                          Location: {vehicle.current_location || "Unknown"}
                        </p>

                        {checkout && (
                          <p className="text-sm font-semibold text-red-700">
                            Checked out to: {checkout.person_first_name}{" "}
                            {checkout.person_last_name}
                            {checkout.on_behalf_of
                              ? ` | On behalf of: ${checkout.on_behalf_of}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span
                          className={`rounded px-3 py-1 text-sm font-semibold ${getStatusBadge(
                            vehicle.status
                          )}`}
                        >
                          {vehicle.status || "Unknown"}
                        </span>

                        {vehicleIsCheckedOut(vehicle) ? (
                          <button
                            type="button"
                            onClick={() => openCheckIn(vehicle)}
                            className="rounded bg-[#367C2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2e6e24]"
                          >
                            Check In
                          </button>
                        ) : vehicleIsAvailable(vehicle) ? (
                          <button
                            type="button"
                            onClick={() => openCheckOut(vehicle)}
                            className="rounded bg-[#FFDE00] px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
                          >
                            Check Out
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            No action for {vehicle.status || "Unknown"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-3">Currently Checked Out</h2>

        {checkouts.length === 0 ? (
          <p className="text-gray-500">No cars currently checked out.</p>
        ) : (
          <div className="grid gap-3">
            {checkouts.slice(0, 10).map((c) => (
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

                <button
                  type="button"
                  onClick={() => {
                    const vehicle =
                      vehicles.find((item) => item.id === c.vehicle_id) ||
                      vehicles.find(
                        (item) => item.car_number === c.car_number
                      );

                    if (vehicle) {
                      openCheckIn(vehicle);
                    } else if (c.car_number !== null) {
                      window.location.href = `/check-in?carNumber=${encodeURIComponent(
                        String(c.car_number)
                      )}`;
                    }
                  }}
                  className="mt-3 w-full rounded bg-[#367C2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2e6e24]"
                >
                  Check In Car
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
