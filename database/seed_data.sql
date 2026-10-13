DO $$
DECLARE
  v_convenio_id UUID;
  v_prod_55 UUID;
  v_prod_43 UUID;
  v_prod_totem UUID;
  v_tecnico_id UUID;
  v_loc RECORD;
  v_i INT := 0;
BEGIN
  -- 1. Convenios
  INSERT INTO esquema_auth_clientes.convenios (convenio_id, nombre_empresa, rut, limite_credito, credito_usado, activo)
  VALUES (uuid_generate_v4(), 'Copec S.A.', '99520000-7', 150000000.00, 42500000.00, true)
  ON CONFLICT (rut) DO UPDATE SET activo = true
  RETURNING convenio_id INTO v_convenio_id;

  INSERT INTO esquema_auth_clientes.convenios (convenio_id, nombre_empresa, rut, limite_credito, credito_usado, activo)
  VALUES (uuid_generate_v4(), 'Arcoprime S.A.', '96871230-5', 80000000.00, 18200000.00, true)
  ON CONFLICT (rut) DO NOTHING;

  INSERT INTO esquema_auth_clientes.convenios (convenio_id, nombre_empresa, rut, limite_credito, credito_usado, activo)
  VALUES (uuid_generate_v4(), 'Pronto Copec SpA', '76123456-7', 50000000.00, 12400000.00, true)
  ON CONFLICT (rut) DO NOTHING;

  -- Asignar convenio a ubicaciones existentes
  UPDATE esquema_inventario.ubicaciones SET convenio_id = v_convenio_id WHERE convenio_id IS NULL;

  -- 2. Productos
  INSERT INTO esquema_inventario.catalogo_productos (producto_id, sku, nombre, marca, categoria, pulgadas, descripcion)
  VALUES (uuid_generate_v4(), 'MON-SAMS-55', 'Monitor Profesional Smart Signage 55"', 'Samsung', 'Monitores', 55.0, 'Pantalla comercial 4K 24/7')
  ON CONFLICT (sku) DO NOTHING
  RETURNING producto_id INTO v_prod_55;

  IF v_prod_55 IS NULL THEN
    SELECT producto_id INTO v_prod_55 FROM esquema_inventario.catalogo_productos WHERE sku = 'MON-SAMS-55';
  END IF;

  INSERT INTO esquema_inventario.catalogo_productos (producto_id, sku, nombre, marca, categoria, pulgadas, descripcion)
  VALUES (uuid_generate_v4(), 'MON-LG-43', 'Monitor Digital Signage 43"', 'LG', 'Monitores', 43.0, 'Pantalla comercial Full HD alto brillo')
  ON CONFLICT (sku) DO NOTHING
  RETURNING producto_id INTO v_prod_43;

  IF v_prod_43 IS NULL THEN
    SELECT producto_id INTO v_prod_43 FROM esquema_inventario.catalogo_productos WHERE sku = 'MON-LG-43';
  END IF;

  INSERT INTO esquema_inventario.catalogo_productos (producto_id, sku, nombre, marca, categoria, pulgadas, descripcion)
  VALUES (uuid_generate_v4(), 'TOT-AUTO-27', 'Tótem Autoservicio Táctil 27"', 'Elo Touch', 'Tótems', 27.0, 'Módulo interactivo para tiendas')
  ON CONFLICT (sku) DO NOTHING
  RETURNING producto_id INTO v_prod_totem;

  IF v_prod_totem IS NULL THEN
    SELECT producto_id INTO v_prod_totem FROM esquema_inventario.catalogo_productos WHERE sku = 'TOT-AUTO-27';
  END IF;

  -- 3. Activos: crear 248 activos distribuidos en las 92 ubicaciones
  IF (SELECT count(*) FROM esquema_inventario.activos) = 0 THEN
    FOR v_loc IN (SELECT ubicacion_id FROM esquema_inventario.ubicaciones ORDER BY creado_en LIMIT 92) LOOP
      FOR j IN 1..(CASE WHEN v_i < 64 THEN 3 ELSE 2 END) LOOP
        v_i := v_i + 1;
        INSERT INTO esquema_inventario.activos (
          activo_id, producto_id, numero_serie, codigo_qr, estado_actual, ubicacion_actual_id
        ) VALUES (
          uuid_generate_v4(),
          CASE WHEN v_i % 3 = 0 THEN v_prod_43 WHEN v_i % 5 = 0 THEN v_prod_totem ELSE v_prod_55 END,
          'SN-MON-2025-' || LPAD(v_i::text, 4, '0'),
          'QR-MON-' || LPAD(v_i::text, 4, '0'),
          CASE 
            WHEN v_i <= 232 THEN 'USADO_BUEN_ESTADO'::esquema_inventario.estado_activo_enum
            WHEN v_i <= 241 THEN 'EN_TRANSITO'::esquema_inventario.estado_activo_enum
            ELSE 'DEFECTUOSO'::esquema_inventario.estado_activo_enum
          END,
          v_loc.ubicacion_id
        );
        EXIT WHEN v_i >= 248;
      END LOOP;
      EXIT WHEN v_i >= 248;
    END LOOP;
  END IF;

  -- 4. Técnico
  SELECT usuario_id INTO v_tecnico_id FROM esquema_auth_clientes.usuarios WHERE rol = 'TECNICO_TERRENO' LIMIT 1;
  IF v_tecnico_id IS NULL THEN
    SELECT usuario_id INTO v_tecnico_id FROM esquema_auth_clientes.usuarios LIMIT 1;
  END IF;

  -- 5. Órdenes de trabajo
  IF (SELECT count(*) FROM esquema_ordenes_trabajo.ordenes_trabajo) = 0 THEN
    v_i := 0;
    FOR v_loc IN (SELECT ubicacion_id FROM esquema_inventario.ubicaciones LIMIT 47) LOOP
      v_i := v_i + 1;
      INSERT INTO esquema_ordenes_trabajo.ordenes_trabajo (
        orden_trabajo_id, numero_orden, convenio_cliente_id, ubicacion_id, tecnico_asignado_id, estado, fecha_programada, notas
      ) VALUES (
        uuid_generate_v4(),
        'OT-2025-' || LPAD((400 + v_i)::text, 4, '0'),
        v_convenio_id,
        v_loc.ubicacion_id,
        v_tecnico_id,
        CASE 
          WHEN v_i <= 18 THEN 'EN_PROCESO'::esquema_ordenes_trabajo.estado_ot_enum
          WHEN v_i <= 32 THEN 'ASIGNADA'::esquema_ordenes_trabajo.estado_ot_enum
          WHEN v_i <= 44 THEN 'COMPLETADA'::esquema_ordenes_trabajo.estado_ot_enum
          ELSE 'PENDIENTE'::esquema_ordenes_trabajo.estado_ot_enum
        END,
        CURRENT_TIMESTAMP - (v_i || ' days')::interval + '4 hours'::interval,
        'Atención técnica programada para pantallas y tótem'
      );
    END LOOP;
  END IF;

END $$;
