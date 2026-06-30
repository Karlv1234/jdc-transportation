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

function csvSafe(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
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
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

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

  function downloadPlayerCsv() {
    const playerRows = people
      .filter(
        (person) =>
          person.role === "Player" ||
          person.role === "Withdrawn Player"
      )
      .sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`
        )
      );

    const headers = [
      "First Name",
      "Last Name",
      "Player Status",
      "Car Number(s)",
      "Phone",
      "Email",
      "Notes",
    ];

    const rows = playerRows.map((person) => {
      const carNumbers = [
        ...new Set(checkedOutCarsByPerson.get(person.id) || []),
      ].sort((a, b) => a - b);

      return [
        person.first_name,
        person.last_name,
        person.role || "Player",
        carNumbers.join(", "),
        person.phone || "",
        person.email || "",
        person.notes || "",
      ];
    });

    const csv = [
      headers.map(csvSafe).join(","),
      ...rows.map((row) => row.map(csvSafe).join(",")),
    ].join("\r\n");

    const today = new Date().toISOString().slice(0, 10);

    downloadTextFile(
      `jdc-player-information-${today}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }

  function beginEditPerson(person: Person) {
    setEditingPersonId(person.id);
    setEditForm({
      firstName: person.first_name || "",
      lastName: person.last_name || "",
      phone: person.phone || "",
      email: person.email || "",
      role: person.role || "Misc",
      notes: person.notes || "",
    });
  }

  function cancelEditPerson() {
    setEditingPersonId(null);
    setEditForm(EMPTY_FORM);
  }

  function updateEditForm(
    field: keyof typeof EMPTY_FORM,
    value: string
  ) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function savePersonDetails() {
    if (editingPersonId === null) return;

    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();

    if (!firstName || !lastName) {
      alert("First and last name are required.");
      return;
    }

    const duplicate = people.find(
      (person) =>
        person.id !== editingPersonId &&
        person.first_name.trim().toLowerCase() === firstName.toLowerCase() &&
        person.last_name.trim().toLowerCase() === lastName.toLowerCase()
    );

    if (
      duplicate &&
      !window.confirm(
        `${duplicate.first_name} ${duplicate.last_name} already exists. Save these changes anyway?`
      )
    ) {
      return;
    }

    setSavingEdit(true);

    const updatePayload = {
      first_name: firstName,
      last_name: lastName,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      role: editForm.role,
      notes: editForm.notes.trim() || null,
    };

    const { data: updatedPerson, error } = await supabase
      .from("people")
      .update(updatePayload)
      .eq("id", editingPersonId)
      .select("id, first_name, last_name, phone, email, role, notes")
      .maybeSingle();

    setSavingEdit(false);

    if (error) {
      alert(`Unable to save person: ${error.message}`);
      return;
    }

    if (!updatedPerson) {
      alert(
        "The person was not updated. This is usually caused by a Supabase update permission or Row Level Security policy. Run the supplied permission SQL, then try again."
      );
      return;
    }

    setPeople((current) =>
      current
        .map((person) =>
          person.id === updatedPerson.id
            ? (updatedPerson as Person)
            : person
        )
        .sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(
            `${b.last_name} ${b.first_name}`
          )
        )
    );

    cancelEditPerson();
    alert(
      `${updatedPerson.first_name} ${updatedPerson.last_name} was updated to ${updatedPerson.role || "No type"}.`
    );

    await loadData();
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
            onClick={downloadPlayerCsv}
            className="rounded bg-[#FFDE00] px-4 py-2 font-bold text-[#1F4E1A] hover:bg-yellow-300"
          >
            Download Player CSV
          </button>

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

                    {person.role === "Withdrawn Player" ? (
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
                    <button
                      type="button"
                      onClick={() => beginEditPerson(person)}
                      className="rounded bg-[#FFDE00] px-3 py-2 text-sm font-bold text-[#1F4E1A] hover:bg-yellow-300"
                    >
                      Edit Person
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingPersonId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-person-title"
        >
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-[#1F4E1A] px-5 py-4 text-white">
              <div>
                <h2 id="edit-person-title" className="text-xl font-bold">
                  Edit Person
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  Update the player or staff member's full record.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEditPerson}
                disabled={savingEdit}
                className="rounded px-3 py-1 text-2xl leading-none hover:bg-white/15 disabled:opacity-50"
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold">
                    First Name
                    <RequiredAsterisk />
                  </label>
                  <input
                    value={editForm.firstName}
                    onChange={(event) =>
                      updateEditForm("firstName", event.target.value)
                    }
                    className="w-full rounded border p-3"
                    autoComplete="given-name"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold">
                    Last Name
                    <RequiredAsterisk />
                  </label>
                  <input
                    value={editForm.lastName}
                    onChange={(event) =>
                      updateEditForm("lastName", event.target.value)
                    }
                    className="w-full rounded border p-3"
                    autoComplete="family-name"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold">
                    Type of Person
                    <RequiredAsterisk />
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(event) =>
                      updateEditForm("role", event.target.value)
                    }
                    className="w-full rounded border bg-white p-3"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>

                  {editForm.role === "Withdrawn Player" && (
                    <div className="mt-2 rounded border border-red-400 bg-red-50 p-3 text-sm font-semibold text-red-800">
                      This person will be flagged as withdrawn and the Check Out
                      page will warn that they should not receive a car.
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block font-semibold">Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={(event) =>
                      updateEditForm("phone", event.target.value)
                    }
                    type="tel"
                    className="w-full rounded border p-3"
                    autoComplete="tel"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block font-semibold">Email</label>
                  <input
                    value={editForm.email}
                    onChange={(event) =>
                      updateEditForm("email", event.target.value)
                    }
                    type="email"
                    className="w-full rounded border p-3"
                    autoComplete="email"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block font-semibold">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(event) =>
                      updateEditForm("notes", event.target.value)
                    }
                    rows={5}
                    className="w-full rounded border p-3"
                    placeholder="Transportation notes, contact details, exceptions, or other information..."
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t bg-gray-50 px-5 py-4">
              <button
                type="button"
                onClick={cancelEditPerson}
                disabled={savingEdit}
                className="rounded bg-gray-200 px-5 py-3 font-semibold hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePersonDetails}
                disabled={savingEdit}
                className="rounded bg-[#367C2B] px-5 py-3 font-semibold text-white hover:bg-[#2e6e24] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save Person"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
