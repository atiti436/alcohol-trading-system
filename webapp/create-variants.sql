-- 為山崎18年威士忌創建變體
-- 先獲取產品ID
DO $$
DECLARE
    yamazaki_id text;
    hibiki_id text;
BEGIN
    -- 獲取山崎產品ID
    SELECT id INTO yamazaki_id FROM products WHERE product_code = 'W001';
    SELECT id INTO hibiki_id FROM products WHERE product_code = 'W002';

    IF yamazaki_id IS NOT NULL THEN
        -- 山崎18年變體
        INSERT INTO product_variants (
            id, product_id, variant_code, sku, variant_type, description,
            base_price, current_price, cost_price, stock_quantity,
            reserved_stock, available_stock, condition, created_at, updated_at
        ) VALUES
        (
            'yamazaki_a_' || extract(epoch from now())::text,
            yamazaki_id,
            'W001-A',
            'W001-A-700-43',
            'A',
            '普通版',
            21000,
            21000,
            15000,
            10,
            0,
            10,
            '原裝無盒，瓶身完整',
            NOW(),
            NOW()
        ),
        (
            'yamazaki_b_' || extract(epoch from now())::text,
            yamazaki_id,
            'W001-B',
            'W001-B-700-43',
            'B',
            '禮盒版',
            23000,
            23000,
            16500,
            5,
            0,
            5,
            '附原廠禮盒，含證書',
            NOW(),
            NOW()
        ),
        (
            'yamazaki_c_' || extract(epoch from now())::text,
            yamazaki_id,
            'W001-C',
            'W001-C-700-43',
            'C',
            '收藏版',
            25000,
            25000,
            18000,
            3,
            0,
            3,
            '限量收藏盒，編號證書',
            NOW(),
            NOW()
        ),
        (
            'yamazaki_x_' || extract(epoch from now())::text,
            yamazaki_id,
            'W001-X',
            'W001-X-700-43',
            'X',
            '損傷品',
            18000,
            18000,
            15000,
            2,
            0,
            2,
            '外盒破損，酒體完好',
            NOW(),
            NOW()
        )
        ON CONFLICT (variant_code) DO NOTHING;
    END IF;

    IF hibiki_id IS NOT NULL THEN
        -- 響21年變體
        INSERT INTO product_variants (
            id, product_id, variant_code, sku, variant_type, description,
            base_price, current_price, cost_price, stock_quantity,
            reserved_stock, available_stock, condition, created_at, updated_at
        ) VALUES
        (
            'hibiki_a_' || extract(epoch from now())::text,
            hibiki_id,
            'W002-A',
            'W002-A-700-43',
            'A',
            '普通版',
            35000,
            35000,
            25000,
            8,
            0,
            8,
            '原裝無盒，完整包裝',
            NOW(),
            NOW()
        ),
        (
            'hibiki_b_' || extract(epoch from now())::text,
            hibiki_id,
            'W002-B',
            'W002-B-700-43',
            'B',
            '限定版',
            40000,
            40000,
            28000,
            3,
            0,
            3,
            '年度限定包裝，特製盒',
            NOW(),
            NOW()
        )
        ON CONFLICT (variant_code) DO NOTHING;
    END IF;

    RAISE NOTICE '✅ 變體創建完成！';
    RAISE NOTICE '山崎18年: 普通版/禮盒版/收藏版/損傷品';
    RAISE NOTICE '響21年: 普通版/限定版';

END $$;