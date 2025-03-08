const { MongoClient, ObjectId } = require('mongodb');

// Variável para conexão MongoDB
let cachedDb = null;
let cachedClient = null;

// Função para conectar ao MongoDB
async function connectToDatabase() {
    try {
        if (cachedDb) {
            return cachedDb;
        }

        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('Variável de ambiente MONGODB_URI não definida');
        }

        console.log('Conectando ao MongoDB...');

        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        const client = await MongoClient.connect(MONGODB_URI, options);

        // Determinar o nome do banco de dados
        let dbName;
        try {
            const url = new URL(MONGODB_URI);
            dbName = url.pathname.substring(1);
        } catch (error) {
            const parts = MONGODB_URI.split('/');
            dbName = parts[parts.length - 1].split('?')[0];
        }

        if (!dbName) {
            dbName = 'inventory';
        }

        const db = client.db(dbName);

        // Teste de conexão
        await db.command({ ping: 1 });
        console.log('MongoDB conectado com sucesso');

        cachedClient = client;
        cachedDb = db;
        return db;
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        throw new Error(`Falha na conexão com MongoDB: ${error.message}`);
    }
}

// Handler para a rota GET /api/pecas
module.exports = async (req, res) => {
    console.log('Requisição para /api/pecas - Método:', req.method);

    // Permitir CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    // Responder a solicitações OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const db = await connectToDatabase();

        if (req.method === 'GET') {
            // Listar todas as peças
            console.log('Buscando peças no banco de dados...');
            const pecas = await db.collection('pecas').find({}).toArray();
            console.log(`Encontradas ${pecas.length} peças`);
            return res.status(200).json(pecas);
        }
        else if (req.method === 'POST') {
            // Adicionar nova peça
            const novaPeca = req.body;
            console.log('Adicionando peça:', novaPeca);

            if (!novaPeca.nome || !novaPeca.quantidade) {
                return res.status(400).json({ error: 'Nome e quantidade são obrigatórios' });
            }

            const result = await db.collection('pecas').insertOne(novaPeca);
            return res.status(201).json({
                _id: result.insertedId,
                ...novaPeca,
                message: 'Peça adicionada com sucesso'
            });
        }
        else {
            return res.status(405).json({ error: 'Método não permitido' });
        }
    } catch (error) {
        console.error('Erro no handler de peças:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
