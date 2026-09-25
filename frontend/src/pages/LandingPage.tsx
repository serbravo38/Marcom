import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Truck, 
  FileText, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  X,
  LogIn,  
  Layers
} from 'lucide-react';

const slides = [
  {
    id: 1,
    image: "/images/carrousel/1.jpg",
    title: "Control Integral Tecnológico",
    subtitle: "Ofrecemos monitores de última generación"
  },
  {
    id: 2,
    image: "/images/carrousel/8.jpeg", 
    title: "Trabajo de Mantenimiento en Terreno",
    subtitle: "Gestión técnica en tiempo real con captura de evidencias digitales."
  },
  {
    id: 3,
    image: "/images/carrousel/9.jpeg",
    title: "Instalaciones y Soporte Técnico",
    subtitle: "Asistencia técnica especializada 24/7."
  }
];

export const LandingPage: React.FC = () => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    rutEmpresa: '',
    email: '',
    telefono: '',
    tipoCliente: 'STANDARD',
    mensaje: ''
  });

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterSubmitted(true);
    setTimeout(() => {
      setRegisterSubmitted(false);
      setIsRegisterOpen(false);
      setFormData({
        nombreCompleto: '',
        rutEmpresa: '',
        email: '',
        telefono: '',
        tipoCliente: 'STANDARD',
        mensaje: ''
      });
    }, 2500);
  };

  return (
    <div className="landing-page-wrapper flex flex-col justify-between min-h-screen">
      
      {/* ==================== 1. MENÚ DE NAVEGACIÓN (HEADER MARCOM) ==================== */}
      <header className="marcom-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="h-20 flex items-center justify-between gap-4">
            <a href="#inicio">
              <img 
                src="/images/Logos/LogoMarcom.png" 
                alt="Logo MARCOM Management System" 
                className="marcom-logo"
              />
            </a> 

            <a
              href="http://localhost:5173/login"
              className="marcom-btn-pill-primary"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              <span>Iniciar sesión</span>
            </a>            
          </div>

          <nav className="marcom-nav-tabs hidden md:flex">
            <a 
              href="#inicio" 
              onClick={() => setActiveTab('inicio')}
              className={`marcom-tab-item ${activeTab === 'inicio' ? 'active' : ''}`}
            >
              Inicio
            </a>
            <a 
              href="#nosotros" 
              onClick={() => setActiveTab('nosotros')}
              className={`marcom-tab-item ${activeTab === 'nosotros' ? 'active' : ''}`}
            >
              Nosotros
            </a>
            <a 
              href="#proposito" 
              onClick={() => setActiveTab('proposito')}
              className={`marcom-tab-item ${activeTab === 'proposito' ? 'active' : ''}`}
            >
              Propósito
            </a>
            <a 
              href="#servicios" 
              onClick={() => setActiveTab('servicios')}
              className={`marcom-tab-item ${activeTab === 'servicios' ? 'active' : ''}`}
            >
              Servicios
            </a>
            <a 
              href="#contacto" 
              onClick={() => setActiveTab('contacto')}
              className={`marcom-tab-item ${activeTab === 'contacto' ? 'active' : ''}`}
            >
              Contacto
            </a>
          </nav>

        </div>
      </header>

      {/* ==================== 2. CARRUSEL DE IMÁGENES (HERO) ==================== */}
      <section id="inicio" className="marcom-hero">
        <div className="marcom-hero-gradient" />
        <img
          src={slides[currentSlide].image}
          alt={slides[currentSlide].title}
          className="marcom-hero-image"
          style={{ borderRadius: "24px" }}
        />

        <div className="marcom-hero-content">
          <div className="marcom-hero-content-inner">
            <div className="marcom-hero-copy">
              <h1 className="marcom-hero-title">
                {slides[currentSlide].title}
              </h1>
              <p className="marcom-hero-subtitle">
                {slides[currentSlide].subtitle}
              </p>
              <div className="marcom-hero-actions">
                
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="marcom-hero-primary-button"
                >
                  Solicitar Acceso Corporativo
                </button>
                
                <a
                  href="#nosotros"
                  className="marcom-hero-secondary-button"
                >
                  Conocer Más
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="marcom-hero-controls">
          <button
            type="button"
            onClick={handlePrevSlide}
            className="marcom-carousel-button marcom-carousel-button-left"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
          </button>

          <button
            type="button"
            onClick={handleNextSlide}
            className="marcom-carousel-button marcom-carousel-button-right"
            aria-label="Slide siguiente"
          >
            <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
          </button>
        </div>

        <div className="marcom-carousel-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              className={`marcom-carousel-dot ${index === currentSlide ? 'active' : ''}`}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ==================== 3. SECCIÓN NOSOTROS ==================== */}
      <section id="nosotros" className="marcom-section marcom-about-section py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="marcom-about-panel">
            <div className="marcom-about-copy">
              <div className="inline-flex items-center space-x-2 text-blue-600 font-semibold text-sm uppercase tracking-wider">
                
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                  <span>Sobre MARCOM</span>
                </h1>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                Líderes en Gestión Operativa e Infraestructura Tecnológica
              </h2>
              <p className="text-slate-600 leading-relaxed text-base">
                <strong>MARCOM</strong> es una empresa chilena especializada en <strong>telecomunicaciones y tecnologías avanzadas</strong>, con amplia experiencia en proyectos de televisión satelital, digital y redes internas. Ha trabajado en infraestructuras de telecomunicación para clientes de gran escala como aeropuertos, campamentos mineros y edificios corporativos.
              </p>
              <p className="text-slate-600 leading-relaxed text-base">
                Además, colabora directamente con <strong>Arcoprime Ltda.</strong> y <strong>Copec S.A.</strong>, realizando instalaciones de monitores profesionales en estaciones de servicio y tiendas Pronto Copec a lo largo del país, desde Arica hasta Punta Arenas. Su propuesta de valor se centra en:     
              </p>
              <p className="text-slate-600 leading-relaxed text-base">
                Un aspecto clave de su negocio es la instalación de monitores de última tecnología, incluyendo innovaciones como monitores en placa superiores a 100 pulgadas, lo que posiciona a Marcom como un referente en soluciones audiovisuales de gran escala.
              </p>  
              
                  <ul className="list-disc list-outside pl-8">
                    <li>Calidad y agilidad en la ejecución de proyectos.</li>
                    <li>Soluciones flexibles y competitivas en costos.</li>
                    <li>Comunicación constante con los clientes.</li>
                  </ul>
                
                        
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 marcom-about-stats">
                <div>
                  <span className="block text-3xl font-extrabold text-blue-600">99.8% </span>
                  <span className="text-xs text-slate-500 font-medium">Disponibilidad Operativa</span>
                </div>
                <div>
                  <span className="block text-3xl font-extrabold text-blue-600">100% </span>
                  <span className="text-xs text-slate-500 font-medium">Trazabilidad de Equipos</span>
                </div>
              </div>
            </div>
            
            <div className="marcom-about-image-wrap">
              <img
                src="/images/carrousel/6.jpeg"
                alt="Equipo de trabajo MARCOM"
                className="marcom-about-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 4. SECCIÓN PROPÓSITO ==================== */}
      <section id="proposito" className="marcom-section marcom-purpose-section py-20 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="marcom-purpose-heading">
            <h1>
            <span>
              Propósito Institucional
            </span>
            </h1>
            <h2>
              Nuestra Misión y Visión
            </h2>
            <p>
              Transformar la gestión técnica tradicional mediante digitalización segura, automatización transparente e inteligencia de negocios en tiempo real.
            </p>
          </div>

          <div className="marcom-purpose-grid">
            <div className="marcom-purpose-card">
              <div className="marcom-purpose-icon marcom-purpose-icon-blue">
                <Truck />
              </div>
              <h3>Eficiencia en Terreno</h3>
              <p>
                Optimizar los tiempos de respuesta de cuadrillas técnicas mediante la asignación inteligente de órdenes de trabajo, seguimiento de estados y digitalización de evidencias en tiempo real.
              </p>
            </div>

            <div className="marcom-purpose-card">
              <div className="marcom-purpose-icon marcom-purpose-icon-green">
                <Shield />
              </div>
              <h3>Cero Pérdida de Activos</h3>
              <p>
                Garantizar el control riguroso de monitores, POS y equipamiento tecnológico mediante identificación QR individualizada, trazabilidad del ciclo de vida y auditorías continuas.
              </p>
            </div>

            <div className="marcom-purpose-card">
              <div className="marcom-purpose-icon marcom-purpose-icon-indigo">
                <BarChart3 />
              </div>
              <h3>Consolidar su liderazgo nacional</h3>
              <p>
               Consolidar su liderazgo nacional en la instalación y mantenimiento de infraestructuras de televisión y monitores profesionales, expandiendo sus capacidades hacia formatos de gran escala 
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 5. SECCIÓN SERVICIOS ==================== */}
      <section id="servicios" className="marcom-section marcom-services-section py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="marcom-services-heading">
            <h1>
            <span>
              Nuestros Servicios
            </span>
            </h1>            
            <h2>
              Nuestros Servicios Integrados
            </h2>
            <p>
              Módulos diseñados para adaptarse a la cadena de valor operativa de tu organización.
            </p>
          </div>

          <div className="marcom-services-grid">
            <div className="marcom-service-card">
              <div className="marcom-service-icon marcom-service-icon-blue">
                <Layers />
              </div>
              <h4>Implementación y mantenimiento de redes de televisión</h4>
              <p>
                Implementación y mantenimiento de redes de televisión (análogas, digitales, satelitales y cabeceras de televisión).
              </p>
            </div>

            <div className="marcom-service-card">
              <div className="marcom-service-icon marcom-service-icon-green">
                <Truck />
              </div>
              <h4>Instalación de monitores profesionales</h4>
              <p>
                Instalación de monitores profesionales en estaciones de servicio, tiendas y concesiones de Copec, incluyendo soporte y configuración.
              </p>
            </div>

            <div className="marcom-service-card">
              <div className="marcom-service-icon marcom-service-icon-indigo">
                <FileText />
              </div>
              <h4>Gestión de bodegas y logística tecnológica</h4>
              <p>
                Gestión de bodegas y logística tecnológica, con recepción, clasificación y disposición de equipos electrónicos (monitores, impresoras, escáneres, notebooks, UPS, etc.).
              </p>
            </div>

            <div className="marcom-service-card">
              <div className="marcom-service-icon marcom-service-icon-purple">
                <BarChart3 />
              </div>
              <h4>Instalación de sistemas POS y equipos complementarios</h4>
              <p>
                Instalación de sistemas POS y equipos complementarios (monitores táctiles, comandas electrónicas y de papel, impresoras de pedidos).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 6. MODAL DE REGISTRO / FORMULARIO ==================== */}
      <section id="formulario" className="marcom-section py-20 bg-slate-900 border-b border-slate-800">
      {isRegisterOpen && (
        <div className="registration-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="registration-modal-title">
          <div className="registration-modal animate-fade-in">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="registration-modal-close"
              aria-label="Cerrar formulario de registro"
            >
              <X className="h-5 w-5" />
            </button>

            {registerSubmitted ? (
              <div className="registration-success">
                <div className="registration-success-icon">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3>¡Solicitud Registrada!</h3>
                <p>
                  Hemos recibido la información de tu empresa. Un administrador de MARCOM se pondrá en contacto dentro de las próximas 24 horas hábiles.
                </p>
              </div>
            ) : (
              <div className="registration-modal-content">
                <div className="registration-modal-intro">
                  <div className="registration-modal-image-frame">
                    <img
                      src="/images/carrousel/6.jpeg"
                      alt="Equipo de trabajo MARCOM"
                    />
                  </div>
                  <div className="registration-modal-intro-copy">
                    <h2 id="registration-modal-title">Solicitud de Registro / Convenio</h2>
                    <p>
                    Completa el formulario para habilitar tu cuenta corporativa en la plataforma MARCOM.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="registration-form">
                  <div className="registration-field">
                    <label>
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Juan Pérez"
                      value={formData.nombreCompleto}
                      onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                    />
                  </div>

                  <div className="registration-form-row">
                    <div className="registration-field">
                      <label>
                        RUT Empresa / Personal
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="76.123.456-K"
                        value={formData.rutEmpresa}
                        onChange={(e) => setFormData({ ...formData, rutEmpresa: e.target.value })}
                      />
                    </div>
                    <div className="registration-field">
                      <label>
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+56 9 1234 5678"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="registration-field">
                    <label>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="contacto@empresa.cl"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="registration-field">
                    <label>
                      Tipo de Cliente
                    </label>
                    <select
                      value={formData.tipoCliente}
                      onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value })}
                    >
                      <option value="STANDARD">Cliente Standard</option>
                      <option value="CONVENIO">Cliente Convenio Corporativo (Copec / Red)</option>
                    </select>
                  </div>

                  <div className="registration-field">
                    <label>
                      Mensaje u Observaciones
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Indica la requerimiento o cantidad de locales a gestionar..."
                      value={formData.mensaje}
                      onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="registration-submit">
                    Enviar Petición de Registro
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      </section>

      {/* ==================== 7. PIE DE PÁGINA (FOOTER) ==================== */}
      <footer id="contacto" className="marcom-footer">
        <div className="marcom-footer-grid">
          <div className="marcom-footer-column">
            <h3>CONTACTO</h3>
            <ul>
              <li>Dirección:</li>
              <li>Víctor Soto Espinoza 1192, Jardines Peñaflor II</li>
              <li>Comuna: Peñaflor</li>
              <li>Telefono: +56 2 2222 2222</li>
              <li>E-mail: •	contacto@marcomchile.cl</li>
              <li>Soporte Técnico: •	soporte@marcomchile.cl</li>
            </ul>
          </div>

          <div className="marcom-footer-column">
            <h3>SERVICIO</h3>
            <ul>
              <li>Instalaciones electronicas</li>
              <li>Venta de Monitores Profesionales</li>
              <li>Soluciones Integrales</li>
              <li>Instalacion de Monitores</li>
              <li>Instalacion de Soportes</li>
              <li>Instalacion de estructuras a Cielo</li>
            </ul>
          </div>

          <div className="marcom-footer-column">
            <h3>LINK DE INTERÉS</h3>
            <ul>
              <li>Valor Dolar</li>
              <li>Valor UF</li>
              <li>Clima en Santiago</li>
              <li>Clima en Peñaflor</li>
              <li>Clima en Chile</li>
              <li>Noticias</li>
            </ul>
          </div>

          <div className="marcom-footer-aside">
            <a href="#" className="marcom-footer-block-button">INICIO</a>
            <div className="marcom-footer-social">
              <a href="#" className="marcom-social-icon" aria-label="Instagram"><span className="marcom-social-icon-content">in</span></a>
              <a href="#" className="marcom-social-icon" aria-label="LinkedIn"><span className="marcom-social-icon-content">in</span></a>
              <a href="#" className="marcom-social-icon" aria-label="TikTok"><span className="marcom-social-icon-content">♪</span></a>
              <a href="#" className="marcom-social-icon" aria-label="YouTube"><span className="marcom-social-icon-content">▶</span></a>
              <a href="#" className="marcom-social-icon" aria-label="Facebook"><span className="marcom-social-icon-content">f</span></a>
              <a href="#" className="marcom-social-icon" aria-label="X"><span className="marcom-social-icon-content">X</span></a>
            </div>
          </div>
        </div>

        <div className="marcom-footer-bottom">
          <div className="marcom-footer-topline">
            <p>
              © 2026 MARCOM Management System. Todos los derechos reservados.
            </p>
          </div>
          <div className="marcom-footer-bottomline">
            <p>
              Proyecto Capstone (PTY4614) - Duoc UC | Sergio Bravo (Backend) | Felipe Madrid (Scrum Master & QA) | Julio Mena (Frontend & QA)
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};