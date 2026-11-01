// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "./DataTable";

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [{ id: "name", header: "Name", cell: (row) => row.name }];
const getRowId = (row: Row) => row.id;

afterEach(cleanup);

describe("DataTable", () => {
  it("shows the loading state before the first rows arrive", () => {
    render(<DataTable columns={columns} rows={undefined} getRowId={getRowId} isLoading />);

    expect(screen.getByRole("status").textContent).toContain("Loading");
  });

  it("shows the error state with a retry action", () => {
    const onRetry = vi.fn();
    render(<DataTable columns={columns} rows={[]} getRowId={getRowId} error="Boom" onRetry={onRetry} />);

    expect(screen.getByRole("alert").textContent).toContain("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the empty state", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={getRowId} emptyTitle="No users yet" />);

    expect(screen.getByText("No users yet")).toBeTruthy();
  });

  it("renders rows and paginates", () => {
    const onOffsetChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Ada" }]}
        getRowId={getRowId}
        pagination={{ offset: 0, limit: 1, total: 3, onOffsetChange }}
      />,
    );

    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("1–1 of 3")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onOffsetChange).toHaveBeenCalledWith(1);
  });

  it("renders row actions and pages back, clamping at zero", () => {
    const onOffsetChange = vi.fn();
    render(
      <DataTable
        columns={[{ id: "name", header: "Name", cell: (row: Row) => row.name, className: "w-40" }]}
        rows={[{ id: "1", name: "Ada" }]}
        getRowId={getRowId}
        rowActions={(row) => <button>Edit {row.name}</button>}
        pagination={{ offset: 1, limit: 2, total: 5, onOffsetChange }}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit Ada" })).toBeTruthy();
    expect(screen.getByText("2–3 of 5")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onOffsetChange).toHaveBeenCalledWith(0);
  });

  it("keeps the table with disabled paging while a refetch of an empty page is loading", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={getRowId}
        isLoading
        pagination={{ offset: 0, limit: 10, total: 0, onOffsetChange: vi.fn() }}
      />,
    );

    expect(screen.getByText("0–0 of 0")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  });

  // User decision 2026-11-01: rows stack in narrow containers, so each cell carries its column name.
  it("labels each cell with its column name for stacked rows, keeping table semantics", () => {
    const { container } = render(
      <DataTable
        rows={[{ id: "1", name: "Alex" }]}
        getRowId={getRowId}
        columns={[
          { id: "name", header: "Name", cell: (row: Row) => row.name },
          { id: "time", header: <span>Time</span>, label: "Session time", cell: () => "6 Nov, 18:00" },
          { id: "link", header: <span className="sr-only">Details</span>, cell: () => <a href="#/b1">View</a> },
        ]}
        rowActions={() => <button type="button">Edit</button>}
      />,
    );
    expect(container.querySelector(".mentio-data-table")).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Name", "Time", "Details", "Actions"]);
    const cells = screen.getAllByRole("cell");
    const labels = cells.map((cell) => cell.querySelector(".mentio-table-cell-label")?.textContent ?? null);
    expect(labels).toEqual(["Name", "Session time", null, "Actions"]);
    expect(cells[0].querySelector(".mentio-table-cell-label")?.getAttribute("aria-hidden")).toBe("true");
    expect(cells[0].querySelector(".mentio-table-cell-value")?.textContent).toBe("Alex");
  });
});
