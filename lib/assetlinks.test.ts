import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { GET } from "@/app/.well-known/assetlinks.json/route";

/**
 * O vínculo entre o site e o app Android. Ver app/.well-known/assetlinks.json/route.ts:
 * sem as variáveis a rota não existe, e com elas o JSON tem o formato EXATO que o
 * verificador do Android espera (array na raiz, fingerprints no plural).
 */
const antes = {
  pacote: process.env.ANDROID_PACKAGE_NAME,
  certs: process.env.ANDROID_CERT_SHA256,
};

beforeEach(() => {
  delete process.env.ANDROID_PACKAGE_NAME;
  delete process.env.ANDROID_CERT_SHA256;
});

afterAll(() => {
  if (antes.pacote !== undefined) process.env.ANDROID_PACKAGE_NAME = antes.pacote;
  if (antes.certs !== undefined) process.env.ANDROID_CERT_SHA256 = antes.certs;
});

describe("o assetlinks.json", () => {
  it("sem as variáveis, a rota não existe: instância sem app não muda em nada", () => {
    expect(GET().status).toBe(404);
  });

  it("só uma das duas também é 404: meio vínculo não é vínculo", () => {
    process.env.ANDROID_PACKAGE_NAME = "club.exemplo.app";
    expect(GET().status).toBe(404);
  });

  it("com as duas, devolve o formato exato, e a vírgula vira lista", async () => {
    process.env.ANDROID_PACKAGE_NAME = "club.exemplo.app";
    process.env.ANDROID_CERT_SHA256 = "aa:bb:cc, dd:ee:ff";

    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const corpo = await res.json();
    expect(corpo).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "club.exemplo.app",
          sha256_cert_fingerprints: ["AA:BB:CC", "DD:EE:FF"],
        },
      },
    ]);
  });
});
