import React, { useState, useEffect } from "react";
import { 
  Plus, 
  X, 
  Loader2, 
  Shuffle 
} from "lucide-react";
import { inventoryService } from "../services/inventory";

type Location = {
  ubicacion_id: string;
  nombre: string;
  direccion: string;
  region: string;
  es_bodega: boolean;
};

type ProductCatalog = {
  producto_id: string;
  sku: string;
  nombre: string;
  marca: string;
  categoria: string;
  pulgadas?: number | null;
  descripcion?: string | null;
};

type Asset = {
  activo_id: string;
  producto_id: string;
  numero_serie: string;
  codigo_qr?: string | null;
  estado_actual: string;
  ubicacion_actual_id: string;
  producto?: ProductCatalog | null;
  ubicacion_actual?: Location | null;
};

type StockMovement = {
  movimiento_id: string;
  activo_id: string;
  ubicacion_origen_id: string | null;
  ubicacion_destino_id: string;
  motivo: string;
  creado_en: string;
  activo?: Asset | null;
};

export const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"locations" | "products" | "assets" | "movements">("assets");

  // Data States
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals Open State
  const [modalOpen, setModalOpen] = useState<"location" | "product" | "asset" | "movement" | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  // Location Form
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [locIsWarehouse, setLocIsWarehouse] = useState(false);

  // Product Form
  const [prodSku, setProdSku] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodBrand, setProdBrand] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodSize, setProdSize] = useState<number>(0);
  const [prodDesc, setProdDesc] = useState("");

  // Asset Form
  const [assetProductId, setAssetProductId] = useState("");
  const [assetSerial, setAssetSerial] = useState("");
  const [assetQrCode, setAssetQrCode] = useState("");
  const [assetStatus, setAssetStatus] = useState("NUEVO");
  const [assetLocationId, setAssetLocationId] = useState("");

  // Movement Form
  const [moveAssetId, setMoveAssetId] = useState("");
  const [moveDestId, setMoveDestId] = useState("");
  const [moveReason, setMoveReason] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [locsData, prodsData, assetsData, movesData] = await Promise.all([
        inventoryService.getLocations(),
        inventoryService.getProducts(),
        inventoryService.getAssets(),
        inventoryService.getMovements()
      ]);

      setLocations(locsData);
      setProducts(prodsData);
      setAssets(assetsData);
      setMovements(movesData.map((movement) => ({
        ...movement,
        ubicacion_origen_id: movement.ubicacion_origen_id ?? null
      })));
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al cargar datos de inventario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const closeModals = () => {
    setModalOpen(null);
    setModalError(null);
    // Clear forms
    setLocName(""); setLocAddress(""); setLocRegion(""); setLocIsWarehouse(false);
    setProdSku(""); setProdName(""); setProdBrand(""); setProdCategory(""); setProdSize(0); setProdDesc("");
    setAssetProductId(""); setAssetSerial(""); setAssetQrCode(""); setAssetStatus("NUEVO"); setAssetLocationId("");
    setMoveAssetId(""); setMoveDestId(""); setMoveReason("");
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await inventoryService.createLocation({
        nombre: locName,
        direccion: locAddress,
        region: locRegion,
        es_bodega: locIsWarehouse
      });
      closeModals();
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo crear la ubicación.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await inventoryService.createProduct({
        sku: prodSku,
        nombre: prodName,
        marca: prodBrand,
        categoria: prodCategory,
        pulgadas: prodSize ? Number(prodSize) : null,
        descripcion: prodDesc || null
      });
      closeModals();
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo registrar el producto.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await inventoryService.createAsset({
        producto_id: assetProductId,
        numero_serie: assetSerial,
        codigo_qr: assetQrCode || null,
        estado_actual: assetStatus,
        ubicacion_actual_id: assetLocationId
      });
      closeModals();
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo registrar el activo.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const selectedAsset = assets.find(a => a.activo_id === moveAssetId);
      await inventoryService.createMovement({
        activo_id: moveAssetId,
        ubicacion_origen_id: selectedAsset?.ubicacion_actual_id || null,
        ubicacion_destino_id: moveDestId,
        usuario_movimiento_id: "00000000-0000-0000-0000-000000000000", // Will be overwritten by backend using JWT user ID
        motivo: moveReason
      });
      closeModals();
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo registrar el movimiento.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="inventory-view animate-fade-in">
      {error && (
        <div className="badge error" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px" }}>
          {error}
        </div>
      )}

      {/* Tabs Header */}
      <div className="tabs-header">
        <button 
          className={`tab-btn ${activeTab === "assets" ? "active" : ""}`}
          onClick={() => setActiveTab("assets")}
        >
          Activos Seriados
        </button>
        <button 
          className={`tab-btn ${activeTab === "locations" ? "active" : ""}`}
          onClick={() => setActiveTab("locations")}
        >
          Bodegas y Tiendas
        </button>
        <button 
          className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Catálogo
        </button>
        <button 
          className={`tab-btn ${activeTab === "movements" ? "active" : ""}`}
          onClick={() => setActiveTab("movements")}
        >
          Movimientos de Stock
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
          <Loader2 className="spin" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div className="glass-panel card-container">
          
          {/* TAB 1: ASSETS */}
          {activeTab === "assets" && (
            <>
              <div className="panel-title">
                <span>Inventario de Activos Físicos</span>
                <button className="btn-primary" onClick={() => setModalOpen("asset")}>
                  <Plus size={16} />
                  <span>Registrar Activo</span>
                </button>
              </div>

              <div className="table-responsive">
                {assets.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay activos registrados en bodega.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Modelo / Producto</th>
                        <th>N° Serie</th>
                        <th>Código QR</th>
                        <th>Ubicación Actual</th>
                        <th>Estado Físico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.activo_id}>
                          <td style={{ fontWeight: 600 }}>{asset.producto?.nombre} ({asset.producto?.marca})</td>
                          <td>{asset.numero_serie}</td>
                          <td><code>{asset.codigo_qr || "Sin QR"}</code></td>
                          <td>{asset.ubicacion_actual?.nombre}</td>
                          <td>
                            <span className={`badge ${
                              asset.estado_actual === "NUEVO" ? "primary" : 
                              asset.estado_actual === "USADO_BUEN_ESTADO" ? "success" : 
                              asset.estado_actual === "DEFECTUOSO" ? "error" : "warning"
                            }`}>
                              {asset.estado_actual}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* TAB 2: LOCATIONS */}
          {activeTab === "locations" && (
            <>
              <div className="panel-title">
                <span>Bodegas, Centros de Distribución y Tiendas</span>
                <button className="btn-primary" onClick={() => setModalOpen("location")}>
                  <Plus size={16} />
                  <span>Crear Ubicación</span>
                </button>
              </div>

              <div className="table-responsive">
                {locations.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay ubicaciones registradas.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Ubicación</th>
                        <th>Dirección</th>
                        <th>Región</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc) => (
                        <tr key={loc.ubicacion_id}>
                          <td style={{ fontWeight: 600 }}>{loc.nombre}</td>
                          <td>{loc.direccion}</td>
                          <td>{loc.region}</td>
                          <td>
                            <span className={`badge ${loc.es_bodega ? "success" : "primary"}`}>
                              {loc.es_bodega ? "Bodega" : "Punto de Venta"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* TAB 3: PRODUCTS CATALOG */}
          {activeTab === "products" && (
            <>
              <div className="panel-title">
                <span>Catálogo de Equipamiento</span>
                <button className="btn-primary" onClick={() => setModalOpen("product")}>
                  <Plus size={16} />
                  <span>Nuevo Producto</span>
                </button>
              </div>

              <div className="table-responsive">
                {products.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    El catálogo está vacío.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Nombre</th>
                        <th>Marca</th>
                        <th>Categoría</th>
                        <th>Tamaño (pulgadas)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod) => (
                        <tr key={prod.producto_id}>
                          <td><code>{prod.sku}</code></td>
                          <td style={{ fontWeight: 600 }}>{prod.nombre}</td>
                          <td>{prod.marca}</td>
                          <td>{prod.categoria}</td>
                          <td>{prod.pulgadas ? `${prod.pulgadas}"` : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* TAB 4: MOVEMENTS */}
          {activeTab === "movements" && (
            <>
              <div className="panel-title">
                <span>Bitácora de Movimientos de Stock</span>
                <button className="btn-primary" onClick={() => setModalOpen("movement")}>
                  <Shuffle size={16} />
                  <span>Trasladar Activo</span>
                </button>
              </div>

              <div className="table-responsive">
                {movements.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay traslados de activos registrados.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Activo (Modelo/Serie)</th>
                        <th>Ubicación Origen</th>
                        <th>Ubicación Destino</th>
                        <th>Motivo del Traslado</th>
                        <th>Fecha y Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((move) => {
                        const originLoc = locations.find(l => l.ubicacion_id === move.ubicacion_origen_id);
                        const destLoc = locations.find(l => l.ubicacion_id === move.ubicacion_destino_id);
                        return (
                          <tr key={move.movimiento_id}>
                            <td style={{ fontWeight: 600 }}>
                              {move.activo?.producto?.nombre} ({move.activo?.numero_serie})
                            </td>
                            <td>{originLoc ? originLoc.nombre : "Inicial / Carga"}</td>
                            <td>{destLoc ? destLoc.nombre : "N/A"}</td>
                            <td>{move.motivo}</td>
                            <td>{new Date(move.creado_en).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

        </div>
      )}

      {/* --- FORM MODALS --- */}

      {/* Create Location Modal */}
      {modalOpen === "location" && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={closeModals}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Crear Nueva Ubicación</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleCreateLocation}>
              <div className="form-group">
                <label>Nombre de la Ubicación</label>
                <input type="text" className="glass-input" placeholder="Bodega M3storage - Enea" value={locName} onChange={e=>setLocName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Dirección Física</label>
                <input type="text" className="glass-input" placeholder="Av. Américo Vespucio 1234" value={locAddress} onChange={e=>setLocAddress(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Región</label>
                <input type="text" className="glass-input" placeholder="Región Metropolitana" value={locRegion} onChange={e=>setLocRegion(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", margin: "15px 0" }}>
                <input type="checkbox" id="is_wh" checked={locIsWarehouse} onChange={e=>setLocIsWarehouse(e.target.checked)} />
                <label htmlFor="is_wh">¿Es una bodega/centro de distribución principal?</label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={closeModals}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {modalOpen === "product" && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={closeModals}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Registrar Producto en Catálogo</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleCreateProduct}>
              <div className="form-row">
                <div className="form-group">
                  <label>Código SKU</label>
                  <input type="text" className="glass-input" placeholder="MON-SAM-65" value={prodSku} onChange={e=>setProdSku(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Marca</label>
                  <input type="text" className="glass-input" placeholder="Samsung" value={prodBrand} onChange={e=>setProdBrand(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Nombre Comercial</label>
                <input type="text" className="glass-input" placeholder="Monitor Profesional 65 pulgadas" value={prodName} onChange={e=>setProdName(e.target.value)} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <input type="text" className="glass-input" placeholder="Monitores" value={prodCategory} onChange={e=>setProdCategory(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Tamaño (pulgadas)</label>
                  <input type="number" className="glass-input" placeholder="65" value={prodSize || ""} onChange={e=>setProdSize(Number(e.target.value))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Descripción del Equipo</label>
                <textarea className="glass-input" placeholder="Especificaciones adicionales..." value={prodDesc} onChange={e=>setProdDesc(e.target.value)} style={{ minHeight: "80px", resize: "none" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={closeModals}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Asset Modal */}
      {modalOpen === "asset" && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={closeModals}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Registrar Activo Físico (Serie)</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleCreateAsset}>
              <div className="form-group">
                <label>Producto en Catálogo</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={assetProductId} onChange={e=>setAssetProductId(e.target.value)} required>
                  <option value="">Selecciona un modelo...</option>
                  {products.map(p=><option key={p.producto_id} value={p.producto_id}>{p.nombre} ({p.marca})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Número de Serie</label>
                  <input type="text" className="glass-input" placeholder="SN-888999" value={assetSerial} onChange={e=>setAssetSerial(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Código QR / Código Barras</label>
                  <input type="text" className="glass-input" placeholder="QR-MARCOM-101" value={assetQrCode} onChange={e=>setAssetQrCode(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Ubicación Inicial</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={assetLocationId} onChange={e=>setAssetLocationId(e.target.value)} required>
                  <option value="">Selecciona ubicación...</option>
                  {locations.map(l=><option key={l.ubicacion_id} value={l.ubicacion_id}>{l.nombre}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Estado Inicial del Activo</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={assetStatus} onChange={e=>setAssetStatus(e.target.value)}>
                  <option value="NUEVO">NUEVO</option>
                  <option value="USADO_BUEN_ESTADO">USADO EN BUEN ESTADO</option>
                  <option value="DEFECTUOSO">DEFECTUOSO</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={closeModals}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Movement Modal */}
      {modalOpen === "movement" && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={closeModals}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Registrar Traslado de Stock</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleCreateMovement}>
              <div className="form-group">
                <label>Activo a Trasladar</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={moveAssetId} onChange={e=>setMoveAssetId(e.target.value)} required>
                  <option value="">Selecciona el activo (N° Serie)...</option>
                  {assets.map(a=><option key={a.activo_id} value={a.activo_id}>{a.producto?.nombre} - SN: {a.numero_serie} (en {a.ubicacion_actual?.nombre})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Bodega / Ubicación Destino</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={moveDestId} onChange={e=>setMoveDestId(e.target.value)} required>
                  <option value="">Selecciona destino...</option>
                  {locations.map(l=><option key={l.ubicacion_id} value={l.ubicacion_id}>{l.nombre}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Motivo del Traslado</label>
                <input type="text" className="glass-input" placeholder="Instalación local nuevo / Traslado por falla" value={moveReason} onChange={e=>setMoveReason(e.target.value)} required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={closeModals}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Registrar Movimiento</button>
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
export default Inventory;
