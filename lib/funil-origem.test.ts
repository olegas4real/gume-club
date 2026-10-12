import { describe, it, expect } from "vitest";
import { normalizarOrigem } from "@/lib/funil";

describe("as origens dos posts de lançamento", () => {
  it.each([
    ["instagram", "instagram"],
    ["ig", "instagram"],
    ["https://l.instagram.com/", "instagram"],
    ["threads", "threads"],
    ["https://www.threads.net/@marina", "threads"],
    ["tiktok", "tiktok"],
    ["https://vm.tiktok.com/abc", "tiktok"],
    ["linkedin", "linkedin"],
    ["https://lnkd.in/xyz", "linkedin"],
    ["fb", "facebook"],
  ])("%s vira %s", (bruto, balde) => expect(normalizarOrigem(bruto)).toBe(balde));
});
