import React, { useState, useEffect } from "react";
import { 
  Plus, 
  X, 
  Loader2, 
  Shuffle,
  UploadCloud
} from "lucide-react";
import { inventoryService } from "../services/inventory";
import { authService, type Convenio } from "../services/auth";

type Location = {
  ubicacion_id: string;
  codigo_local?: string | null;
  nombre: string;
  direccion: string;
  region: string;
  comuna?: string | null;
  es_bodega: boolean;
  convenio_id?: string | null;
  nombre_encargado?: string | null;
  telefono_encargado?: string | null;
  correo_encargado?: string | null;
  activo?: boolean;
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
  const [agreements, setAgreements] = useState<Convenio[]>([]);
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals Open State
  const [modalOpen, setModalOpen] = useState<"location" | "bulk_locations" | "product" | "asset" | "movement" | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  // Location Form
  const [locCode, setLocCode] = useState("");
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [locComuna, setLocComuna] = useState("");
  const [locAgreementId, setLocAgreementId] = useState("");
  const [locManagerName, setLocManagerName] = useState("");
  const [locManagerPhone, setLocManagerPhone] = useState("");
  const [locManagerEmail, setLocManagerEmail] = useState("");
  const [locIsWarehouse, setLocIsWarehouse] = useState(false);

  // Bulk Locations Form
  const [bulkLocJson, setBulkLocJson] = useState("");

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

      const [locsData, prodsData, assetsData, movesData, agreementsData] = await Promise.all([
        inventoryService.getLocations(),
        inventoryService.getProducts(),
        inventoryService.getAssets(),
        inventoryService.getMovements(),
        authService.getAgreements().catch(() => [] as Convenio[])
      ]);

      setLocations(locsData);
      setProducts(prodsData);
      setAssets(assetsData);
      setAgreements(agreementsData);
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
    setLocCode(""); setLocName(""); setLocAddress(""); setLocRegion(""); setLocComuna(""); 
    setLocAgreementId(""); setLocManagerName(""); setLocManagerPhone(""); setLocManagerEmail(""); 
    setLocIsWarehouse(false); setBulkLocJson("");
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
        codigo_local: locCode || null,
        nombre: locName,
        direccion: locAddress,
        region: locRegion,
        comuna: locComuna || null,
        convenio_id: locAgreementId || null,
        nombre_encargado: locManagerName || null,
        telefono_encargado: locManagerPhone || null,
        correo_encargado: locManagerEmail || null,
        es_bodega: locIsWarehouse,
        activo: true
      });
      closeModals();
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo crear la ubicación.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleBulkCreateLocations = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      let parsedData: any[];
      try {
        parsedData = JSON.parse(bulkLocJson);
        if (!Array.isArray(parsedData)) {
          throw new Error("El JSON debe ser un arreglo de objetos de locales.");
        }
      } catch (parseErr: any) {
        throw new Error("Formato JSON inválido: " + parseErr.message);
      }

      await inventoryService.bulkCreateLocations(parsedData);
      closeModals();
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudieron cargar los locales de forma masiva.");
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
                <span>Bodegas y Locales de Instalación (Convenios)</span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-secondary" onClick={() => setModalOpen("bulk_locations")}>
                    <UploadCloud size={16} />
                    <span>Carga Masiva</span>
                  </button>
                  <button className="btn-primary" onClick={() => setModalOpen("location")}>
                    <Plus size={16} />
                    <span>Crear Local / Ubicación</span>
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                {locations.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay ubicaciones o locales registrados.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Código Local</th>
                        <th>Nombre / Local</th>
                        <th>Convenio Asociado</th>
                        <th>Comuna / Región</th>
                        <th>Dirección</th>
                        <th>Encargado</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc) => {
                        const agreement = agreements.find(a => a.convenio_id === loc.convenio_id);
                        return (
                          <tr key={loc.ubicacion_id}>
                            <td>
                              {loc.codigo_local ? (
                                <span className="badge secondary" style={{ fontWeight: 600 }}>{loc.codigo_local}</span>
                              ) : (
                                <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem" }}>S/C</span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{loc.nombre}</td>
                            <td>
                              {agreement ? (
                                <span style={{ color: "hsl(var(--accent-primary))", fontWeight: 500 }}>
                                  {agreement.nombre_empresa}
                                </span>
                              ) : (
                                <span style={{ color: "hsl(var(--text-muted))" }}>Sin convenio / Propio</span>
                              )}
                            </td>
                            <td>{loc.comuna ? `${loc.comuna}, ` : ""}{loc.region}</td>
                            <td>{loc.direccion}</td>
                            <td>
                              {loc.nombre_encargado ? (
                                <div>
                                  <div>{loc.nombre_encargado}</div>
                                  {loc.telefono_encargado && (
                                    <small style={{ color: "hsl(var(--text-muted))" }}>{loc.telefono_encargado}</small>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: "hsl(var(--text-muted))" }}>-</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${loc.es_bodega ? "success" : "primary"}`}>
                                {loc.es_bodega ? "Bodega" : "Punto de Venta / Local"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
          <div className="modal-content glass-panel" style={{ maxWidth: "600px" }}>
            <button className="modal-close" onClick={closeModals}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Registrar Local o Bodega</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleCreateLocation}>
              <div className="form-row">
                <div className="form-group">
                  <label>Código del Local (Opcional)</label>
                  <input type="text" className="glass-input" placeholder="ej: COP-042, PRONTO-102" value={locCode} onChange={e=>setLocCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Convenio Asociado</label>
                  <select className="glass-input" style={{ background: "#1b2030" }} value={locAgreementId} onChange={e=>setLocAgreementId(e.target.value)}>
                    <option value="">Ninguno / Instalación Propia</option>
                    {agreements.map(a=><option key={a.convenio_id} value={a.convenio_id}>{a.nombre_empresa} ({a.rut})</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Nombre del Local o Bodega</label>
                <input type="text" className="glass-input" placeholder="Tienda Pronto Copec Pudahuel" value={locName} onChange={e=>setLocName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Dirección Física</label>
                <input type="text" className="glass-input" placeholder="Av. Américo Vespucio 1234" value={locAddress} onChange={e=>setLocAddress(e.target.value)} required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Comuna</label>
                  <input type="text" className="glass-input" placeholder="Pudahuel" value={locComuna} onChange={e=>setLocComuna(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Región</label>
                  <input type="text" className="glass-input" placeholder="Región Metropolitana" value={locRegion} onChange={e=>setLocRegion(e.target.value)} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nombre Encargado del Local</label>
                  <input type="text" className="glass-input" placeholder="Juan Pérez" value={locManagerName} onChange={e=>setLocManagerName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Teléfono Encargado</label>
                  <input type="text" className="glass-input" placeholder="+56 9 1234 5678" value={locManagerPhone} onChange={e=>setLocManagerPhone(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Correo Electrónico Encargado</label>
                <input type="email" className="glass-input" placeholder="encargado@tienda.cl" value={locManagerEmail} onChange={e=>setLocManagerEmail(e.target.value)} />
              </div>

              <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", margin: "15px 0" }}>
                <input type="checkbox" id="is_wh" checked={locIsWarehouse} onChange={e=>setLocIsWarehouse(e.target.checked)} />
                <label htmlFor="is_wh">¿Es una bodega / centro de distribución principal?</label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={closeModals}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Registrar Local</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Locations Modal */}
      {modalOpen === "bulk_locations" && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "650px" }}>
            <button className="modal-close" onClick={closeModals}><X size={20} /></button>
            <h3 style={{ marginBottom: "15px", fontWeight: 600 }} className="accent-text-gradient">Carga Masiva de Locales e Instalaciones</h3>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginBottom: "20px" }}>
              Pega un arreglo en formato JSON con la lista de locales a registrar o actualizar. Puedes incluir el <code>convenio_id</code> para cruzarlos directamente con cada cliente.
            </p>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleBulkCreateLocations}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Datos en formato JSON</label>
                <textarea 
                  className="glass-input" 
                  style={{ minHeight: "220px", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: "1.4" }}
                  placeholder={`[\n  {\n    "codigo_local": "COP-001",\n    "nombre": "Pronto Copec Kennedy",\n    "direccion": "Av. Presidente Kennedy 5000",\n    "comuna": "Las Condes",\n    "region": "Región Metropolitana",\n    "es_bodega": false,\n    "nombre_encargado": "Carlos Soto",\n    "telefono_encargado": "+56987654321"\n  }\n]`}
                  value={bulkLocJson}
                  onChange={e=>setBulkLocJson(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    const sample = [
                      {
                        codigo_local: "COP-001",
                        nombre: "Pronto Copec Kennedy",
                        direccion: "Av. Presidente Kennedy 5000",
                        comuna: "Las Condes",
                        region: "Región Metropolitana",
                        es_bodega: false,
                        nombre_encargado: "Carlos Soto",
                        telefono_encargado: "+56987654321",
                        correo_encargado: "csoto@copec.cl"
                      },
                      {
                        codigo_local: "PRON-002",
                        nombre: "Pronto Copec Pudahuel",
                        direccion: "Ruta 68 Km 12",
                        comuna: "Pudahuel",
                        region: "Región Metropolitana",
                        es_bodega: false,
                        nombre_encargado: "María Rojas",
                        telefono_encargado: "+56911223344",
                        correo_encargado: "mrojas@copec.cl"
                      }
                    ];
                    setBulkLocJson(JSON.stringify(sample, null, 2));
                  }}
                >
                  Pegar Ejemplo
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="btn-secondary" onClick={closeModals}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={modalLoading}>Cargar Locales</button>
                </div>
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
