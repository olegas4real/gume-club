import { describe, it, expect } from "vitest";
import { destinoSeguro, comVolta } from "@/lib/volta";
import { navegadorInterno } from "@/lib/navegador-interno";

describe("voltar depois de entrar", () => {
  it("volta para o livro, o perfil ou o apoio", () => {
    expect(destinoSeguro("/livro/dom-casmurro")).toBe("/livro/dom-casmurro");
    expect(destinoSeguro("/@marina")).toBe("/@marina");
    expect(destinoSeguro("/apoiar")).toBe("/apoiar");
  });

  it.each(["https://golpe.com", "//golpe.com", "/\\golpe.com", "javascript:alert(1)", "", null, "/entrar?novo=1", "/api/exportar"])(
    "%s não é destino: vira a home",
    (v) => expect(destinoSeguro(v)).toBe("/"),
  );

  it("monta o link com a volta, e sem ela quando não há para onde voltar", () => {
    expect(comVolta("/entrar?novo=1", "/livro/x")).toBe("/entrar?novo=1&volta=%2Flivro%2Fx");
    expect(comVolta("/entrar", "/apoiar")).toBe("/entrar?volta=%2Fapoiar");
    expect(comVolta("/entrar?novo=1", "/")).toBe("/entrar?novo=1");
  });
});

describe("o navegador de dentro dos apps", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0", "Instagram"],
    ["Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]", "Facebook"],
    ["Mozilla/5.0 (iPhone) Mobile/15E148 musical_ly_36.0 BytedanceWebview/d8a21c6", "TikTok"],
    ["Mozilla/5.0 (iPhone) Mobile/15E148 Barcelona 350.0.0", "Threads"],
    ["Mozilla/5.0 (iPhone) Mobile/15E148 [LinkedInApp]", "LinkedIn"],
  ])("reconhece %s", (ua, app) => expect(navegadorInterno(ua)).toBe(app));

  it("Safari e Chrome de verdade não são navegador interno", () => {
    expect(navegadorInterno("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBeNull();
    expect(navegadorInterno("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36")).toBeNull();
  });
});
