"use client";

import { useEffect } from "react";
import { lastBook } from "@/lib/last-book";

/** Não desenha nada. Só lembra qual foi o último livro que você abriu. */
export function RememberBook({ userId, slug, title }: { userId: string; slug: string; title: string }) {
  useEffect(() => {
    lastBook.write(userId, { slug, title });
  }, [userId, slug, title]);

  return null;
}
