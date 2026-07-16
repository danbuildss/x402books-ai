"use client";
import React from "react";

interface Props {
  name: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32 }}>
          <p style={{ color: "#ef4444", fontWeight: 700, marginBottom: 8 }}>
            {this.props.name} failed to load
          </p>
          <pre style={{
            fontSize: "0.72rem",
            color: "var(--muted)",
            background: "var(--surface)",
            padding: 12,
            borderRadius: 6,
            overflowX: "auto",
            marginBottom: 16,
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--fg)",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
