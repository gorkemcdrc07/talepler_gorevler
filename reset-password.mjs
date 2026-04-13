import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = "66fcd713-bb3f-4cc5-99f0-5135edc9f678";
const NEW_PASSWORD = "Test1234!";

async function run() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    USER_ID,
    {
      password: NEW_PASSWORD,
    }
  );

  if (error) {
    console.error("HATA:", error.message);
    return;
  }

  console.log("ŞİFRE GÜNCELLENDİ ✅");
}

run();