// ===============================
// CONFIG SUPABASE
// ===============================
const supabaseUrl = 'https://ctjlmweuplsgkgbgmoad.supabase.co';
const supabaseKey = 'sb_publishable_DJrfzGVemmqakKE9yJtfwA_HsaZtvR2';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// PRODUÇÃO - SOMAR POR DATA
// ===============================
async function salvarProducao() {

  const data = document.getElementById("data").value;
  const total = parseInt(document.getElementById("total").value);
  const fornos = parseInt(document.getElementById("fornos").value);

  if (!data || !total || !fornos) {
    alert("Preencha todos os campos.");
    return;
  }

  // Verifica se já existe produção na data
  const { data: existente } = await supabase
    .from('producao_semanal')
    .select('*')
    .eq('data', data);

  if (existente.length > 0) {
    // Soma os valores
    const novoTotal = existente[0].total + total;
    const novosFornos = existente[0].fornos + fornos;

    await supabase
      .from('producao_semanal')
      .update({
        total: novoTotal,
        fornos: novosFornos
      })
      .eq('data', data);

  } else {
    await supabase
      .from('producao_semanal')
      .insert([{ data, total, fornos }]);
  }

  // Atualiza estoque automaticamente
  await entradaEstoque(total);

  carregarProducao();
  carregarEstoque();

  alert("Produção salva com sucesso!");
}

// ===============================
// ESTOQUE
// ===============================

async function entradaEstoque(qtd) {

  const { data } = await supabase
    .from('estoque')
    .select('*')
    .limit(1);

  if (data.length === 0) {
    await supabase
      .from('estoque')
      .insert([{ quantidade: qtd }]);
  } else {
    const novaQtd = data[0].quantidade + qtd;

    await supabase
      .from('estoque')
      .update({
        quantidade: novaQtd,
        updated_at: new Date()
      })
      .eq('id', data[0].id);
  }

  await supabase
    .from('movimentacao_estoque')
    .insert([{ tipo: "entrada", quantidade: qtd, data: new Date() }]);
}

async function registrarSaida() {

  const qtd = parseInt(prompt("Quantidade de saída:"));

  if (!qtd || qtd <= 0) return;

  const { data } = await supabase
    .from('estoque')
    .select('*')
    .limit(1);

  if (data[0].quantidade < qtd) {
    alert("Estoque insuficiente!");
    return;
  }

  const novaQtd = data[0].quantidade - qtd;

  await supabase
    .from('estoque')
    .update({ quantidade: novaQtd })
    .eq('id', data[0].id);

  await supabase
    .from('movimentacao_estoque')
    .insert([{ tipo: "saida", quantidade: qtd, data: new Date() }]);

  carregarEstoque();
}

// ===============================
// CARREGAR DADOS
// ===============================

async function carregarProducao() {

  const { data } = await supabase
    .from('producao_semanal')
    .select('*')
    .order('data', { ascending: true });

  const tabela = document.getElementById("tabelaProducao");
  tabela.innerHTML = "";

  data.forEach(item => {
    tabela.innerHTML += `
      <tr>
        <td>${item.data}</td>
        <td>${item.total}</td>
        <td>${item.fornos}</td>
      </tr>
    `;
  });
}

async function carregarEstoque() {

  const { data } = await supabase
    .from('estoque')
    .select('*')
    .limit(1);

  if (data.length > 0) {
    document.getElementById("estoqueAtual").innerText = data[0].quantidade;
  }
}

// ===============================
// EXPORTAR EXCEL
// ===============================

async function exportarExcel() {

  const { data } = await supabase
    .from('producao_semanal')
    .select('*');

  let csv = "Data,Total,Fornos\n";

  data.forEach(linha => {
    csv += `${linha.data},${linha.total},${linha.fornos}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "producao.csv";
  a.click();
}

// ===============================
// GRÁFICO
// ===============================

let grafico;

async function gerarGrafico() {

  const { data } = await supabase
    .from('producao_semanal')
    .select('*')
    .order('data', { ascending: true });

  const labels = data.map(item => item.data);
  const valores = data.map(item => item.total);

  const ctx = document.getElementById('grafico').getContext('2d');

  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Produção',
        data: valores
      }]
    }
  });
}

// ===============================
// INICIALIZAÇÃO
// ===============================
carregarProducao();
carregarEstoque();