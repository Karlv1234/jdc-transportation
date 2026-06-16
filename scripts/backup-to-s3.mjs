import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AWS_REGION",
  "AWS_S3_BACKUP_BUCKET",
  "AWS_S3_BACKUP_PREFIX",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

const TABLES_TO_BACKUP = [
  "vehicles",
  "checkouts",
  "vehicle_events",
  "people",
  "player_arrivals",
  "locations",
  "staff_users",
];

async function fetchAllRows(tableName) {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, to);

    if (error) {
      throw new Error(`Failed to export ${tableName}: ${error.message}`);
    }

    allRows = allRows.concat(data || []);

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

function makeTimestampParts() {
  const now = new Date();

  const iso = now.toISOString();
  const safeTimestamp = iso.replace(/[:.]/g, "-");

  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return { iso, safeTimestamp, year, month, day };
}

async function runBackup() {
  const { iso, safeTimestamp, year, month, day } = makeTimestampParts();

  const backup = {
    app: "JDC Transportation",
    backup_created_at: iso,
    backup_type: "full-json-snapshot",
    tables: {},
  };

  for (const tableName of TABLES_TO_BACKUP) {
    console.log(`Exporting ${tableName}...`);
    backup.tables[tableName] = await fetchAllRows(tableName);
    console.log(`Exported ${backup.tables[tableName].length} row(s) from ${tableName}.`);
  }

  const body = JSON.stringify(backup, null, 2);

  const bucket = process.env.AWS_S3_BACKUP_BUCKET;
  const prefix = process.env.AWS_S3_BACKUP_PREFIX.replace(/^\/+|\/+$/g, "");

  const datedKey = `${prefix}/${year}/${month}/${day}/jdc-backup-${safeTimestamp}.json`;
  const latestKey = `${prefix}/latest/jdc-backup-latest.json`;

  console.log(`Uploading ${datedKey}...`);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: datedKey,
      Body: body,
      ContentType: "application/json",
      ServerSideEncryption: "AES256",
      Metadata: {
        app: "jdc-transportation",
        backup_created_at: iso,
      },
    })
  );

  console.log(`Uploading ${latestKey}...`);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: latestKey,
      Body: body,
      ContentType: "application/json",
      ServerSideEncryption: "AES256",
      Metadata: {
        app: "jdc-transportation",
        backup_created_at: iso,
      },
    })
  );

  console.log("Backup complete.");
}

runBackup().catch((error) => {
  console.error(error);
  process.exit(1);
});