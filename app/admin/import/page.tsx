"use client";

import { useState } from "react";
import { supabase } from "../../../src/lib/supabase";

type CsvRow = Record<string, string>;

const carHeaders = [
  "car_number",
  "make",
  "model",
  "type",
  "color",
  "vin",
  "dealership",
  "current_location",
  "status",
  "notes",
];

const peopleHeaders = ["first_name", "last_name", "phone", "email", "role", "notes"];

function downloadTemplate(filename: string, headers: string[]) {
  const csv = headers.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

export default function ImportPage() {
  const [carFileName, setCarFileName] = useState("");
  const [peopleFileName, setPeopleFileName] = useState("");
  const [message, setMessage] = useState("");

  async function importCars(file: File) {
    setCarFileName(file.name);
    setMessage("Importing cars...");

    const text = await file.text();
    const rows = parseCsv(text);

    let imported = 0;

    for (const row of rows) {
      if (!row.car_number) continue;

      const { error } = await supabase.from("vehicles").upsert(
        {
          car_number: Number(row.car_number),
          make: row.make || "Lexus",
          model: row.model || "",
          type: row.type || "",
          color: row.color || "",
          vin: row.vin || "",
          dealership: row.dealership || "",
          current_location: row.current_location || "Trailer",
          status: row.status || "Available",
          notes: row.notes || "",
        },
        { onConflict: "car_number" }
      );

      if (error) {
        alert(error.message);
        setMessage("Car import stopped because of an error.");
        return;
      }

      imported++;
    }

    setMessage(`Imported/updated ${imported} car(s).`);
  }

  async function importPeople(file: File) {
    setPeopleFileName(file.name);
    setMessage("Importing people...");

    const text = await file.text();
    const rows = parseCsv(text);

    let imported = 0;

    for (const row of rows) {
      if (!row.first_name || !row.last_name) continue;

      const { error } = await supabase.from("people").insert({
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone || "",
        email: row.email || "",
        role: row.role || "Misc",
        notes: row.notes || "",
      });

      if (error) {
        alert(error.message);
        setMessage("People import stopped because of an error.");
        return;
      }

      imported++;
    }

    setMessage(`Imported ${imported} people.`);
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <h1 className="text-3xl font-bold mb-4">Import Cars & People</h1>

      <div className="grid gap-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-[#367C2B]">
          <h2 className="text-xl font-bold mb-2 text-[#1F4E1A]">Import Cars</h2>

          <p className="text-sm text-gray-600 mb-3">
            Upload a CSV of vehicles. Existing cars update based on car number.
          </p>

          <button
            onClick={() =>
              downloadTemplate("jdc-car-import-template.csv", carHeaders)
            }
            className="bg-[#1F4E1A] text-white px-4 py-2 rounded mb-3"
          >
            Download Car Template
          </button>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importCars(file);
            }}
            className="block w-full"
          />

          {carFileName && (
            <p className="text-sm text-gray-500 mt-2">File: {carFileName}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-[#FFDE00]">
          <h2 className="text-xl font-bold mb-2 text-[#1F4E1A]">
            Import People
          </h2>

          <p className="text-sm text-gray-600 mb-3">
            Upload a CSV of players, staff, or other people.
          </p>

          <button
            onClick={() =>
              downloadTemplate("jdc-people-import-template.csv", peopleHeaders)
            }
            className="bg-[#1F4E1A] text-white px-4 py-2 rounded mb-3"
          >
            Download People Template
          </button>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importPeople(file);
            }}
            className="block w-full"
          />

          {peopleFileName && (
            <p className="text-sm text-gray-500 mt-2">File: {peopleFileName}</p>
          )}
        </div>

        {message && (
          <div className="bg-[#FFDE00]/20 border border-[#FFDE00] rounded p-4 text-[#1F4E1A] font-semibold">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}