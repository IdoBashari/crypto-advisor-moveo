import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

interface HealthResponse {
  status: string;
  timestamp: string;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: HealthResponse) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Crypto Advisor</h1>
      {loading && <p>Checking API…</p>}
      {data && (
        <p>
          API status: {data.status} | {data.timestamp}
        </p>
      )}
      {error && <p>API error: {error}</p>}
    </div>
  );
}

export default App;
