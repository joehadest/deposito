// Elementos DOM
const pecaForm = document.getElementById('pecaForm');
const pecasList = document.getElementById('pecasList');
const emptyMessage = document.getElementById('emptyMessage');
const toggleFormBtn = document.getElementById('toggleForm');
const formContainer = document.getElementById('formContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');
const cancelEdit = document.getElementById('cancelEdit');

// Estado da aplicação
let pecas = [];
let pecaEditando = null;

// Funções Auxiliares
function formatMoeda(valor) {
    if (!valor) return '-';
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
}

function mostrarMensagemVazia() {
    if (pecas.length === 0) {
        emptyMessage.style.display = 'flex';
    } else {
        emptyMessage.style.display = 'none';
    }
}

// Função para mostrar notificações com informações de erro
function mostrarNotificacao(mensagem, tipo) {
    // Remover notificações anteriores
    const notificacoesAnteriores = document.querySelectorAll('.notificacao');
    notificacoesAnteriores.forEach(n => n.remove());

    // Criar nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao ${tipo}`;
    notificacao.innerHTML = `
        <span>${mensagem}</span>
        <button class="fechar-notificacao">&times;</button>
    `;

    document.body.appendChild(notificacao);

    // Mostrar a notificação com um pequeno delay para o efeito de animação
    setTimeout(() => {
        notificacao.classList.add('show');
    }, 10);

    // Fechar evento
    notificacao.querySelector('.fechar-notificacao').addEventListener('click', () => {
        notificacao.classList.remove('show');
        setTimeout(() => {
            notificacao.remove();
        }, 300);
    });

    // Fechar automaticamente após 5 segundos
    setTimeout(() => {
        if (document.body.contains(notificacao)) {
            notificacao.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notificacao)) {
                    notificacao.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Manipulação da Interface
function toggleForm() {
    formContainer.classList.toggle('show');
    if (formContainer.classList.contains('show')) {
        toggleFormBtn.innerHTML = '<i class="fas fa-minus"></i> Ocultar Formulário';
    } else {
        toggleFormBtn.innerHTML = '<i class="fas fa-plus"></i> Nova Peça';
    }
}

function abrirModalEdicao(peca) {
    pecaEditando = peca;
    document.getElementById('editId').value = peca._id;
    document.getElementById('editNome').value = peca.nome;
    document.getElementById('editDescricao').value = peca.descricao || '';
    document.getElementById('editQuantidade').value = peca.quantidade;
    document.getElementById('editPreco').value = peca.preco || '';
    document.getElementById('editLocalizacao').value = peca.localizacao || '';
    editModal.style.display = 'block';
}

function fecharModalEdicao() {
    editModal.style.display = 'none';
    pecaEditando = null;
}

// Renderização
function renderizarPecas(listaPecas) {
    pecasList.innerHTML = '';

    if (listaPecas.length === 0) {
        emptyMessage.style.display = 'flex';
        return;
    }

    emptyMessage.style.display = 'none';

    listaPecas.forEach(peca => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${peca.nome}</td>
      <td>${peca.descricao || '-'}</td>
      <td>${peca.quantidade}</td>
      <td>${formatMoeda(peca.preco)}</td>
      <td>${peca.localizacao || '-'}</td>
      <td class="action-buttons">
        <button class="btn btn-primary btn-small edit-btn" data-id="${peca._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-small delete-btn" data-id="${peca._id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

        pecasList.appendChild(tr);

        // Adicionar event listeners aos botões
        tr.querySelector('.edit-btn').addEventListener('click', () => abrirModalEdicao(peca));
        tr.querySelector('.delete-btn').addEventListener('click', () => confirmarExclusao(peca));
    });
}

function confirmarExclusao(peca) {
    if (confirm(`Deseja realmente excluir "${peca.nome}"?`)) {
        deletarPeca(peca._id);
    }
}

// Operações com API
async function buscarPecas() {
    try {
        const response = await fetch('/api/pecas');

        // Verificar se a resposta é bem-sucedida
        if (!response.ok) {
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro desconhecido ao buscar peças');
            } else {
                const errorText = await response.text();
                throw new Error(`Erro do servidor: ${errorText.substring(0, 100)}`);
            }
        }

        pecas = await response.json();
        renderizarPecas(pecas);
    } catch (error) {
        console.error('Erro ao buscar peças:', error);
        mostrarNotificacao(`Falha ao carregar peças: ${error.message}`, 'error');

        // Mostrar interface vazia
        pecas = [];
        renderizarPecas(pecas);
    }
}

async function adicionarPeca(novaPeca) {
    try {
        const response = await fetch('/api/pecas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novaPeca)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensagem || 'Erro ao adicionar peça');
        }

        const pecaAdicionada = await response.json();
        pecas.unshift(pecaAdicionada); // Adiciona no início da lista
        renderizarPecas(pecas);
        pecaForm.reset();

        // Se o formulário estava visível, mantém visível
        if (!formContainer.classList.contains('show')) {
            toggleForm();
        }

        mostrarNotificacao('Peça adicionada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao adicionar peça:', error);
        mostrarNotificacao(`Erro ao adicionar peça: ${error.message}`, 'error');
    }
}

async function atualizarPeca(id, dadosAtualizados) {
    try {
        const response = await fetch(`/api/pecas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensagem || 'Erro ao atualizar peça');
        }

        const pecaAtualizada = await response.json();

        // Atualiza a lista local
        const index = pecas.findIndex(p => p._id === id);
        if (index !== -1) {
            pecas[index] = pecaAtualizada;
        }

        renderizarPecas(pecas);
        fecharModalEdicao();

        mostrarNotificacao('Peça atualizada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar peça:', error);
        mostrarNotificacao(`Erro ao atualizar peça: ${error.message}`, 'error');
    }
}

async function deletarPeca(id) {
    try {
        const response = await fetch(`/api/pecas/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensagem || 'Erro ao excluir peça');
        }

        // Remove da lista local
        pecas = pecas.filter(p => p._id !== id);
        renderizarPecas(pecas);

        mostrarNotificacao('Peça removida com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao remover peça:', error);
        mostrarNotificacao(`Erro ao remover peça: ${error.message}`, 'error');
    }
}

