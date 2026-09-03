import React, { useState, useEffect } from "react";
import { Plus, X, Loader2, Users as UsersIcon, Edit2, Trash2, AlertCircle, Search, Filter, UserMinus, UserCheck, CheckCircle2 } from "lucide-react";
import { authService } from "../services/auth";
import type { Usuario } from "../services/auth";

export const Users: React.FC = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loggedUserJson = localStorage.getItem("marcom_user");
  const loggedUser = loggedUserJson ? JSON.parse(loggedUserJson) : null;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields State
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Usuario["rol"]>("CLIENTE_ESTANDAR");
  const [isActive, setIsActive] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || "Error al cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setModalType("create");
    setSelectedUser(null);
    setRut("");
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setRole("CLIENTE_ESTANDAR");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: Usuario) => {
    setModalType("edit");
    setSelectedUser(user);
    setRut(user.rut);
    setEmail(user.correo);
    setPassword(""); // Keep password empty by default
    setFirstName(user.nombre);
    setLastName(user.apellido);
    setRole(user.rol);
    setIsActive(user.activo);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    // Basic Validations
    if (modalType === "create" && !password) {
      setModalError("La contraseña es requerida para nuevos usuarios.");
      setModalLoading(false);
      return;
    }

    try {
      if (modalType === "create") {
        await authService.createUser({
          rut,
          correo: email,
          clave: password,
          nombre: firstName,
          apellido: lastName,
          rol: role,
          activo: isActive
        });
        setSuccessMessage(`Usuario ${firstName} ${lastName} creado exitosamente.`);
      } else if (modalType === "edit" && selectedUser) {
        const updatePayload: any = {
          rut,
          correo: email,
          nombre: firstName,
          apellido: lastName,
          rol: role,
          activo: isActive
        };
        // Only send password if it was entered
        if (password.trim() !== "") {
          updatePayload.clave = password;
        }

        await authService.updateUser(selectedUser.usuario_id, updatePayload);
        setSuccessMessage(`Usuario ${firstName} ${lastName} actualizado exitosamente.`);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo guardar el usuario.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteUser = async (user: Usuario) => {
    if (loggedUser && loggedUser.usuario_id === user.usuario_id) {
      setError("No puedes eliminar tu propia cuenta de administrador mientras estás en la sesión actual.");
      return;
    }

    const confirmMsg = `¿Estás seguro de que deseas eliminar permanentemente la cuenta de ${user.nombre} ${user.apellido} (${user.correo})? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setError(null);
      setSuccessMessage(null);
      await authService.deleteUser(user.usuario_id);
      setSuccessMessage(`La cuenta de ${user.nombre} ${user.apellido} ha sido eliminada correctamente.`);
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || `No se pudo eliminar al usuario.`);
    }
  };

  // Filter & Search Logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.rut.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "" || user.rol === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="users-view animate-fade-in">
      <div className="glass-panel card-container">
        <div className="panel-title">
          <span>Gestión de Usuarios y Cuentas de Acceso</span>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Crear Usuario</span>
          </button>
        </div>

        {/* Search and Filters bar */}
        <div className="filters-bar" style={{ display: "flex", gap: "15px", marginBottom: "25px", flexWrap: "wrap" }}>
          <div className="search-input-wrapper" style={{ flexGrow: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              className="glass-input"
              style={{ width: "100%", paddingLeft: "42px" }}
              placeholder="Buscar por Nombre, Apellido, RUT o Correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-wrapper" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "hsl(var(--text-muted))", display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={16} />
              <span>Rol:</span>
            </span>
            <select
              className="glass-input"
              style={{ padding: "10px 16px", cursor: "pointer" }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Todos los Roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="JEFE_BODEGA">Jefe de Bodega</option>
              <option value="TECNICO_TERRENO">Técnico en Terreno</option>
              <option value="CLIENTE_CONVENIO">Cliente Convenio</option>
              <option value="CLIENTE_ESTANDAR">Cliente Estándar</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="badge error" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", boxSizing: "border-box" }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="table-responsive">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 className="spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "35px" }}>
              No se encontraron usuarios que coincidan con la búsqueda.
            </p>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>RUT</th>
                  <th>Correo electrónico</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha de Registro</th>
                  <th style={{ textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.usuario_id}>
                    <td style={{ fontWeight: 600 }}>{user.nombre} {user.apellido}</td>
                    <td>{user.rut}</td>
                    <td>{user.correo}</td>
                    <td>
                      <span className={`badge ${
                        user.rol === "ADMIN" ? "primary" : 
                        user.rol === "JEFE_BODEGA" ? "warning" : 
                        "secondary"
                      }`}>
                        {user.rol.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.activo ? "success" : "error"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {user.activo ? <UserCheck size={12} /> : <UserMinus size={12} />}
                        {user.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>{new Date(user.creado_en).toLocaleDateString('es-CL')}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "8px 12px" }}
                          onClick={() => openEditModal(user)}
                          title="Editar Usuario"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn-logout" 
                          style={{ padding: "8px 12px" }}
                          onClick={() => handleDeleteUser(user)}
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "600px" }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }} className="accent-text-gradient">
              <UsersIcon size={20} />
              <span>{modalType === "create" ? "Nuevo Usuario" : "Editar Usuario"}</span>
            </h3>

            {modalError && (
              <div className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", boxSizing: "border-box" }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="Pérez"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>RUT</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="12.345.678-9"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    className="glass-input"
                    placeholder="juan.perez@marcom.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rol de Usuario</label>
                  <select
                    className="glass-input"
                    style={{ cursor: "pointer" }}
                    value={role}
                    onChange={(e) => setRole(e.target.value as Usuario["rol"])}
                    required
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="JEFE_BODEGA">Jefe de Bodega</option>
                    <option value="TECNICO_TERRENO">Técnico en Terreno</option>
                    <option value="CLIENTE_CONVENIO">Cliente Convenio</option>
                    <option value="CLIENTE_ESTANDAR">Cliente Estándar</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    className="glass-input"
                    placeholder={modalType === "create" ? "••••••••" : "Dejar en blanco para no cambiar"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={modalType === "create"}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: "10px 0 30px 0", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="user-active-checkbox"
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="user-active-checkbox" style={{ cursor: "pointer", color: "hsl(var(--text-primary))", fontSize: "0.95rem" }}>
                  Usuario Activo (Permitir acceso al sistema)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{modalType === "create" ? "Registrar" : "Guardar Cambios"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Users;
