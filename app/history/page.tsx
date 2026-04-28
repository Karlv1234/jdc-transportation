"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Checkout = {
  id: number;
  car_number: number | null;
  person_first_name: string | null;
  person_last_name: string | null;
  phone: string | null;
  email: string | null;
  on_behalf_of: string | null;
  checked_out_by: string | null;
  checked_in_by: string | null;
  time_out: string | null;
  time_in: string | null;
  start_location: string | null;
  return_location: string | null;
  checkout_notes: string | null;
  return_notes: string | null;
  status: string | null;
};

export default function HistoryPage() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function loadHistory() {
    const { data, error } = await supabase
      .from("checkouts")
      .select("*")
      .order("time_out", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setCheckouts(data || []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredCheckouts = checkouts.filter((c) => {
    const text =
      `${c.car_number} ${c.person_first_name} ${c.person_last_name} ${c.phone} ${c.email} ${c.on_behalf_of} ${c.checked_out_by} ${c.checked_in_by} ${c.start_location} ${c.return_location} ${c.checkout_notes} ${c.return_notes} ${c.status}`.toLowerCase();

    return text.includes(search.toLowerCase()) && (!statusFilter || c.status === statusFilter);
  });

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">History</h1>

        <button
          onClick={loadHistory}
          className="bg-[#1F4E1A] text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 border-t-4 border-[#367C2B] grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search car #, person, location, notes..."
          className="border rounded p-3 w-full"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded p-3 w-full"
        >
          <option value="">All statuses</option>
          <option value="Checked Out">Checked Out</option>
          <option value="Checked In">Checked In</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredCheckouts.map((c) => (
          <div key={c.id} className="p-4 border-b">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold text-lg text-[#1F4E1A]">
                  Car #{c.car_number}
                </p>

                <p className="text-sm text-gray-700">
                  {c.person_first_name} {c.person_last_name}
                </p>

                {c.on_behalf_of && (
                  <p className="text-sm text-gray-600">
                    On behalf of: {c.on_behalf_of}
                  </p>
                )}
              </div>

              <span
                className={`h-fit rounded px-3 py-1 text-sm font-semibold ${
                  c.status === "Checked Out"
                    ? "bg-[#FFDE00] text-black"
                    : "bg-[#367C2B] text-white"
                }`}
              >
                {c.status || "Unknown"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 mt-3 text-sm">
              <div className="bg-[#F5F5F5] rounded p-3">
                <p className="font-semibold text-[#1F4E1A]">Check Out</p>
                <p>Location: {c.start_location || "Unknown"}</p>
                <p>By: {c.checked_out_by || "Unknown"}</p>
                <p>
                  Time:{" "}
                  {c.time_out ? new Date(c.time_out).toLocaleString() : ""}
                </p>
                {c.checkout_notes && <p>Notes: {c.checkout_notes}</p>}
              </div>

              <div className="bg-[#F5F5F5] rounded p-3">
                <p className="font-semibold text-[#1F4E1A]">Check In</p>
                <p>Location: {c.return_location || ""}</p>
                <p>By: {c.checked_in_by || ""}</p>
                <p>
                  Time: {c.time_in ? new Date(c.time_in).toLocaleString() : ""}
                </p>
                {c.return_notes && <p>Notes: {c.return_notes}</p>}
              </div>
            </div>
          </div>
        ))}

        {filteredCheckouts.length === 0 && (
          <div className="p-4 text-gray-500">No history found.</div>
        )}
      </div>
    </main>
  );
}