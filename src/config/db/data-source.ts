import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USER ?? 'scheduler',
  password: process.env.DB_PASSWORD ?? 'Password123',
  database: process.env.DB_NAME ?? 'schedulerDB',
  synchronize: true,
  logging: false,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
