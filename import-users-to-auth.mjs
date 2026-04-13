import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getSafePassword(row) {
    const raw = String(row.sifre || "").trim();
    if (!raw) return null;
    return raw;
}

async function main() {
    const { data: users, error } = await supabase
        .from("kullanicilar")
        .select(`
            id,
            eposta,
            sifre,
            ad,
            soyad,
            ad_soyad,
            kullanici_adi,
            rol,
            aktif,
            birim_unvan_id,
            auth_user_id
        `)
        .eq("aktif", true);

    if (error) throw error;

    console.log(`Toplam kullanýcý: ${users.length}`);

    for (const row of users) {
        try {
            if (row.auth_user_id) {
                console.log(`Atlandý (zaten baðlý): ${row.eposta}`);
                continue;
            }

            const email = normalizeEmail(row.eposta);
            if (!email) {
                console.log(`Atlandý (eposta yok): ${row.id}`);
                continue;
            }

            const password = getSafePassword(row);
            if (!password) {
                console.log(`Atlandý (þifre yok): ${email}`);
                continue;
            }

            const { data: created, error: createError } =
                await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: {
                        ad: row.ad,
                        soyad: row.soyad,
                        ad_soyad: row.ad_soyad,
                        kullanici_adi: row.kullanici_adi,
                        rol: row.rol,
                        birim_unvan_id: row.birim_unvan_id,
                        legacy_user_id: row.id,
                    },
                });

            if (createError) {
                console.error(`Auth create failed: ${email}`, createError.message);
                continue;
            }

            const authUserId = created.user?.id;
            if (!authUserId) {
                console.error(`Auth id alýnamadý: ${email}`);
                continue;
            }

            const { error: updateError } = await supabase
                .from("kullanicilar")
                .update({ auth_user_id: authUserId })
                .eq("id", row.id);

            if (updateError) {
                console.error(`kullanicilar update failed: ${email}`, updateError.message);
                continue;
            }

            console.log(`OK: ${email} -> ${authUserId}`);
        } catch (err) {
            console.error(`Beklenmeyen hata: ${row.eposta}`, err.message);
        }
    }

    console.log("Bitti.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});