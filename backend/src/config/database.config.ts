import { registerAs } from '@nestjs/config';
import { DATABASE } from './constants';

export default registerAs('database', () => ({
  host: DATABASE.HOST,
  port: DATABASE.PORT,
  username: DATABASE.USERNAME,
  password: DATABASE.PASSWORD,
  database: DATABASE.NAME,
}));
