<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgroTrade VIP - Painel do Trader</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-[#0f172a] text-slate-100 min-h-screen flex flex-col">

    <!-- Top Navigation / Header -->
    <header class="bg-[#1e293b] border-b border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <div class="flex items-center gap-2">
            <span class="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">AgroTrade Pro</span>
        </div>
        <div class="flex items-center gap-3">
            <button onclick="openAccountModal()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 text-emerald-400">👤 Menu da Conta</button>
            <a href="admin.html" class="text-xs bg-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700">Admin</a>
        </div>
    </header>

    <!-- Commodities Horizontal Menu -->
    <nav class="bg-[#162032] border-b border-slate-800 px-4 py-3 overflow-x-auto flex gap-3 no-scrollbar">
        <button onclick="selectCommodity('Café', 450, 12.5)" class="commodity-btn active-tab bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shadow-lg">Café</button>
        <button onclick="selectCommodity('Trigo', 320, 8.2)" class="commodity-btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap">Trigo</button>
        <button onclick="selectCommodity('Feijão', 210, 15.4)" class="commodity-btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap">Feijão</button>
        <button onclick="selectCommodity('Arroz', 540, 8.1)" class="commodity-btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap">Arroz</button>
        <button onclick="selectCommodity('Rapadura', 180, 4.5)" class="commodity-btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap">Rapadura</button>
        <button onclick="selectCommodity('Farinha', 350, 7.8)" class="commodity-btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap">Farinha</button>
        <button onclick="selectCommodity('Bolacha', 190, 9.3)" class="commodity-btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap">Bolacha</button>
    </nav>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto w-full p-4 flex-1 space-y-4">

        <!-- Saldo Card -->
        <div class="bg-[#1e293b] border border-slate-800 p-5 rounded-2xl shadow-xl flex justify-between items-center">
            <div>
                <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">Saldo Disponível (Cloudflare D1)</p>
                <h2 id="user-balance" class="text-2xl font-black text-emerald-400 mt-1">100 ZPay ($ZP)</h2>
                <p id="user-welcome" class="text-xs text-slate-400 mt-0.5">Bem-vindo, Carregando...</p>
            </div>
            <button onclick="alert('Funcionalidade de depósito ZPay via API ativa!')" class="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/25 transition">
                + Comprar ZPay
            </button>
        </div>

        <!-- Ativo Selecionado & Live Counters -->
        <div class="bg-[#1e293b] border border-slate-800 p-5 rounded-2xl space-y-4">
            <div class="flex justify-between items-center">
                <span class="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Ativo em Tempo Real</span>
                <span id="selected-title" class="text-xl font-bold text-white">Saca de Café (Arábica)</span>
            </div>
            <div class="text-right">
                <span class="text-xs text-slate-400 block">Cotação Atual</span>
                <span id="live-price" class="text-lg font-bold text-amber-400">450.00 $ZP</span>
            </div>

            <!-- Botões com Números Subindo em Cores -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-red-950/40 border border-red-500/30 p-3 rounded-xl text-center">
                    <span class="text-xs text-red-400 block">Vendas</span>
                    <span id="counter-red" class="text-lg font-bold text-red-300">1,240 kg</span>
                </div>
                <div class="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-center">
                    <span class="text-xs text-emerald-400 block">Compras</span>
                    <span id="counter-green" class="text-lg font-bold text-emerald-300">3,830 sacas</span>
                </div>
                <div class="bg-blue-950/40 border border-blue-500/30 p-3 rounded-xl text-center">
                    <span class="text-xs text-blue-400 block">Volume Total</span>
                    <span id="counter-blue" class="text-lg font-bold text-blue-300">14.2K $ZP</span>
                </div>
                <div class="bg-slate-800 border border-slate-700 p-3 rounded-xl text-center">
                    <span class="text-xs text-slate-400 block">Tendência</span>
                    <span id="counter-white" class="text-lg font-bold text-slate-100">+4.8%</span>
                </div>
            </div>

            <!-- Input de Operação -->
            <div>
                <label class="block text-xs text-slate-400 mb-1">Valor da Operação em Milhões ($ZP)</label>
                <input type="number" id="op-value" value="10" class="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>

            <!-- Botões Comprar / Vender -->
            <div class="grid grid-cols-2 gap-3">
                <button onclick="executaTrade('COMPRAR')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition flex flex-col items-center">
                    <span>🟢 COMPRAR</span>
                    <span class="text-xs font-normal opacity-80">Aposta em Alta (Bullish)</span>
                </button>
                <button onclick="executaTrade('VENDER')" class="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition flex flex-col items-center">
                    <span>🔴 VENDER</span>
                    <span class="text-xs font-normal opacity-80">Aposta em Baixa</span>
                </button>
            </div>
        </div>

    </main>

    <!-- Script de Gestão Dinâmica e Dados do D1 -->
    <script>
        let currentCommodity = "Café";
        let currentPrice = 450;

        function selectCommodity(name, price, trend) {
            currentCommodity = name;
            currentPrice = price;
            document.getElementById('selected-title').innerText = "Saca de " + name;
            document.getElementById('live-price').innerText = price.toFixed(2) + " $ZP";
            document.getElementById('counter-white').innerText = "+" + trend + "%";
            
            // Atualiza classes ativas dos botões do menu
            document.querySelectorAll('.commodity-btn').forEach(btn => {
                btn.classList.remove('bg-emerald-600', 'text-white', 'shadow-lg');
                btn.classList.add('bg-slate-800', 'text-slate-300');
                if(btn.innerText.includes(name)) {
                    btn.classList.add('bg-emerald-600', 'text-white', 'shadow-lg');
                    btn.classList.remove('bg-slate-800', 'text-slate-300');
                }
            });
        }

        function executaTrade(type) {
            const val = parseFloat(document.getElementById('op-value').value) || 0;
            alert("Operação de " + type + " registada com sucesso em " + currentCommodity + " no valor de " + val + " $ZP!");
        }

        function openAccountModal() {
            const user = JSON.parse(localStorage.getItem('agro_user') || '{}');
            alert("Conta: " + (user.username || 'Utilizador') + "\nE-mail: " + (user.email || 'N/A') + "\nSaldo Atual: " + (user.balance || 100) + " ZPay");
        }

        // Simulação de contadores automáticos a subir em tempo real
        setInterval(() => {
            const r = document.getElementById('counter-red');
            const g = document.getElementById('counter-green');
            if(r && g) {
                let rv = parseInt(r.innerText.replace(/[^0-9]/g, '')) + Math.floor(Math.random() * 5);
                let gv = parseInt(g.innerText.replace(/[^0-9]/g, '')) + Math.floor(Math.random() * 8);
                r.innerText = rv.toLocaleString() + " kg";
                g.innerText = gv.toLocaleString() + " sacas";
            }
        }, 3000);

        // Carregar dados reais do utilizador guardados no Login / Nuvem D1
        window.addEventListener('DOMContentLoaded', () => {
            const savedUser = localStorage.getItem('agro_user');
            if (savedUser) {
                try {
                    const user = JSON.parse(savedUser);
                    const welcomeEl = document.getElementById('user-welcome');
                    if (welcomeEl) {
                        welcomeEl.innerText = "Bem-vindo, " + user.username + " (" + user.email + ")";
                    }
                    const balanceEl = document.getElementById('user-balance');
                    if (balanceEl && user.balance !== undefined) {
                        balanceEl.innerText = user.balance + ' ZPay ($ZP)';
                    }
                } catch (e) {
                    console.error('Erro ao carregar utilizador', e);
                }
            }
        });
    </script>
</body>
</html>
