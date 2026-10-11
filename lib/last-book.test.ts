import { beforeEach, describe, expect, it } from "vitest";
import { lastBook } from "./last-book";

/** Um localStorage de mentira: o teste roda em node, e só precisa do contrato. */
function armazenamento() {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}

describe("o último livro é de uma conta, não do navegador", () => {
  beforeEach(() => {
    const ls = armazenamento();
    Object.assign(globalThis, { window: globalThis, localStorage: ls });
  });

  it("a conta B não lê o último livro da conta A", () => {
    lastBook.write("a", { slug: "o-estrangeiro", title: "O Estrangeiro" });
    expect(lastBook.read("a")?.slug).toBe("o-estrangeiro");
    expect(lastBook.read("b")).toBeNull();
  });

  it("a chave antiga, sem dono, é apagada em vez de aparecer para alguém", () => {
    localStorage.setItem("gume.ultimo-livro", JSON.stringify({ slug: "x", title: "X" }));
    expect(lastBook.read("nova")).toBeNull();
    expect(localStorage.getItem("gume.ultimo-livro")).toBeNull();
  });

  it("sair da conta esquece tudo", () => {
    lastBook.write("a", { slug: "a1", title: "A1" });
    lastBook.write("b", { slug: "b1", title: "B1" });
    localStorage.setItem("gume:pedido-de-apoio", "1");
    lastBook.esquecer();
    expect(lastBook.read("a")).toBeNull();
    expect(lastBook.read("b")).toBeNull();
    // Só as chaves do último livro: o resto do navegador não é dele.
    expect(localStorage.getItem("gume:pedido-de-apoio")).toBe("1");
  });
});
