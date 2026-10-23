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
});
