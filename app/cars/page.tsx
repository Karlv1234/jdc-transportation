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
  vin: string | null;
  dealership: string | null;
  current_location: string | null;
  status: string | null;
  notes: string | null;
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
};

const LOCATION_OPTIONS = [
  "Airport",
  "Trailer",
  "Return Lot",
  "On Course",
  "Smart Lexus",
  "Checked Out",
  "Elliott",
];

const STATUS_OPTIONS = ["Available", "Checked Out", "Hold"];

function RequiredAsterisk() {
  return <span className="text-red-600 font-bold ml-1">*</span>;
}

export default function CarsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  async function loadData() {
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
      .select(
        "id, vehicle_id, car_number, person_first_name, person_last_name, on_behalf_of, checked_out_by, time_out"
      )
      .is("time_in", null);

    if (checkoutError) {
      alert(checkoutError.message);
      return;
    }

    setVehicles(vehicleData || []);
    setCheckouts(checkoutData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredVehicles = vehicles.filter((v) => {
    const checkout = getCheckoutForVehicle(v);

    const text =
      `${v.car_number} ${v.make} ${v.model} ${v.type} ${v.color} ${v.vin} ${v.dealership} ${v.current_location} ${v.status} ${checkout?.person_first_name} ${checkout?.person_last_name} ${checkout?.on_behalf_of}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  function toggleSelected(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredVehicles.map((v) => v.id);
    const allVisibleSelected = visibleIds.every((id) =>
      selectedIds.includes(id)
    );

    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedIds((current) =>
        Array.from(new Set([...current, ...visibleIds]))
      );
    }
  }

  async function updateVehicle(id: number, updates: Partial<Vehicle>) {
    const { error } = await supabase
      .from("vehicles")
      .update(updates)
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function applyBulkUpdate() {
    if (selectedIds.length === 0) {
      alert("Select at least one car.");
      return;
    }

    const updates: Partial<Vehicle> = {};

    if (bulkLocation) updates.current_location = bulkLocation;
    if (bulkStatus) updates.status = bulkStatus;

    if (Object.keys(updates).length === 0) {
      alert("Choose a location or status to update.");
      return;
    }

    const { error } = await supabase
      .from("vehicles")
      .update(updates)
      .in("id", selectedIds);

    if (error) {
      alert(error.message);
      return;
    }

    alert(`Updated ${selectedIds.length} car(s).`);

    setSelectedIds([]);
    setBulkLocation("");
    setBulkStatus("");
    loadData();
  }

  function getStatusBadge(status: string | null) {
    if (status === "Checked Out") return "bg-[#FFDE00] text-black";
    if (status === "Available") return "bg-[#367C2B] text-white";
    return "bg-gray-300 text-black";
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

  function csvSafe(value: string | number | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCarsCsv() {
    const headers = [
      "Car #",
      "Make",
      "Model",
      "Type",
      "Color",
      "Status",
      "Current Location",
      "Checked Out To",
      "On Behalf Of",
      "Checked Out By",
      "Time Out",
      "VIN",
      "Dealership",
      "Notes",
    ];

    const rows = filteredVehicles.map((vehicle) => {
      const checkout = getCheckoutForVehicle(vehicle);

      const checkedOutTo = checkout
        ? `${checkout.person_first_name || ""} ${
            checkout.person_last_name || ""
          }`.trim()
        : "";

      const timeOut = checkout?.time_out
        ? new Date(checkout.time_out).toLocaleString()
        : "";

      return [
        vehicle.car_number,
        vehicle.make,
        vehicle.model,
        vehicle.type,
        vehicle.color,
        vehicle.status,
        vehicle.current_location,
        checkedOutTo,
        checkout?.on_behalf_of || "",
        checkout?.checked_out_by || "",
        timeOut,
        vehicle.vin,
        vehicle.dealership,
        vehicle.notes,
      ]
        .map(csvSafe)
        .join(",");
    });

    const csv = [headers.map(csvSafe).join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "jdc-cars-current-status.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">Cars</h1>

        <button
          onClick={loadData}
          className="bg-[#1F4E1A] text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 border-t-4 border-[#367C2B]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search car #, model, color, person, VIN, location..."
          className="border rounded p-3 w-full mb-3"
        />

        <p className="text-xs text-gray-500 mb-2">
          <RequiredAsterisk /> indicates a required field.
        </p>

        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Bulk Location
            </label>
            <select
              value={bulkLocation}
              onChange={(e) => setBulkLocation(e.target.value)}
              className="border rounded p-3 w-full"
            >
              <option value="">Bulk location...</option>
              {LOCATION_OPTIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Bulk Status
            </label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="border rounded p-3 w-full"
            >
              <option value="">Bulk status...</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={applyBulkUpdate}
            className="bg-[#367C2B] hover:bg-[#2e6e24] text-white rounded px-4 py-3 font-semibold md:mt-5"
          >
            Update Selected
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="bg-[#FFDE00] text-black rounded px-4 py-3 font-semibold md:mt-5"
          >
            Clear Selection
          </button>

          <button
            onClick={downloadCarsCsv}
            className="bg-[#1F4E1A] text-white rounded px-4 py-3 font-semibold md:mt-5"
          >
            Download CSV
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-3">
          Selected: {selectedIds.length} | Showing: {filteredVehicles.length}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-3 border-b flex items-center gap-3 bg-[#367C2B] text-white">
          <input
            type="checkbox"
            checked={
              filteredVehicles.length > 0 &&
              filteredVehicles.every((v) => selectedIds.includes(v.id))
            }
            onChange={toggleSelectAllVisible}
          />
          <span className="font-semibold">Select all visible</span>
        </div>

        <div className="grid gap-0">
          {filteredVehicles.map((v) => {
            const checkout = getCheckoutForVehicle(v);

            return (
              <div
                key={v.id}
                className="p-4 border-b grid gap-3 md:grid-cols-[40px_1fr_160px_160px_120px] md:items-center"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(v.id)}
                  onChange={() => toggleSelected(v.id)}
                />

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-lg">
                      Car #{v.car_number} — {v.model || ""}
                    </p>

                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadge(
                        v.status
                      )}`}
                    >
                      {v.status || "Unknown"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    {v.color || ""} {v.make || ""} {v.type || ""}
                  </p>

                  {checkout && (
                    <p className="text-sm font-semibold text-red-700 mt-1">
                      Checked out to: {checkout.person_first_name}{" "}
                      {checkout.person_last_name}
                      {checkout.on_behalf_of
                        ? ` | On behalf of: ${checkout.on_behalf_of}`
                        : ""}
                    </p>
                  )}

                  {v.vin && (
                    <p className="text-xs text-gray-500">VIN: {v.vin}</p>
                  )}

                  {v.dealership && (
                    <p className="text-xs text-gray-500">
                      Dealership: {v.dealership}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Location
                    <RequiredAsterisk />
                  </label>
                  <select
                    value={v.current_location || ""}
                    onChange={(e) =>
                      updateVehicle(v.id, {
                        current_location: e.target.value,
                      })
                    }
                    className="border rounded p-2 w-full"
                    required
                  >
                    <option value="">Unknown</option>
                    {LOCATION_OPTIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Status
                    <RequiredAsterisk />
                  </label>
                  <select
                    value={v.status || ""}
                    onChange={(e) =>
                      updateVehicle(v.id, {
                        status: e.target.value,
                      })
                    }
                    className="border rounded p-2 w-full"
                    required
                  >
                    <option value="">Unknown</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:text-right">
                  {vehicleIsCheckedOut(v) ? (
                    <button
                      type="button"
                      onClick={() => openCheckIn(v)}
                      className="w-full rounded bg-[#367C2B] px-3 py-2 font-semibold text-white hover:bg-[#2e6e24]"
                    >
                      Check In
                    </button>
                  ) : vehicleIsAvailable(v) ? (
                    <button
                      type="button"
                      onClick={() => openCheckOut(v)}
                      className="w-full rounded bg-[#FFDE00] px-3 py-2 font-semibold text-black hover:bg-yellow-300"
                    >
                      Check Out
                    </button>
                  ) : (
                    <span className="text-sm text-gray-400">
                      No action
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredVehicles.length === 0 && (
            <div className="p-4 text-gray-500">No cars found.</div>
          )}
        </div>
      </div>
    </main>
  );
}
