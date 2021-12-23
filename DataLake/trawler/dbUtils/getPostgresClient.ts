import pkg from 'pg';

const {Pool} = pkg;

export function getPostgresClient() {
    return new Pool({
        user: 'postgres', database: 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        host: 'localhost' // 'sql' if running in docker-compose
    })
}