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
    expect(screen.getByRole("status").textContent).toBe("1–1 of 3");
    const previous = screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement;
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(previous.disabled).toBe(false);
    fireEvent.click(previous);
    expect(onOffsetChange).not.toHaveBeenCalled();
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
    expect(screen.getByRole("button", { name: "Next" }).getAttribute("aria-disabled")).toBe("true");
  });

  // Regression (admin Users ledger L-20): disabling the focused button dropped focus to <body>.
  it("keeps paging buttons focusable but inert while the next page loads", () => {
    const onOffsetChange = vi.fn();
    const { rerender } = render(
      <DataTable columns={columns} rows={[{ id: "1", name: "Ada" }]} getRowId={getRowId}
        pagination={{ offset: 0, limit: 1, total: 3, onOffsetChange }} />,
    );
    const next = screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
    next.focus();
    fireEvent.click(next);
    expect(onOffsetChange).toHaveBeenCalledTimes(1);
    rerender(
      <DataTable columns={columns} rows={[{ id: "1", name: "Ada" }]} getRowId={getRowId} isLoading
        pagination={{ offset: 0, limit: 1, total: 3, onOffsetChange }} />,
    );
    expect(next.disabled).toBe(false);
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(next);
    fireEvent.click(next);
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onOffsetChange).toHaveBeenCalledTimes(1);
    rerender(
      <DataTable columns={columns} rows={[{ id: "3", name: "Grace" }]} getRowId={getRowId}
        pagination={{ offset: 2, limit: 1, total: 3, onOffsetChange }} />,
    );
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(next);
    expect(screen.getByRole("button", { name: "Previous" }).getAttribute("aria-disabled")).toBeNull();
  });

  // Regression (admin Users ledger L-15): a failed refresh replaced the rows already shown.
  it("keeps the shown rows when a refresh fails, with the error and retry above them", () => {
    const onRetry = vi.fn();
    render(
      <DataTable columns={columns} rows={[{ id: "1", name: "Ada" }]} getRowId={getRowId} error="Check your connection"
        onRetry={onRetry} pagination={{ offset: 0, limit: 1, total: 3, onOffsetChange: vi.fn() }} />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Check your connection");
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(alert.compareDocumentPosition(screen.getByRole("table")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("names the table when a label is given", () => {
    render(<DataTable label="Users" columns={columns} rows={[{ id: "1", name: "Ada" }]} getRowId={getRowId} />);

    expect(screen.getByRole("table", { name: "Users" })).toBeTruthy();
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
