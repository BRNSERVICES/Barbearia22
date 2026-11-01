import { describe, expect, it } from "vitest";
import { bookingMessage, bookingUrl } from "./booking-link";

describe("booking-link", () => {
  it("monta o endereço público", () => {
    expect(bookingUrl("https://x.vercel.app", "barbearia22")).toBe("https://x.vercel.app/b/barbearia22");
  });
  it("personaliza com o primeiro nome", () => {
    const m = bookingMessage("Barbearia 22", "https://x/b/s", "Maria Souza");
    expect(m).toContain("Olá, Maria!");
    expect(m).toContain("https://x/b/s");
  });
  it("funciona sem nome", () => {
    expect(bookingMessage("Barbearia 22", "https://x/b/s")).toMatch(/^Olá! /);
  });
});
