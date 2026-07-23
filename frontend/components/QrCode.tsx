"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div className="rounded-control bg-border/40" style={{ width: size, height: size }} />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image doesn't apply here
  return <img src={dataUrl} alt="Ticket QR code" width={size} height={size} className="rounded-control" />;
}
