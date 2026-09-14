/** Ticks "redondos" (1, 2, 2,5, 5 × 10ⁿ) que cubren [min, max]. */
export function ticksLimpios(min: number, max: number, objetivo = 4): number[] {
  if (min === max) {
    const margen = Math.abs(min) * 0.05 || 1;
    min -= margen;
    max += margen;
  }
  const bruto = (max - min) / objetivo;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)!;
  const inicio = Math.floor(min / paso) * paso;
  const fin = Math.ceil(max / paso) * paso;
  const ticks: number[] = [];
  for (let v = inicio; v <= fin + paso / 2; v += paso) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export function escalaLineal(dominio: [number, number], rango: [number, number]) {
  const [d0, d1] = dominio;
  const [r0, r1] = rango;
  const ancho = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / ancho) * (r1 - r0);
}
