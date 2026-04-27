import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="p-4">
      <h1 className="text-3xl font-bold">Admin</h1>

      <div className="mt-4">
        <Link className="text-blue-600 underline" href="/admin/import">
          Import Cars & People
        </Link>
      </div>
    </main>
  );
}