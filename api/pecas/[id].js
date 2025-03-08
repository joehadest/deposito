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

// Handler para a rota /api/pecas/[id]
module.exports = async (req, res) => {
    // Extrair ID da URL - verifica tanto query params quanto path params
    const id = req.query.id || (req.url.split('/').pop().split('?')[0]);

    console.log(`Requisição para /api/pecas/${id} - Método: ${req.method}`);

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

        // Validar o ID
        if (!id) {
            return res.status(400).json({ error: 'ID não fornecido', message: 'O ID da peça é obrigatório' });
        }

        // Verificar se o ID é válido para MongoDB
        let objectId;
        try {
            objectId = new ObjectId(id);
        } catch (idError) {
            console.error('ID inválido:', id, idError);
            return res.status(400).json({ error: 'ID inválido', message: `O ID fornecido não é válido: ${id}` });
        }

        switch (req.method) {
            case 'GET':
                // Obter uma peça específica
                const peca = await db.collection('pecas').findOne({ _id: objectId });

                if (!peca) {
                    return res.status(404).json({ error: 'Peça não encontrada' });
                }

                return res.status(200).json(peca);

            case 'PUT':
                // Atualizar uma peça
                const pecaAtualizada = req.body;

                if (!pecaAtualizada.nome || !pecaAtualizada.quantidade) {
                    return res.status(400).json({ error: 'Nome e quantidade são obrigatórios' });
                }

                await db.collection('pecas').updateOne(
                    { _id: objectId },
                    { $set: pecaAtualizada }
                );

                return res.status(200).json({
                    _id: id,
                    ...pecaAtualizada,
                    message: 'Peça atualizada com sucesso'
                });

            case 'DELETE':
                // Excluir uma peça
                console.log(`Tentando excluir peça com ID: ${id}`);

                try {
                    const resultado = await db.collection('pecas').deleteOne({ _id: objectId });

                    console.log('Resultado da exclusão:', resultado);

                    if (resultado.deletedCount === 0) {
                        return res.status(404).json({
                            error: 'Peça não encontrada',
                            message: `Nenhuma peça foi encontrada com o ID ${id}`
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        message: 'Peça excluída com sucesso',
                        id: id
                    });
                } catch (deleteError) {
                    console.error(`Erro ao excluir peça ID ${id}:`, deleteError);
                    return res.status(500).json({
                        error: 'Falha na operação de exclusão',
                        message: deleteError.message,
                        id: id
                    });
                }

            default:
                return res.status(405).json({ error: `Método ${req.method} não permitido` });
        }
    } catch (error) {
        console.error(`Erro em /api/pecas/${id}:`, error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
