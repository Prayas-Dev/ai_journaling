

const dotenv = require("dotenv");
const result = dotenv.config({ path: __dirname+"/.env" });
const {Pool} = require("pg");
console.log("DB_USER:", process.env.DB_USER);
const pool = new Pool({
    user:process.env.DB_USER,
    host:process.env.DB_HOST,
    database:process.env.DB_NAME,
    password:process.env.DB_PASSWORD,
    port:Number(process.env.DB_PORT)
});


export default pool;