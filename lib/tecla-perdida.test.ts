import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { teclaPerdida } from "@/lib/tecla-perdida";

const tecla = (key: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...mods,
});

describe("a letra que chega antes do foco do ⌘K", () => {
  it("quem digita 'dom' logo depois do atalho recebe 'dom' no campo", () => {
    let campo = "";
    for (const k of "dom") campo += teclaPerdida(tecla(k), false) ?? "";
    expect(campo).toBe("dom");
  });

  it("acento, espaço e número também são texto", () => {
    expect(["é", " ", "1", "ç"].map((k) => teclaPerdida(tecla(k), false))).toEqual(["é", " ", "1", "ç"]);
  });

  it("atalho e tecla de navegação não viram texto", () => {
    expect(teclaPerdida(tecla("k", { metaKey: true }), false)).toBeNull();
    expect(teclaPerdida(tecla("n", { ctrlKey: true }), false)).toBeNull();
    expect(teclaPerdida(tecla("ArrowDown"), false)).toBeNull();
    expect(teclaPerdida(tecla("Enter"), false)).toBeNull();
  });

  it("com o foco já no campo, quem cuida é o campo: nada é escrito duas vezes", () => {
    expect(teclaPerdida(tecla("a"), true)).toBeNull();
  });

  it("o foco da paleta não volta para um setTimeout", () => {
    const fonte = readFileSync("components/command.tsx", "utf8");
    expect(fonte).not.toMatch(/setTimeout\(\(\) => input\.current\?\.focus\(\)/);
    expect(fonte).toContain("useLayoutEffect");
    expect(fonte).toContain("teclaPerdida(");
  });
});