function filtrarPecas() {
    const termo = searchInput.value.trim().toLowerCase();

    if (!termo) {
        renderizarPecas(pecas);
        return;
    }

    const pecasFiltradas = pecas.filter(peca =>
        peca.nome.toLowerCase().includes(termo) ||
        (peca.descricao && peca.descricao.toLowerCase().includes(termo)) ||
        (peca.localizacao && peca.localizacao.toLowerCase().includes(termo))
    );

    renderizarPecas(pecasFiltradas);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    buscarPecas();

    toggleFormBtn.addEventListener('click', toggleForm);

    pecaForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const novaPeca = {
            nome: document.getElementById('nome').value,
            descricao: document.getElementById('descricao').value,
            quantidade: parseInt(document.getElementById('quantidade').value),
            preco: parseFloat(document.getElementById('preco').value) || undefined,
            localizacao: document.getElementById('localizacao').value
        };

        adicionarPeca(novaPeca);
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('editId').value;
        const dadosAtualizados = {
            nome: document.getElementById('editNome').value,
            descricao: document.getElementById('editDescricao').value,
            quantidade: parseInt(document.getElementById('editQuantidade').value),
            preco: parseFloat(document.getElementById('editPreco').value) || undefined,
            localizacao: document.getElementById('editLocalizacao').value
        };

        atualizarPeca(id, dadosAtualizados);
    });

    searchBtn.addEventListener('click', filtrarPecas);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            filtrarPecas();
        }
    });

    closeModal.addEventListener('click', fecharModalEdicao);
    cancelEdit.addEventListener('click', fecharModalEdicao);

    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            fecharModalEdicao();
        }
    });
});
