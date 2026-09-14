export default function AmbientLights() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg"
    >
      {/* warm bokeh glows, like out-of-focus string lights at night */}
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-600/10 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-96 w-96 rounded-full bg-pink-600/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-amber-500/[0.07] blur-3xl" />

      {/* small twinkling specks of light, like the flash sparkles in the reference photo */}
      <span
        className="spark"
        style={{ left: "12%", top: "18%", animationDelay: "0s" }}
      />
      <span
        className="spark"
        style={{ left: "82%", top: "10%", animationDelay: "1.2s" }}
      />
      <span
        className="spark"
        style={{ left: "70%", top: "55%", animationDelay: "2.4s" }}
      />
      <span
        className="spark"
        style={{ left: "20%", top: "70%", animationDelay: "0.6s" }}
      />
      <span
        className="spark"
        style={{ left: "92%", top: "75%", animationDelay: "1.8s" }}
      />
      <span
        className="spark"
        style={{ left: "45%", top: "30%", animationDelay: "3s" }}
      />
    </div>
  );
}
