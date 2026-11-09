export default function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <main className="screen">
      <header className="screen-header">
        <div className="titles">
          <h1>{title}</h1>
        </div>
      </header>
      <div className="placeholder">{note}</div>
    </main>
  );
}
