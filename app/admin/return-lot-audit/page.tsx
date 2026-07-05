"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabase";

type Vehicle = {
  id: number;
  car_number: number;
  make: string | null;
  model: string | null;
  car_model?: string | null;
  color: string | null;
  dealership: string | null;
  return_lot_category: string | null;
  current_location: string | null;
  status: string | null;
};

type CategoryGroup = {
  category: string;
  vehicles: Vehicle[];
};

function displayModel(vehicle: Vehicle) {
  return vehicle.car_model || vehicle.model || "Unknown model";
}

function csvSafe(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function ReturnLotAuditPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadAudit() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("vehicles")
      .select(
        "id, car_number, make, model, car_model, color, dealership, return_lot_category, current_location, status"
      )
      .eq("current_location", "Return Lot")
      .order("car_number", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setVehicles((data || []) as Vehicle[]);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadAudit();
  }, []);

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const groups = new Map<string, Vehicle[]>();

    for (const vehicle of vehicles) {
      const category =
        vehicle.return_lot_category?.trim() || "Unassigned";

      const list = groups.get(category) || [];
      list.push(vehicle);
      groups.set(category, list);
    }

    return Array.from(groups.entries())
      .map(([category, groupedVehicles]) => ({
        category,
        vehicles: groupedVehicles.sort(
          (a, b) => a.car_number - b.car_number
        ),
      }))
      .sort((a, b) => {
        if (a.category === "Unassigned") return 1;
        if (b.category === "Unassigned") return -1;
        return a.category.localeCompare(b.category, undefined, {
          numeric: true,
        });
      });
  }, [vehicles]);

  const unassignedCount =
    categoryGroups.find((group) => group.category === "Unassigned")
      ?.vehicles.length || 0;

  function downloadCsv() {
    const headers = [
      "Return Lot Category",
      "Car Number",
      "Model",
      "Color",
      "Dealership",
      "Status",
      "Location",
    ];

    const rows = categoryGroups.flatMap((group) =>
      group.vehicles.map((vehicle) => [
        group.category,
        vehicle.car_number,
        displayModel(vehicle),
        vehicle.color || "",
        vehicle.dealership || "",
        vehicle.status || "",
        vehicle.current_location || "",
      ])
    );

    const csv = [
      headers.map(csvSafe).join(","),
      ...rows.map((row) => row.map(csvSafe).join(",")),
    ].join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `return-lot-audit-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-block rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              ← Admin
            </Link>

            <h1 className="text-3xl font-bold text-[#1F4E1A]">
              Return Lot Audit
            </h1>

            <p className="mt-1 text-gray-600">
              Vehicles currently located at the Return Lot, grouped by Return
              Lot Category.
            </p>

            {lastUpdated && (
              <p className="mt-2 text-xs text-gray-500">
                Last updated{" "}
                {lastUpdated.toLocaleString([], {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={vehicles.length === 0}
              className="rounded bg-[#FFDE00] px-4 py-3 font-bold text-[#1F4E1A] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download Audit CSV
            </button>

            <button
              type="button"
              onClick={loadAudit}
              disabled={loading}
              className="rounded bg-[#1F4E1A] px-4 py-3 font-semibold text-white hover:bg-[#173b14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh Audit"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded border border-red-300 bg-red-50 p-4 text-red-800">
            <div className="font-bold">Unable to load Return Lot Audit</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Cars at Return Lot
            </div>
            <div className="mt-1 text-4xl font-bold text-[#1F4E1A]">
              {vehicles.length}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Return Lot Categories
            </div>
            <div className="mt-1 text-4xl font-bold text-[#1F4E1A]">
              {categoryGroups.filter(
                (group) => group.category !== "Unassigned"
              ).length}
            </div>
          </div>

          <div
            className={`rounded-lg border p-5 shadow-sm ${
              unassignedCount > 0
                ? "border-red-300 bg-red-50"
                : "bg-white"
            }`}
          >
            <div className="text-sm font-semibold text-gray-500">
              Unassigned Category
            </div>
            <div
              className={`mt-1 text-4xl font-bold ${
                unassignedCount > 0
                  ? "text-red-700"
                  : "text-[#1F4E1A]"
              }`}
            >
              {unassignedCount}
            </div>
          </div>
        </section>

        {loading && vehicles.length === 0 ? (
          <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
            Loading Return Lot Audit...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-lg border bg-white p-10 text-center">
            <div className="text-xl font-bold text-[#1F4E1A]">
              No cars are currently at the Return Lot.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {categoryGroups.map((group) => (
              <section
                key={group.category}
                className={`overflow-hidden rounded-lg border bg-white shadow-sm ${
                  group.category === "Unassigned"
                    ? "border-red-400"
                    : ""
                }`}
              >
                <div
                  className={`flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    group.category === "Unassigned"
                      ? "bg-red-50"
                      : "bg-[#1F4E1A] text-white"
                  }`}
                >
                  <div>
                    <h2
                      className={`text-xl font-bold ${
                        group.category === "Unassigned"
                          ? "text-red-800"
                          : ""
                      }`}
                    >
                      {group.category}
                    </h2>
                  </div>

                  <div
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      group.category === "Unassigned"
                        ? "bg-red-700 text-white"
                        : "bg-white/15"
                    }`}
                  >
                    {group.vehicles.length}{" "}
                    {group.vehicles.length === 1 ? "car" : "cars"}
                  </div>
                </div>

                <div className="hidden grid-cols-[100px_1.5fr_1fr_1fr_120px] gap-3 bg-gray-100 px-4 py-3 text-sm font-bold md:grid">
                  <div>Car #</div>
                  <div>Model</div>
                  <div>Color</div>
                  <div>Dealership</div>
                  <div>Status</div>
                </div>

                <div>
                  {group.vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="grid gap-2 border-t px-4 py-3 first:border-t-0 md:grid-cols-[100px_1.5fr_1fr_1fr_120px] md:items-center md:gap-3"
                    >
                      <div>
                        <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                          Car:
                        </span>
                        <span className="text-lg font-bold text-[#1F4E1A]">
                          #{vehicle.car_number}
                        </span>
                      </div>

                      <div>
                        <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                          Model:
                        </span>
                        {displayModel(vehicle)}
                      </div>

                      <div>
                        <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                          Color:
                        </span>
                        {vehicle.color || "—"}
                      </div>

                      <div>
                        <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                          Dealership:
                        </span>
                        {vehicle.dealership || "Not assigned"}
                      </div>

                      <div>
                        <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                          Status:
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
                          {vehicle.status || "Unknown"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
