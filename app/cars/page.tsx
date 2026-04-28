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

const LOCATION_OPTIONS = ["Airport", "Trailer", "Return Lot"];
const STATUS_OPTIONS = ["Available", "Checked Out", "Hold"];

export default function CarsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("car_number");

    if (error) {
      alert(error.message);
      return;
    }

    setVehicles(data || []);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const text =
      `${v.car_number} ${v.make} ${v.model} ${v.type} ${v.color} ${v.vin} ${v.dealership} ${v.current_location} ${v.status}`.toLowerCase();

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

    loadVehicles();
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
    loadVehicles();
  }

  function getStatusBadge(status: string | null) {
    if (status === "Checked Out") return "bg-[#FFDE00] text-black";
    if (status === "Available") return "bg-[#367C2B] text-white";
    return "bg-gray-300 text-black";
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">Cars</h1>

        <button
          onClick={loadVehicles}
          className="bg-[#1F4E1A] text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 border-t-4 border-[#367C2B]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search car #, model, color, VIN, location..."
          className="border rounded p-3 w-full mb-3"
        />

        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={bulkLocation}
            onChange={(e) => setBulkLocation(e.target.value)}
            className="border rounded p-3"
          >
            <option value="">Bulk location...</option>
            {LOCATION_OPTIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="border rounded p-3"
          >
            <option value="">Bulk status...</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            onClick={applyBulkUpdate}
            className="bg-[#367C2B] hover:bg-[#2e6e24] text-white rounded px-4 py-3 font-semibold"
          >
            Update Selected
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="bg-[#FFDE00] text-black rounded px-4 py-3 font-semibold"
          >
            Clear Selection
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-3">
          Selected: {selectedIds.length}
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
          {filteredVehicles.map((v) => (
            <div
              key={v.id}
              className="p-4 border-b grid gap-3 md:grid-cols-[40px_1fr_160px_160px] md:items-center"
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
                </label>
                <select
                  value={v.current_location || ""}
                  onChange={(e) =>
                    updateVehicle(v.id, { current_location: e.target.value })
                  }
                  className="border rounded p-2 w-full"
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
                </label>
                <select
                  value={v.status || ""}
                  onChange={(e) =>
                    updateVehicle(v.id, { status: e.target.value })
                  }
                  className="border rounded p-2 w-full"
                >
                  <option value="">Unknown</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {filteredVehicles.length === 0 && (
            <div className="p-4 text-gray-500">No cars found.</div>
          )}
        </div>
      </div>
    </main>
  );
}