/**
 * Migration script to update RFP status from 'awarded' to 'deal_sold'
 * 
 * Run this script once to migrate existing data:
 * npx ts-node src/database/migrations/migrate-awarded-to-deal-sold.ts
 */

import { Sequelize } from 'sequelize';
import { config } from 'dotenv';
import { DATABASE } from '../../config/constants';

config();

async function migrate() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: DATABASE.HOST,
    port: DATABASE.PORT,
    username: DATABASE.USERNAME,
    password: DATABASE.PASSWORD,
    database: DATABASE.NAME,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // First, update the enum type to include 'deal_sold' if it doesn't exist
    await sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'deal_sold' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_rfps_status')) THEN
          ALTER TYPE enum_rfps_status ADD VALUE 'deal_sold';
        END IF;
      END $$;
    `);

    // Update all RFPs with status 'awarded' to 'deal_sold'
    const [results] = await sequelize.query(`
      UPDATE rfps 
      SET status = 'deal_sold'::enum_rfps_status
      WHERE status = 'awarded'::enum_rfps_status
      RETURNING id;
    `);

    const affectedRows = Array.isArray(results) ? results.length : 0;
    console.log(`Migration completed. Updated ${affectedRows} row(s).`);
    
    // Verify the update
    const [countResults] = await sequelize.query(`
      SELECT COUNT(*)::int as count 
      FROM rfps 
      WHERE status = 'deal_sold'::enum_rfps_status
    `);
    
    const count = (countResults as any[])[0]?.count || 0;
    console.log(`Total RFPs with 'deal_sold' status: ${count}`);
    
    // Check if any 'awarded' status still exists
    const [remainingResults] = await sequelize.query(`
      SELECT COUNT(*)::int as count 
      FROM rfps 
      WHERE status = 'awarded'::enum_rfps_status
    `);
    
    const remaining = (remainingResults as any[])[0]?.count || 0;
    if (remaining > 0) {
      console.warn(`Warning: ${remaining} RFPs still have 'awarded' status.`);
    } else {
      console.log('All RFPs successfully migrated to "deal_sold" status.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

migrate()
  .then(() => {
    console.log('Migration script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

