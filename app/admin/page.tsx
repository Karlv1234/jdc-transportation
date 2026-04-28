import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F5] p-4">
      <h1 className="text-3xl font-bold mb-4">Admin</h1>

      <div className="grid gap-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-[#367C2B]">
          <h2 className="text-xl font-bold text-[#1F4E1A] mb-2">
            Import Data
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Upload car lists and people/player lists from CSV templates.
          </p>

          <Link
            href="/admin/import"
            className="inline-block bg-[#367C2B] hover:bg-[#2e6e24] text-white px-4 py-3 rounded font-semibold"
          >
            Import Cars & People
          </Link>
        </div>
      </div>
    </main>
  );
}