import { describe, it, expect } from "vitest";
import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { useEnteredItems, useValueChanged } from "./useEnteredItems";

function EnteringProbe({ ids }: { ids: string[] }) {
  const entering = useEnteredItems(ids);
  return <p>entering:{[...entering].join(",") || "none"}</p>;
}

function ChangedProbe({ value }: { value: string }) {
  const changed = useValueChanged(value);
  return <p>changed:{String(changed)}</p>;
}

// Every case renders inside StrictMode, matching main.tsx. This is not
// ceremony: the first version of these hooks recorded state during render, so
// StrictMode's second pass saw the id as already known and reported nothing
// entering. It passed outside StrictMode and would have failed only in
// `npm run dev` — a bug that behaves the wrong way round.
describe("useEnteredItems", () => {
  it("reports nothing entering on the first render", () => {
    render(
      <StrictMode>
        <EnteringProbe ids={["a", "b"]} />
      </StrictMode>
    );

    expect(screen.getByText("entering:none")).toBeInTheDocument();
  });

  it("reports only the id that was not there before", () => {
    const { rerender } = render(
      <StrictMode>
        <EnteringProbe ids={["a", "b"]} />
      </StrictMode>
    );

    rerender(
      <StrictMode>
        <EnteringProbe ids={["c", "a", "b"]} />
      </StrictMode>
    );

    expect(screen.getByText("entering:c")).toBeInTheDocument();
  });

  it("stops reporting an id once it has been seen", () => {
    const { rerender } = render(
      <StrictMode>
        <EnteringProbe ids={["a"]} />
      </StrictMode>
    );
    rerender(
      <StrictMode>
        <EnteringProbe ids={["b", "a"]} />
      </StrictMode>
    );
    expect(screen.getByText("entering:b")).toBeInTheDocument();

    // A refetch that returns the same rows must not re-animate them.
    rerender(
      <StrictMode>
        <EnteringProbe ids={["b", "a"]} />
      </StrictMode>
    );

    expect(screen.getByText("entering:none")).toBeInTheDocument();
  });
});

describe("useValueChanged", () => {
  it("is false on the first render", () => {
    render(
      <StrictMode>
        <ChangedProbe value="pending" />
      </StrictMode>
    );

    expect(screen.getByText("changed:false")).toBeInTheDocument();
  });

  it("is true on the render where the value differs", () => {
    const { rerender } = render(
      <StrictMode>
        <ChangedProbe value="pending" />
      </StrictMode>
    );

    rerender(
      <StrictMode>
        <ChangedProbe value="approved" />
      </StrictMode>
    );

    expect(screen.getByText("changed:true")).toBeInTheDocument();
  });

  it("is false again when the value is re-rendered unchanged", () => {
    const { rerender } = render(
      <StrictMode>
        <ChangedProbe value="pending" />
      </StrictMode>
    );
    rerender(
      <StrictMode>
        <ChangedProbe value="approved" />
      </StrictMode>
    );
    rerender(
      <StrictMode>
        <ChangedProbe value="approved" />
      </StrictMode>
    );

    expect(screen.getByText("changed:false")).toBeInTheDocument();
  });
});
