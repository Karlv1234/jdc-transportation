"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [pin, setPin] = useState("");
  const router = useRouter();

  function handleLogin() {
    if (pin === process.env.NEXT_PUBLIC_APP_PIN) {
      sessionStorage.setItem("jdc-auth", "true");
      router.push("/dashboard");
    } else {
      alert("Incorrect PIN");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-2 text-center">
          JDC Transportation
        </h1>

        <p className="text-gray-600 text-center mb-4">
          Enter PIN to access the system
        </p>

        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          className="border rounded p-3 mb-3 w-full"
        />

        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white rounded px-6 py-3 w-full"
        >
          Enter
        </button>
      </div>
    </main>
  );
}