interface SetupRequiredProps {
  title: string;
  steps: string[];
}

export function SetupRequired({ title, steps }: SetupRequiredProps) {
  return (
    <div className="mm-page">
      <div className="mm-container" style={{ paddingTop: 80, maxWidth: 640 }}>
        <div
          className="mm-panel"
          style={{ padding: "32px 28px", boxShadow: "5px 5px 0 rgba(27,23,18,0.85)" }}
        >
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 11,
              letterSpacing: "2px",
              color: "#E5431E",
              marginBottom: 12,
            }}
          >
            // SETUP REQUIRED
          </div>
          <h1
            style={{
              fontFamily: "Archivo",
              fontWeight: 900,
              fontSize: 32,
              letterSpacing: "-0.8px",
              margin: "0 0 16px",
            }}
          >
            {title}
          </h1>
          <ol
            style={{
              fontFamily: "Archivo",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#4A423A",
              paddingLeft: 20,
              margin: "0 0 20px",
            }}
          >
            {steps.map((step) => (
              <li key={step} style={{ marginBottom: 8 }}>
                {step}
              </li>
            ))}
          </ol>
          <p
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: 12,
              color: "#8a7d6c",
              margin: 0,
            }}
          >
            Restart <code>npm run dev</code> after saving your env files.
          </p>
        </div>
      </div>
    </div>
  );
}
