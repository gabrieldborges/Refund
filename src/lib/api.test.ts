import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { getApiErrorMessage, getApiRequestId } from "./api";

// Builds the error shape axios hands to a catch block, with an RFC 9457 body.
function problemError(body: unknown, status = 422): AxiosError {
  const error = new AxiosError("Request failed");
  error.response = {
    data: body,
    status,
    statusText: "",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe("getApiErrorMessage", () => {
  it("reads detail from a problem document", () => {
    expect(
      getApiErrorMessage(problemError({ detail: "Only pending refunds can be deleted" }))
    ).toBe("Only pending refunds can be deleted");
  });

  // REGRESSION GUARD for the format the API STOPPED sending. If validation
  // errors ever arrive as a list again, this must not silently show a generic
  // message — the fallback here is the honest outcome, and the test exists so
  // the change is visible rather than quiet.
  it("falls back when detail is not a string", () => {
    expect(getApiErrorMessage(problemError({ detail: [{ msg: "Field required" }] }))).toBe(
      "Algo deu errado. Tente novamente."
    );
  });

  it("falls back for something that is not an axios error", () => {
    expect(getApiErrorMessage(new Error("boom"))).toBe("Algo deu errado. Tente novamente.");
  });

  it("falls back when there is no response body at all", () => {
    expect(getApiErrorMessage(new AxiosError("Network Error"))).toBe(
      "Algo deu errado. Tente novamente."
    );
  });
});

describe("getApiRequestId", () => {
  // The id is what makes a 500 reportable: the user quotes it and it matches a
  // server log line.
  it("reads request_id from a problem document", () => {
    expect(getApiRequestId(problemError({ detail: "x", request_id: "abc-123" }))).toBe("abc-123");
  });

  it("returns undefined when the body has no request_id", () => {
    expect(getApiRequestId(problemError({ detail: "x" }))).toBeUndefined();
  });
});
