"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

type ExportRow = {
  car_number: number | null
  make: string | null
  model: string | null
  car_type: string | null
  num_passengers: number | null
  ready: boolean | null
  checked_out: boolean | null
  loanee_name: string | null
  loanee_phone: string | null
  loanee_email: string | null
  checked_out_at: string | null
  notes: string | null
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replaceAll('"', '""')}"`
}

export default function AdminPage() {
  const [rows, setRows] = useState<ExportRow[]>([])
  const [errorMsg, setErrorMsg] = useState("")

  async function loadData() {
    setErrorMsg("")

    const { data: cars, error: carsError } = await supabase
      .from("cars")
      .select("id, car_number, make, model, car_type, num_passengers, ready, checked_out")
      .order("car_number", { ascending: true })

    if (carsError) {
      setErrorMsg(carsError.message)
      return
    }

    const { data: loans, error: loansError } = await supabase
      .from("car_loans")
      .select(`
        car_id,
        checked_out_at,
        notes,
        loanees:loanees (
          name,
          phone,
          email
        )
      `)
      .is("returned_at", null)

    if (loansError) {
      setErrorMsg(loansError.message)
      return
    }

    const activeLoanByCarId = new Map<number, any>()
    ;(loans ?? []).forEach((loan: any) => {
      activeLoanByCarId.set(loan.car_id, loan)
    })

    const exportRows: ExportRow[] = (cars ?? []).map((car: any) => {
      const loan = activeLoanByCarId.get(car.id)

      return {
        car_number: car.car_number,
        make: car.make,
        model: car.model,
        car_type: car.car_type,
        num_passengers: car.num_passengers,
        ready: car.ready,
        checked_out: car.checked_out,
        loanee_name: loan?.loanees?.name ?? null,
        loanee_phone: loan?.loanees?.phone ?? null,
        loanee_email: loan?.loanees?.email ?? null,
        checked_out_at: loan?.checked_out_at ?? null,
        notes: loan?.notes ?? null,
      }
    })

    setRows(exportRows)
  }

  useEffect(() => {
    loadData()
  }, [])

  function downloadCsv() {
    const headers = [
      "Car Number",
      "Make",
      "Model",
      "Type",
      "Passengers",
      "Ready",
      "Checked Out",
      "Loanee Name",
      "Loanee Phone",
      "Loanee Email",
      "Checked Out At",
      "Notes",
    ]

    const csvRows = [
      headers.map(csvEscape).join(","),
      ...rows.map((r) =>
        [
          r.car_number,
          r.make,
          r.model,
          r.car_type,
          r.num_passengers,
          r.ready ? "Yes" : "No",
          r.checked_out ? "Yes" : "No",
          r.loanee_name,
          r.loanee_phone,
          r.loanee_email,
          r.checked_out_at ? new Date(r.checked_out_at).toLocaleString() : "",
          r.notes,
        ]
          .map(csvEscape)
          .join(",")
      ),
    ]

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `car-status-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex gap-3">
          <Link href="/" className="underline">Cars</Link>
          <Link href="/loanees" className="underline">Loanees</Link>
          <Link href="/checkout" className="underline">Check Out</Link>
          <Link href="/admin" className="underline font-semibold">Admin</Link>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 border border-red-300 bg-red-50 text-red-700 p-3 rounded">
          {errorMsg}
        </div>
      )}

      <div className="border p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">Export Cars</h2>
        <p className="text-sm text-gray-700 mb-4">
          Download all cars with current status and current loanee, if checked out.
        </p>

        <button
          onClick={downloadCsv}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Download CSV
        </button>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Car #</th>
              <th className="text-left p-2">Vehicle</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Loanee</th>
              <th className="text-left p-2">Out Since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.car_number ?? `${r.make}-${r.model}`} className="border-t">
                <td className="p-2">#{r.car_number ?? "—"}</td>
                <td className="p-2">{r.make ?? ""} {r.model ?? ""}</td>
                <td className="p-2">{r.car_type ?? ""}</td>
                <td className="p-2">{r.checked_out ? "Checked Out" : "Available"}</td>
                <td className="p-2">{r.loanee_name ?? "—"}</td>
                <td className="p-2">
                  {r.checked_out_at ? new Date(r.checked_out_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}