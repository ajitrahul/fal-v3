// app/dev-network/page.tsx
export const dynamic = "force-dynamic";
export default function DevNetwork() {
  return (
    <main style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>Dev Network Check</h1>
      <p>Try from another device: <code>/dev-network</code> and <code>/api/health</code></p>
      <ul>
        <li>Health JSON: <a href="/api/health">/api/health</a></li>
        <li>Root page: <a href="/">/</a></li>
        <li>Static chunk: <a href="/_next/static/chunks/main-app.js">/_next/static/chunks/main-app.js</a></li>
      </ul>
    </main>
  );
}
