import { dashboardTheme } from "@/theme";

describe("dashboardTheme", () => {
  it("uses Ubuntu as the global font family", () => {
    expect(dashboardTheme.typography.fontFamily).toContain("Ubuntu");
  });

  it("keeps the visual system angular across surfaces and controls", () => {
    expect(dashboardTheme.shape.borderRadius).toBe(6);
    expect(dashboardTheme.components?.MuiButton?.styleOverrides?.root).toMatchObject({
      borderRadius: 6,
    });
    expect(dashboardTheme.components?.MuiChip?.styleOverrides?.root).toMatchObject({
      borderRadius: 6,
    });
    expect(
      dashboardTheme.components?.MuiOutlinedInput?.styleOverrides?.root,
    ).toMatchObject({
      borderRadius: 6,
    });
  });

  it("keeps the app bar flat and the tabs denser", () => {
    expect(dashboardTheme.components?.MuiAppBar?.styleOverrides?.root).toMatchObject({
      borderRadius: 0,
      border: "none",
      borderBottom: "none",
    });
    expect(dashboardTheme.components?.MuiTab?.styleOverrides?.root).toMatchObject({
      minHeight: 44,
    });
  });
});
