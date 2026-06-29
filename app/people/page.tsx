"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase";

const ROLE_OPTIONS = [
  "Player",
  "Withdrawn Player",
  "PGA Staff",
  "Tournament Staff",
  "Transportation Staff",
  "Misc",
];

type Person = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  notes: string | null;
};

type OpenCheckout = {
  person_id: number | null;
  car_number: number | null;
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  role: "Player",
  notes: "",
};

function RequiredAsterisk() {
  return <span className="ml-1 font-bold text-red-600">*</span>;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [openCheckouts, setOpenCheckouts] = useState<OpenCheckout[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRolePersonId, setEditingRolePersonId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState("");
  const [savingRolePersonId, setSavingRolePersonId] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);

    const [peopleResult, checkoutResult] = await Promise.all([
      supabase
        .from("people")
        .select("id, first_name, last_name, phone, email, role, notes")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),

      supabase
        .from("checkouts")
        .select("person_id, car_number")
        .is("time_in", null),
    ]);

    if (peopleResult.error) {
      alert(peopleResult.error.message);
    } else {
      setPeople(peopleResult.data || []);
    }

    if (checkoutResult.error) {
      alert(checkoutResult.error.message);
    } else {
      setOpenCheckouts(checkoutResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const checkedOutCarsByPerson = useMemo(() => {
    const map = new Map<number, number[]>();

    for (const checkout of openCheckouts) {
      if (checkout.person_id === null || checkout.car_number === null) continue;

      const cars = map.get(checkout.person_id) || [];
      cars.push(checkout.car_number);
      map.set(checkout.person_id, cars);
    }

    return map;
  }, [openCheckouts]);

  const filteredPeople = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return people.filter((person) => {
      const searchableText = [
        person.first_name,
        person.last_name,
        person.phone,
        person.email,
        person.role,
        person.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      const matchesRole = !roleFilter || person.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [people, search, roleFilter]);

  function updateForm(
    field: keyof typeof EMPTY_FORM,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeAddForm() {
    setShowAddForm(false);
    setForm(EMPTY_FORM);
  }

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!firstName || !lastName) {
      alert("Please enter a first and last name.");
      return;
    }

    const existingPerson = people.find(
      (person) =>
        person.first_name.trim().toLowerCase() === firstName.toLowerCase() &&
        person.last_name.trim().toLowerCase() === lastName.toLowerCase()
    );

    if (existingPerson) {
      const continueAdding = window.confirm(
        `${existingPerson.first_name} ${existingPerson.last_name} already exists. Add another record anyway?`
      );

      if (!continueAdding) return;
    }

    setSaving(true);

    const { error } = await supabase.from("people").insert({
      first_name: firstName,
      last_name: lastName,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      role: form.role,
      notes: form.notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    closeAddForm();
    await loadData();
  }

  function beginEditRole(person: Person) {
    setEditingRolePersonId(person.id);
    setEditingRole(person.role || "Misc");
  }

  function cancelEditRole() {
    setEditingRolePersonId(null);
    setEditingRole("");
  }

  async function savePersonRole(personId: number) {
    if (!editingRole) {
      alert("Please choose a person type.");
      return;
    }

    setSavingRolePersonId(personId);

    const { error } = await supabase
      .from("people")
      .update({ role: editingRole })
      .eq("id", personId);

    setSavingRolePersonId(null);

    if (error) {
      alert(error.message);
      return;
    }

    setPeople((current) =>
      current.map((person) =>
        person.id === personId
          ? { ...person, role: editingRole }
          : person
      )
    );

    cancelEditRole();
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1F4E1A]">People</h1>
          <p className="mt-1 text-sm text-gray-600">
            {people.length} total people
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            className="rounded border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-100"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="rounded bg-[#367C2B] px-4 py-2 font-semibold text-white hover:bg-[#2e6e24]"
          >
            {showAddForm ? "Close Add Person" : "Add Person"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={addPerson}
          className="mb-6 rounded-lg border-2 border-[#367C2B] bg-green-50 p-4 md:p-5"
        >
          <h2 className="mb-4 text-xl font-bold text-[#1F4E1A]">
            Add Person
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold">
                First Name
                <RequiredAsterisk />
              </label>
              <input
                value={form.firstName}
                onChange={(event) =>
                  updateForm("firstName", event.target.value)
                }
                className="w-full rounded border p-3"
                autoComplete="given-name"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">
                Last Name
                <RequiredAsterisk />
              </label>
              <input
                value={form.lastName}
                onChange={(event) =>
                  updateForm("lastName", event.target.value)
                }
                className="w-full rounded border p-3"
                autoComplete="family-name"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">
                Type of Person
                <RequiredAsterisk />
              </label>
              <select
                value={form.role}
                onChange={(event) => updateForm("role", event.target.value)}
                className="w-full rounded border bg-white p-3"
                required
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold">Phone</label>
              <input
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                type="tel"
                className="w-full rounded border p-3"
                autoComplete="tel"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block font-semibold">Email</label>
              <input
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                type="email"
                className="w-full rounded border p-3"
                autoComplete="email"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block font-semibold">Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                rows={3}
                className="w-full rounded border p-3"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAddForm}
              className="rounded bg-gray-200 px-4 py-2 font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded bg-[#367C2B] px-4 py-2 font-semibold text-white hover:bg-[#2e6e24] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Person"}
            </button>
          </div>
        </form>
      )}

      <section className="mb-5 grid gap-3 md:grid-cols-[1fr_240px]">
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Search People
          </label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, email, type, or notes..."
            className="w-full rounded border p-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Type of Person
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="w-full rounded border bg-white p-3"
          >
            <option value="">All types</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="mb-3 text-sm text-gray-600">
        Showing {filteredPeople.length} of {people.length}
      </div>

      {loading ? (
        <div className="rounded border bg-white p-6 text-center text-gray-500">
          Loading people...
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="rounded border bg-white p-6 text-center text-gray-500">
          No people found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="hidden grid-cols-[1.3fr_1.1fr_1fr_1fr_1fr_120px] gap-3 bg-gray-100 px-4 py-3 text-sm font-bold md:grid">
            <div>Name</div>
            <div>Type</div>
            <div>Phone</div>
            <div>Email</div>
            <div>Car Status</div>
            <div>Action</div>
          </div>

          {filteredPeople.map((person) => {
            const checkedOutCars =
              checkedOutCarsByPerson.get(person.id) || [];

            return (
              <div
                key={person.id}
                className="border-t px-4 py-4 first:border-t-0"
              >
                <div className="grid gap-2 md:grid-cols-[1.3fr_1.1fr_1fr_1fr_1fr_120px] md:items-start md:gap-3">
                  <div>
                    <div className="font-bold text-[#1F4E1A]">
                      {person.first_name} {person.last_name}
                    </div>
                    {person.notes && (
                      <div className="mt-1 text-sm text-gray-600">
                        {person.notes}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                      Type:
                    </span>

                    {editingRolePersonId === person.id ? (
                      <select
                        value={editingRole}
                        onChange={(event) => setEditingRole(event.target.value)}
                        className="w-full rounded border bg-white p-2"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : person.role === "Withdrawn Player" ? (
                      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
                        Withdrawn Player
                      </span>
                    ) : (
                      <span>{person.role || "—"}</span>
                    )}
                  </div>

                  <div>
                    <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                      Phone:
                    </span>
                    {person.phone || "—"}
                  </div>

                  <div className="break-all">
                    <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                      Email:
                    </span>
                    {person.email || "—"}
                  </div>

                  <div>
                    <span className="mr-2 text-xs font-semibold text-gray-500 md:hidden">
                      Car:
                    </span>

                    {checkedOutCars.length > 0 ? (
                      <span className="font-semibold text-red-700">
                        {checkedOutCars
                          .map((carNumber) => `#${carNumber}`)
                          .join(", ")} checked out
                      </span>
                    ) : (
                      <span className="text-gray-500">No car checked out</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {editingRolePersonId === person.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => savePersonRole(person.id)}
                          disabled={savingRolePersonId === person.id}
                          className="rounded bg-[#367C2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2e6e24] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingRolePersonId === person.id ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditRole}
                          disabled={savingRolePersonId === person.id}
                          className="rounded bg-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-300 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEditRole(person)}
                        className="rounded bg-[#FFDE00] px-3 py-2 text-sm font-bold text-[#1F4E1A] hover:bg-yellow-300"
                      >
                        Edit Type
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
