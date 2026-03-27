import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardQuery } from "@/api";

describe("useDashboardQuery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            status: { code: 200, message: "OK" },
            data: { value: 1 },
            error: null,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );
  });

  it("skips state updates for equal polling payloads when an equality function is provided", async () => {
    let renderCount = 0;

    function Probe() {
      const result = useDashboardQuery<{ value: number }>("/api/test", {
        enabled: true,
        intervalMs: 5000,
        isEqual: (left, right) => left.value === right.value,
      });
      renderCount += 1;

      return (
        <div>
          {result.loading ? "loading" : "ready"}:{result.data?.value ?? "none"}
        </div>
      );
    }

    render(<Probe />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("ready:1")).toBeInTheDocument();

    const rendersAfterInitialLoad = renderCount;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText("ready:1")).toBeInTheDocument();
    expect(renderCount).toBe(rendersAfterInitialLoad);
  });
});
