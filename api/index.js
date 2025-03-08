const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

// Configuração do servidor Express
const app = express();
app.use(express.json());
app.use(cors());

// Variável para conexão MongoDB
let cachedDb = null;

// Função para conectar ao MongoDB
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        throw new Error('Defina a variável de ambiente MONGODB_URI');
    }

    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(new URL(MONGODB_URI).pathname.substr(1));

    cachedDb = db;
    return db;
}

// Rota para listar todas as peças
app.get('/api/pecas', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const pecas = await db.collection('pecas').find({}).toArray();
        res.json(pecas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para adicionar uma peça
app.post('/api/pecas', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const novaPeca = req.body;
        const result = await db.collection('pecas').insertOne(novaPeca);
        res.status(201).json({ id: result.insertedId, ...novaPeca });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar uma peça
app.put('/api/pecas/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { id } = req.params;
        const pecaAtualizada = req.body;

        await db.collection('pecas').updateOne(
            { _id: new ObjectId(id) },
            { $set: pecaAtualizada }
        );

        res.json({ id, ...pecaAtualizada });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para excluir uma peça
app.delete('/api/pecas/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { id } = req.params;

        await db.collection('pecas').deleteOne({ _id: new ObjectId(id) });

        res.json({ message: 'Peça excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handler para serverless
module.exports = app;
