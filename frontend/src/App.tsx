import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";

function App() {
  const [status, setStatus] = useState<string>("loading...");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <main>
      <h1>PC Price Comparator</h1>
      <p>Backend status: {status}</p>
    </main>
  );
}

export default App;