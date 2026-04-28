"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Person = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  notes: string | null;
};

type Checkout = {
  id: number;
  person_id: number | null;
  car_number: number | null;
  time_out: string | null;
  status: string | null;
};

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [search, setSearch] = useState("");

  async function loadData() {
    const { data: peopleData, error: peopleError } = await supabase
      .from("people")
      .select("id, first_name, last_name, phone, email, role, notes")
      .order("last_name");

    if (peopleError) {
      alert(peopleError.message);
      return;
    }

    const { data: checkoutData, error: checkoutError } = await supabase
      .from("checkouts")
      .select("id, person_id, car_number, time_out, status")
      .is("time_in", null);

    if (checkoutError) {
      alert(checkoutError.message);
      return;
    }

    setPeople(peopleData || []);
    setCheckouts(checkoutData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPeople = people.filter((p) => {
    const text = `${p.first_name} ${p.last_name} ${p.phone} ${p.email} ${p.role} ${p.notes}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  async function updateNotes(personId: number, notes: string) {
    const { error } = await supabase
      .from("people")
      .update({ notes })
      .eq("id", personId);

    if (error) {
      alert(error.message);
      return;
    }

    setPeople((current) =>
      current.map((p) => (p.id === personId ? { ...p, notes } : p))
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">People</h1>

        <button
          onClick={loadData}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, role, phone, email..."
        className="border rounded p-3 w-full mb-4"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredPeople.map((person) => {
          const checkout = checkouts.find((c) => c.person_id === person.id);

          return (
            <div key={person.id} className="p-4 border-b grid gap-3">
              <div>
                <p className="font-bold text-lg">
                  {person.last_name}, {person.first_name}
                </p>

                <p className="text-sm text-gray-600">
                  {person.role || "Misc"}
                  {person.phone ? ` — ${person.phone}` : ""}
                  {person.email ? ` — ${person.email}` : ""}
                </p>

                {checkout ? (
                  <p className="text-sm font-semibold text-red-700 mt-1">
                    Checked out: Car #{checkout.car_number}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-green-700 mt-1">
                    No car checked out
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Notes
                </label>

                <textarea
                  defaultValue={person.notes || ""}
                  onBlur={(e) => updateNotes(person.id, e.target.value)}
                  placeholder="Add notes..."
                  className="border rounded p-2 w-full"
                />
              </div>
            </div>
          );
        })}

        {filteredPeople.length === 0 && (
          <div className="p-4 text-gray-500">No people found.</div>
        )}
      </div>
    </main>
  );
}