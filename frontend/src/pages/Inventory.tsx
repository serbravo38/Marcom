import React, { useState, useEffect } from "react";
import { 
  Plus, 
  X, 
  Loader2, 
  Shuffle 
} from "lucide-react";
import { 
  inventoryService, 
  type Location, 
  type ProductCatalog, 
  type Asset, 
  type StockMovement 
} from "../services/inventory";

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
      setMovements(movesData);
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
        name: locName,
        address: locAddress,
        region: locRegion,
        is_warehouse: locIsWarehouse
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
        name: prodName,
        brand: prodBrand,
        category: prodCategory,
        size_inches: prodSize ? Number(prodSize) : null,
        description: prodDesc || null
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
        product_id: assetProductId,
        serial_number: assetSerial,
        qr_code: assetQrCode || null,
        current_status: assetStatus,
        current_location_id: assetLocationId
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
      const selectedAsset = assets.find(a => a.asset_id === moveAssetId);
      await inventoryService.createMovement({
        asset_id: moveAssetId,
        origin_location_id: selectedAsset?.current_location_id || null,
        destination_location_id: moveDestId,
        moved_by_user_id: "00000000-0000-0000-0000-000000000000", // Will be overwritten by backend using JWT user ID
        reason: moveReason
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
                        <tr key={asset.asset_id}>
                          <td style={{ fontWeight: 600 }}>{asset.product?.name} ({asset.product?.brand})</td>
                          <td>{asset.serial_number}</td>
                          <td><code>{asset.qr_code || "Sin QR"}</code></td>
                          <td>{asset.current_location?.name}</td>
                          <td>
                            <span className={`badge ${
                              asset.current_status === "NUEVO" ? "primary" : 
                              asset.current_status === "USADO_BUEN_ESTADO" ? "success" : 
                              asset.current_status === "DEFECTUOSO" ? "error" : "warning"
                            }`}>
                              {asset.current_status}
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
                        <tr key={loc.location_id}>
                          <td style={{ fontWeight: 600 }}>{loc.name}</td>
                          <td>{loc.address}</td>
                          <td>{loc.region}</td>
                          <td>
                            <span className={`badge ${loc.is_warehouse ? "success" : "primary"}`}>
                              {loc.is_warehouse ? "Bodega" : "Punto de Venta"}
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
                        <tr key={prod.product_id}>
                          <td><code>{prod.sku}</code></td>
                          <td style={{ fontWeight: 600 }}>{prod.name}</td>
                          <td>{prod.brand}</td>
                          <td>{prod.category}</td>
                          <td>{prod.size_inches ? `${prod.size_inches}"` : "N/A"}</td>
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
                        const originLoc = locations.find(l => l.location_id === move.origin_location_id);
                        const destLoc = locations.find(l => l.location_id === move.destination_location_id);
                        return (
                          <tr key={move.movement_id}>
                            <td style={{ fontWeight: 600 }}>
                              {move.asset?.product?.name} ({move.asset?.serial_number})
                            </td>
                            <td>{originLoc ? originLoc.name : "Inicial / Carga"}</td>
                            <td>{destLoc ? destLoc.name : "N/A"}</td>
                            <td>{move.reason}</td>
                            <td>{new Date(move.created_at).toLocaleString()}</td>
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
                  {products.map(p=><option key={p.product_id} value={p.product_id}>{p.name} ({p.brand})</option>)}
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
                  {locations.map(l=><option key={l.location_id} value={l.location_id}>{l.name}</option>)}
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
                  {assets.map(a=><option key={a.asset_id} value={a.asset_id}>{a.product?.name} - SN: {a.serial_number} (en {a.current_location?.name})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Bodega / Ubicación Destino</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={moveDestId} onChange={e=>setMoveDestId(e.target.value)} required>
                  <option value="">Selecciona destino...</option>
                  {locations.map(l=><option key={l.location_id} value={l.location_id}>{l.name}</option>)}
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
