import { useState } from "react";

type Dolar = {
  nombre: string;
  venta: number;
  fechaActualizacion: string;
};

const Dolar = () => {
  const [dolar, setDolar] = useState<Dolar | null>(null);
  const [error, setError] = useState("");

  const mostrarDolares = async () => {
    try {
      setError("");
      const response = await fetch("https://cl.dolarapi.com/v1/cotizaciones/usd");
      if (!response.ok) throw new Error("No se pudo obtener la información");

      const data: Dolar = await response.json();
      setDolar(data);
    } catch {
      setError("Ocurrió un error al cargar los dólares.");
    }
  };

  return (
    <main>
      <h1>Dólares</h1>
      <button onClick={mostrarDolares}>Mostrar dólares</button>

      {error && <p>{error}</p>}

      {dolar && (
        <p>
          <strong>{dolar.nombre}</strong> — Venta: ${dolar.venta} — Actualizado: {new Date(dolar.fechaActualizacion).toLocaleString("es-CL")}
        </p>
      )}
    </main>
  );
};

export default Dolar;