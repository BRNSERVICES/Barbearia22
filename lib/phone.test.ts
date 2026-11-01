import { describe, expect, it } from "vitest";
import { waLink } from "./phone";
import { confirmationMessage } from "./whatsapp";

describe("waLink", () => {
  it("acrescenta 55 quando o número vem só com DDD", () => {
    expect(waLink("(11) 90000-0000", "oi")).toBe("https://wa.me/5511900000000?text=oi");
  });
  it("mantém o 55 quando já existe", () => {
    expect(waLink("5511900000000", "oi")).toContain("wa.me/5511900000000");
  });
  it("devolve null sem número válido", () => {
    expect(waLink(null, "oi")).toBeNull();
    expect(waLink("123", "oi")).toBeNull();
  });
});

describe("confirmationMessage", () => {
  it("monta a mensagem em horário de Brasília", () => {
    const m = confirmationMessage({ customer: "João Silva", shop: "Barbearia 22", service: "Corte", professional: "Davi", startsAt: "2026-11-02T17:30:00.000Z" });
    expect(m).toContain("Olá, João!");
    expect(m).toContain("14:30");
    expect(m).toContain("Corte com Davi");
  });
});
