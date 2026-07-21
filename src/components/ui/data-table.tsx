"use client";
import { useState, type ReactNode, type CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SortDir = "asc" | "desc";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: number | string;
}

// ── DataTable ─────────────────────────────────────────────────────────────────

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  keyFn,
  defaultSort,
  defaultDir = "desc",
  pageSize = 25,
  emptyState,
  style,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFn?: (row: T, i: number) => string | number;
  defaultSort?: string;
  defaultDir?: SortDir;
  pageSize?: number;
  emptyState?: ReactNode;
  style?: CSSProperties;
}) {
  const [sortKey, setSortKey] = useState(defaultSort ?? "");
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  const [page, setPage] = useState(0);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey];
        const bv = (b as Record<string, unknown>)[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div style={style}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  style={{
                    padding: "8px 12px", textAlign: col.align ?? "left",
                    fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "var(--muted)",
                    borderBottom: "1px solid var(--line)",
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                    width: col.width,
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span style={{ marginLeft: 4, color: "var(--accent)" }}>
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={keyFn ? keyFn(row, i) : (row.id ?? i)}
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    style={{
                      padding: "10px 12px", textAlign: col.align ?? "left",
                      fontSize: "0.82rem", color: "var(--ink)",
                    }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 0 0",
        }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <PageBtn onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              ←
            </PageBtn>
            <PageBtn onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
              →
            </PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: "0.78rem", fontWeight: 600, padding: "4px 10px",
        border: "1px solid var(--line)", borderRadius: 6,
        background: "var(--surface)", color: disabled ? "var(--muted)" : "var(--ink)",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
