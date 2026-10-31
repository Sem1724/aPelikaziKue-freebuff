/** Salin teks dengan Clipboard API, dengan cadangan untuk browser lama. */
export async function salinTeks(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    /* lanjut ke cara lama */
  }
  try {
    const area = document.createElement("textarea");
    area.value = teks;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
