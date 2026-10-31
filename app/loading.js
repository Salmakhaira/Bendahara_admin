export default function Loading() {
  return (
    <main className="wrap" aria-busy="true" aria-live="polite">
      <p className="sr">Memuat...</p>
      <div className="rangka" aria-hidden="true">
        <div className="rangka-blok besar" />
        <div className="rangka-blok" />
        <div className="rangka-blok" />
      </div>
    </main>
  )
}
