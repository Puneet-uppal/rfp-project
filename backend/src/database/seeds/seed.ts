import { Sequelize } from 'sequelize-typescript';
import { config } from 'dotenv';
import { Vendor } from '../models/vendor.model';
import { Rfp } from '../models/rfp.model';
import { RfpItem } from '../models/rfp-item.model';
import { RfpVendor } from '../models/rfp-vendor.model';
import { Proposal } from '../models/proposal.model';
import { ProposalItem } from '../models/proposal-item.model';
import { DATABASE } from '../../config/constants';

config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: DATABASE.HOST,
  port: DATABASE.PORT,
  username: DATABASE.USERNAME,
  password: DATABASE.PASSWORD,
  database: DATABASE.NAME,
  models: [Vendor, Rfp, RfpItem, RfpVendor, Proposal, ProposalItem],
  logging: false,
});

async function seed() {
  console.log('Starting database seed...');

  await sequelize.sync();

  // Sample vendors
  const vendors = [
    {
      companyName: 'TechPro Solutions',
      contactPerson: 'John Smith',
      email: 'john.smith@techpro.com',
      phone: '+1-555-0101',
      address: '123 Tech Avenue, Silicon Valley, CA 94025',
      category: 'IT Equipment',
      notes: 'Preferred vendor for laptops and computers',
    },
    {
      companyName: 'Office Supplies Plus',
      contactPerson: 'Sarah Johnson',
      email: 'sarah.j@officesuppliesplus.com',
      phone: '+1-555-0102',
      address: '456 Business Park, New York, NY 10001',
      category: 'Office Supplies',
      notes: 'Fast delivery, competitive pricing',
    },
    {
      companyName: 'Global Electronics Corp',
      contactPerson: 'Michael Chen',
      email: 'mchen@globalelectronics.com',
      phone: '+1-555-0103',
      address: '789 Industrial Blvd, Austin, TX 78701',
      category: 'IT Equipment',
      notes: 'Enterprise-grade equipment supplier',
    },
    {
      companyName: 'Premier Computing',
      contactPerson: 'Emily Davis',
      email: 'emily.davis@premiercomputing.com',
      phone: '+1-555-0104',
      address: '321 Innovation Drive, Seattle, WA 98101',
      category: 'IT Equipment',
      notes: 'Specialized in high-performance workstations',
    },
    {
      companyName: 'Display Masters Inc',
      contactPerson: 'Robert Wilson',
      email: 'rwilson@displaymasters.com',
      phone: '+1-555-0105',
      address: '654 Monitor Lane, Denver, CO 80201',
      category: 'IT Equipment',
      notes: 'Monitors and display solutions specialist',
    },
  ];

  for (const vendorData of vendors) {
    const existing = await Vendor.findOne({
      where: { email: vendorData.email },
    });

    if (!existing) {
      await Vendor.create(vendorData as any);
      console.log(`Created vendor: ${vendorData.companyName}`);
    } else {
      console.log(`Vendor already exists: ${vendorData.companyName}`);
    }
  }

  console.log('Seed completed successfully!');
  await sequelize.close();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
