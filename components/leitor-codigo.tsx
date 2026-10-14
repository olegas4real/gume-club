"use client";

import { useEffect, useRef, useState } from "react";
import { ScanBarcode, X } from "lucide-react";
import { isbnDoCodigo } from "@/lib/isbn-lido";

/**
 * ════════════════════════════════════════════════════════════════════
 *  O LEITOR DE CÓDIGO DE BARRAS. A câmera na contracapa, e mais nada.
 *
 *  O leitor tem o livro físico na mão, e o ISBN está impresso nele. Digitar trinta
 *  títulos é o que faz a pessoa parar no sétimo; apontar a câmera trinta vezes vira jogo
 *  (Openreads e Bibliotheca têm, e o Bibliotheca tem um "modo rápido" de vários seguidos).
 *
 *  ═══ SÓ ONDE O NAVEGADOR SABE LER ═══
 *
 *  Usa o `BarcodeDetector` do próprio navegador: sem biblioteca, sem nada baixado. O
 *  Chrome do Android tem; o Safari do iPhone e o Firefox, não. Onde não tem, o botão NÃO
 *  APARECE, e a busca por texto continua ali como sempre. Ninguém vê um botão quebrado.
 *
 *  ═══ NÃO É UM FLUXO NOVO ═══
 *
 *  Ele só entrega o ISBN para quem o chamou. Na busca, o ISBN vira a busca (que já acha
 *  livro por ISBN). No modo `varios`, em /importar, cada livro lido vira uma linha da
 *  lista colada, e segue o caminho dela: prévia, conferir, gravar.
 *
 *  Câmera negada não é erro: a pessoa pode digitar. E a câmera desliga ao fechar.
 * ════════════════════════════════════════════════════════════════════
 */

type Detector = { detect: (fonte: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = {
  new (opcoes: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

function detectorDoNavegador(): DetectorCtor | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector) ?? null;
}

export function LeitorCodigo({
  onLido,
  varios = false,
  rotulo = "ler o código de barras",
  className = "",
}: {
  onLido: (isbn: string) => void;
  /** Modo rápido: a câmera fica aberta, e cada livro novo é entregue. */
  varios?: boolean;
  rotulo?: string;
  className?: string;
}) {
  const [pode, setPode] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [lidos, setLidos] = useState<string[]>([]);
  const [semCamera, setSemCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  // Numa referência, e não nas dependências do efeito: quem chama passa uma função nova
  // a cada renderização, e cada livro lido reiniciaria a câmera.
  const entregar = useRef(onLido);
  entregar.current = onLido;

  // Depois de montar: o servidor não sabe em que navegador a página vai abrir.
  useEffect(() => {
    const D = detectorDoNavegador();
    if (!D || !navigator.mediaDevices?.getUserMedia) return;
    (D.getSupportedFormats?.() ?? Promise.resolve(["ean_13"]))
      .then((f) => setPode(f.includes("ean_13")))
      .catch(() => setPode(false));
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const D = detectorDoNavegador();
    if (!D) return;

    let vivo = true;
    let fluxo: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const vistos = new Set<string>();
    const detector = new D({ formats: ["ean_13"] });

    const procurar = async () => {
      if (!vivo || !video.current) return;
      try {
        for (const c of await detector.detect(video.current)) {
          const isbn = isbnDoCodigo(c.rawValue);
          if (!isbn || vistos.has(isbn)) continue;
          vistos.add(isbn);
          navigator.vibrate?.(40);
          entregar.current(isbn);
          if (!varios) {
            setAberto(false);
            return;
          }
          setLidos((l) => [...l, isbn]);
        }
      } catch {
        // Um quadro que não deu para ler. O próximo tenta de novo.
      }
      if (vivo) timer = setTimeout(procurar, 250);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (!vivo) return s.getTracks().forEach((t) => t.stop());
        fluxo = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().then(procurar).catch(() => {});
        }
      })
      .catch(() => {
        setSemCamera(true);
        setAberto(false);
      });

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
      fluxo?.getTracks().forEach((t) => t.stop());
    };
  }, [aberto, varios]);

  if (!pode) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSemCamera(false);
          setLidos([]);
          setAberto(true);
        }}
        className={`inline-flex items-center gap-2 text-[13px] text-[var(--color-ink-soft)] underline decoration-[var(--color-rule)] underline-offset-4 hover:text-[var(--color-ink)] ${className}`}
      >
        <ScanBarcode size={15} strokeWidth={1.5} aria-hidden />
        {rotulo}
      </button>
      {semCamera && (
        <p className="mt-2 text-[12px] text-[var(--color-ink-faint)]">
          Sem a câmera, dá para digitar o ISBN: ele está na contracapa.
        </p>
      )}

      {aberto && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black" role="dialog" aria-label="ler o código de barras">
          <video ref={video} playsInline muted className="h-full w-full object-cover" />
          {/* A moldura de onde apontar. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-32 -translate-y-1/2 rounded-2xl border-2 border-white/70" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-white">
            <p className="text-[14px]">
              {varios
                ? lidos.length === 0
                  ? "Aponte para o código de barras, um livro de cada vez."
                  : `${lidos.length} ${lidos.length === 1 ? "livro lido" : "livros lidos"}. Pode passar o próximo.`
                : "Aponte para o código de barras, na contracapa."}
            </p>
            <button type="button" onClick={() => setAberto(false)} aria-label="fechar" className="p-2">
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          {varios && (
            <div className="absolute inset-x-0 bottom-0 p-5">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="w-full rounded-[var(--radius-control)] bg-white px-4 py-3 text-[15px] font-medium text-black"
              >
                {lidos.length === 0 ? "Fechar" : "Pronto"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
