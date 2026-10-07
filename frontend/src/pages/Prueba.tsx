import { useState } from "react";

type Usuario = {
  id: number;
  name: string;
  email: string;
};

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState("");

  const mostrarUsuarios = async () => {
    try {
      setError("");
      const response = await fetch("https://jsonplaceholder.typicode.com/users");
      if (!response.ok) throw new Error("No se pudo obtener la información");

      const data: Usuario[] = await response.json();
      setUsuarios(data);
    } catch {
      setError("Ocurrió un error al cargar los usuarios.");
    }
  };

  return (
    <main>
      <h1>Usuarios</h1>
      <button onClick={mostrarUsuarios}>Mostrar usuarios</button>

      {error && <p>{error}</p>}

      <ul>
        {usuarios.map((usuario) => (
          <li key={usuario.id}>
            <strong>{usuario.id}</strong> — {usuario.name} - {usuario.email}
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Usuarios;