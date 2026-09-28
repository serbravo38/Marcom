DO $$
DECLARE
  v_prod UUID;
  v_loc UUID;
  v_i INT := 207;
BEGIN
  SELECT producto_id INTO v_prod FROM inventario.catalogo_productos LIMIT 1;
  SELECT ubicacion_id INTO v_loc FROM inventario.ubicaciones LIMIT 1;
  WHILE v_i <= 248 LOOP
    INSERT INTO inventario.activos (
      activo_id, producto_id, numero_serie, codigo_qr, estado_actual, ubicacion_actual_id
    ) VALUES (
      uuid_generate_v4(),
      v_prod,
      'SN-MON-2025-' || LPAD(v_i::text, 4, '0'),
      'QR-MON-' || LPAD(v_i::text, 4, '0'),
      'USADO_BUEN_ESTADO',
      v_loc
    );
    v_i := v_i + 1;
  END LOOP;

  -- Update 9 to EN_TRANSITO and 7 to DEFECTUOSO
  WITH to_update AS (
    SELECT activo_id FROM inventario.activos ORDER BY numero_serie DESC LIMIT 16
  ),
  ranked AS (
    SELECT activo_id, row_number() over () as rn FROM to_update
  )
  UPDATE inventario.activos a
  SET estado_actual = CASE WHEN r.rn <= 9 THEN 'EN_TRANSITO'::inventario.estado_activo_enum ELSE 'DEFECTUOSO'::inventario.estado_activo_enum END
  FROM ranked r
  WHERE a.activo_id = r.activo_id;
END $$;
