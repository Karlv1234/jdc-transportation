import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AWS_REGION",
  "AWS_S3_BACKUP_BUCKET",
  "BACKUP_S3_KEY",
  "CONFIRM_RESTORE",
];

for (const key of requiredEnv) {
  if (!process.env[key] || !process.env[key].trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (process.env.CONFIRM_RESTORE !== "YES_RESTORE_JDC") {
  throw new Error(
    "Restore blocked. Set CONFIRM_RESTORE=YES_RESTORE_JDC to continue."
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const s3 = new S3Client({
  region: process.env.AWS_REGION.trim(),
});

const bucket = process.env.AWS_S3_BACKUP_BUCKET.trim();
const backupKey = process.env.BACKUP_S3_KEY.trim();

const RESTORE_ORDER = [
  "locations",
  "staff_users",
  "people",
  "vehicles",
  "player_arrivals",
  "checkouts",
];

async function streamToString(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
}

async function downloadBackup() {
  console.log(`Downloading s3://${bucket}/${backupKey}`);

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: backupKey,
    })
  );

  const text = await streamToString(response.Body);
  return JSON.parse(text);
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function insertRows(tableName, rows) {
  if (!rows || rows.length === 0) {
    console.log(`Skipping ${tableName}: 0 rows`);
    return;
  }

  console.log(`Restoring ${rows.length} row(s) into ${tableName}...`);

  for (const chunk of chunkArray(rows, 500)) {
    const { error } = await supabase.from(tableName).insert(chunk);

    if (error) {
      throw new Error(`Failed restoring ${tableName}: ${error.message}`);
    }
  }
}

async function clearVehicleEventsOnly() {
  console.log("Clearing temporary vehicle events created during restore...");

  const { error } = await supabase
    .from("vehicle_events")
    .delete()
    .gte("id", 0);

  if (error) {
    throw new Error(`Failed clearing vehicle_events: ${error.message}`);
  }
}

async function runRestore() {
  const backup = await downloadBackup();

  if (!backup.tables) {
    throw new Error("Backup file does not contain a tables object.");
  }

  console.log(`Backup created at: ${backup.backup_created_at || "Unknown"}`);
  console.log("CLEARING CURRENT DATABASE TABLES...");
  console.log("This will overwrite current app data.");

  const { error: clearError } = await supabase.rpc("restore_clear_jdc_tables");

  if (clearError) {
    throw new Error(`Failed clearing tables: ${clearError.message}`);
  }

  for (const tableName of RESTORE_ORDER) {
    await insertRows(tableName, backup.tables[tableName] || []);
  }

  // Vehicle/checkouts inserts can trigger fresh vehicle_events.
  // Clear those generated restore-time events, then put the backed-up log back.
  await clearVehicleEventsOnly();
  await insertRows("vehicle_events", backup.tables.vehicle_events || []);

  console.log("Resetting identity sequences...");

  const { error: resetError } = await supabase.rpc(
    "restore_reset_jdc_sequences"
  );

  if (resetError) {
    throw new Error(`Failed resetting sequences: ${resetError.message}`);
  }

  console.log("Restore complete.");
}

runRestore().catch((error) => {
  console.error("Restore failed:");
  console.error(error);
  process.exit(1);
});