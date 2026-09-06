'use client';
export function PrintButton() {
  return <button className="buy" onClick={() => window.print()}>Stampa / PDF</button>;
}
