const express = require('express');
const { Pool } = require('pg');
const { host, database, password, port, client_encoding } = require('pg/lib/defaults');
const app = express();
const PORT = 3000;
require('dotenv').config();

app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
});

app.listen(PORT, () => {
    console.log(`sever spinning at the door ${PORT}`);
});

app.get('/test-conection', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT 1');
        client.release();
        res.status(200).send('PostgresSQL connection successful!')
    } catch (err){
        console.error('Error connection to PostgresSQL;', err);
        res.status(500).send('Failed to connect to PostgreSQL');
    }
});

app.get('/users', async (req, res) => {
    const client = await pool.connect();
    const users = await client.query("SELECT id, name, email, password, created_at FROM users");
    res.status(200).send(users.rows);
});

app.post('/users', async (req, res) => {
    const client = await pool.connect()
    try{
        const {name, email, password} = req.body;
        const addUser = await client.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
            [name, email, password]
        );
        const newUser = addUser.rows[0];
        res.status(201).json({ massage: "User successfully created", user:newUser});
    } catch (error){
        console.error(error);
        res.status(500).json({ error: "Error creating user" });
    }
});

app.put('/users/:id', async (req, res) =>{
    const id = parseInt(req.params.id)
    const {name, email} = req.body
    const client = await pool.connect()

    try{
        const result = await pool.query('UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *', 
            [name, email, id]
        );
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else{
            res.status(404).send("User is not found ")}
        } catch (error){
            console.error(error);
            res.status(500).send("An error occurred while updating the user")
        }
});

app.delete('/users/:id', async (req, res) =>{
    const client = await pool.connect()
    const id = parseInt(req.params.id);
    try{
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0){
            res.json({message: "User successfully deleted", user: result.rows[0]})
        }
        else {
            res.status(404).send("User not found");
        }
    } catch (error){
        console.error(error);
        res.status(500).send("An error occurred while trying to delete the user");
    }

});

//Screen CEP with viacep
app.get('/CEP', async (req, res) => {
    const cep = req.query.cep;
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    try{
        const response = await fetch(url);
        const data = await response.json();
        if (data.erro){
            res.status(404).json({error: "ZIP code not found"});
        } else{
            const {cep, logradouro, localidade, uf} = data;
            res.status(200).json({cep, logradouro, localidade, uf});
        }
    } catch (error){
        res.status(500).json({error: "Error looking up the ZIP code"})
    }
});
