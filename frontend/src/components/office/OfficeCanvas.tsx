"use client";
import { PixelOffice } from "./PixelOffice";

export function OfficeCanvas() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
      <PixelOffice />
    </div>
  );
}
