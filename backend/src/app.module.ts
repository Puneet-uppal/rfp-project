import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { databaseConfig, emailConfig, aiConfig, SERVER } from './config';

import { Rfp, RfpItem, Vendor, RfpVendor, Proposal, ProposalItem } from './database/models';

import { RfpModule } from './modules/rfp/rfp.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { ProposalModule } from './modules/proposal/proposal.module';
import { ComparisonModule } from './modules/comparison/comparison.module';
import { EmailModule } from './modules/email/email.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, emailConfig, aiConfig],
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        models: [Rfp, RfpItem, Vendor, RfpVendor, Proposal, ProposalItem],
        autoLoadModels: true,
        synchronize: SERVER.IS_DEVELOPMENT,
        sync: { alter: SERVER.IS_DEVELOPMENT },
        logging: SERVER.IS_DEVELOPMENT ? console.log : false,
      }),
      inject: [ConfigService],
    }),
    RfpModule,
    VendorModule,
    ProposalModule,
    ComparisonModule,
    EmailModule,
    AiModule,
  ],
})
export class AppModule {}
