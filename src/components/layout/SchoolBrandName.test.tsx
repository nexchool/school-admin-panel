import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchoolBrandName } from "./SchoolBrandName";

describe("SchoolBrandName", () => {
  it("renders the resolved school / tenant name when provided", () => {
    render(<SchoolBrandName name="Riverside International School" />);
    const el = screen.getByText("Riverside International School");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("title", "Riverside International School");
  });

  it("uses the default fallback when name is null or undefined", () => {
    const { rerender } = render(<SchoolBrandName name={null} />);
    expect(screen.getByText("School")).toBeInTheDocument();

    rerender(<SchoolBrandName name={undefined} />);
    expect(screen.getByText("School")).toBeInTheDocument();
  });

  it("supports a custom fallback instead of the default", () => {
    render(<SchoolBrandName name={null} fallback="Academy" />);
    expect(screen.getByText("Academy")).toBeInTheDocument();
  });

  it("trims leading and trailing whitespace from the name", () => {
    render(<SchoolBrandName name="  Lincoln High  " />);
    expect(screen.getByText("Lincoln High")).toBeInTheDocument();
    expect(screen.getByTitle("Lincoln High")).toBeInTheDocument();
  });

  it("treats whitespace-only name as empty and shows the fallback", () => {
    render(<SchoolBrandName name="   " />);
    expect(screen.getByText("School")).toBeInTheDocument();
  });
});
