// ===============================
// CONFIG SUPABASE
// ===============================
const supabaseUrl = 'https://ctjlmweuplsgkgbgmoad.supabase.co';
const supabaseKey = 'SUA_CHAVE_AQUI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// FATORES DOS TIJOLOS
// ===============================

const fatores = {
  "09X19X19": 0.75,
  "09X19X25": 0.99,
  "11,5X19X19": 0.96,
  "11,5X19X25": 1.26,
  "14X19X19": 1.17,
  "14X19X25": 1.54,
  "19X9X19": 1
};

// ===============================
// CONTROLE DE TELA
// ===============================

function entrarSistema(){
  document.getElementById("startScreen").style.display="none";
  document.getElementById("sistema").classList.remove("hidden");
}

function mostrarSecao(secao){
  document.querySelectorAll(".box").forEach(s => s.classList.add("hidden"));
  document.getElementById(secao).classList.remove("hidden");
}

// ===============================
// TIPOS DE TIJOLO
// ===============================

async function cadastrarTipo(){

  const nome = document.getElementById("novoTipo").value;

  if(!nome) return alert("Digite um nome.");

  await supabase.from("tipos").insert([{ nome }]);

  document.getElementById("novoTipo").value="";

  carregarTipos();
}

async function carregarTipos(){

  const { data } = await supabase.from("tipos").select("*").order("id");

  const tabela = document.getElementById("tabelaTipos");

  const selects = ["tipoDiaria","tipoSemanal","tipoSaida"];

  tabela.innerHTML="";

  selects.forEach(id => document.getElementById(id).innerHTML="");

  data.forEach(tipo=>{

    tabela.innerHTML += `<tr><td>${tipo.id}</td><td>${tipo.nome}</td></tr>`;

    selects.forEach(id=>{
      document.getElementById(id).innerHTML += 
      `<option value="${tipo.id}">${tipo.nome}</option>`;
    });

  });
}

// ===============================
// PRODUÇÃO DIÁRIA
// ===============================

async function salvarDiaria(){

  const data = document.getElementById("dataDiaria").value;
  const tipo_id = document.getElementById("tipoDiaria").value;
  const produzido = parseInt(document.getElementById("produzido").value);
  const descarte = parseInt(document.getElementById("descarte").value);
  const horas_paradas = parseFloat(document.getElementById("horasParadas").value);

  if(!data || !tipo_id || !produzido) 
    return alert("Preencha os campos obrigatórios.");

  const liquido = produzido - (descarte || 0);

  await supabase.from("producao_diaria").insert([{
    data,
    tipo_id,
    produzido,
    descarte: descarte || 0,
    liquido,
    horas_paradas: horas_paradas || 0
  }]);

  alert("Produção diária registrada.");
}

// ===============================
// PRODUÇÃO SEMANAL
// ===============================

async function salvarSemanal(){

  const data = document.getElementById("dataSemanal").value;
  const tipo_id = document.getElementById("tipoSemanal").value;
  const quantidade = parseInt(document.getElementById("quantidadeQueimada").value);
  const fornos = parseInt(document.getElementById("fornos").value);

  if(!data || !tipo_id || !quantidade) 
    return alert("Preencha os campos obrigatórios.");

  // buscar nome do tipo
  const { data: tipoData } = await supabase
    .from("tipos")
    .select("nome")
    .eq("id", tipo_id)
    .single();

  const nomeTipo = tipoData.nome;

  // fator do tijolo
  const fator = fatores[nomeTipo] || 1;

  // equivalente para controle de forno
  const equivalente = quantidade * fator;

  await supabase.from("producao_semanal").insert([{
    data,
    tipo_id,
    quantidade,
    equivalente,
    fornos: fornos || 0
  }]);

  // estoque recebe quantidade REAL
  await atualizarEstoque(tipo_id, quantidade);

  alert(`Produção semanal registrada.

Equivalente forno: ${Math.round(equivalente)}`);
}

// ===============================
// ESTOQUE
// ===============================

async function atualizarEstoque(tipo_id, qtd){

  const { data } = await supabase
    .from("estoque")
    .select("*")
    .eq("tipo_id", tipo_id);

  if(data.length === 0){

    await supabase.from("estoque")
    .insert([{ tipo_id, quantidade: qtd }]);

  }else{

    const novaQtd = data[0].quantidade + qtd;

    await supabase.from("estoque")
    .update({ quantidade: novaQtd })
    .eq("tipo_id", tipo_id);

  }

  carregarEstoque();
}

async function carregarEstoque(){

  const { data } = await supabase
    .from("estoque")
    .select("quantidade, tipos(nome)")
    .order("tipo_id");

  const tabela = document.getElementById("tabelaEstoque");

  tabela.innerHTML="";

  data.forEach(item=>{

    tabela.innerHTML += `
      <tr>
        <td>${item.tipos.nome}</td>
        <td>${item.quantidade}</td>
      </tr>
    `;

  });

}

// ===============================
// SAÍDA DE ESTOQUE
// ===============================

async function registrarSaida(){

  const tipo_id = document.getElementById("tipoSaida").value;
  const qtd = parseInt(document.getElementById("quantidadeSaida").value);

  if(!qtd || qtd<=0) return alert("Quantidade inválida.");

  const { data } = await supabase
    .from("estoque")
    .select("*")
    .eq("tipo_id", tipo_id);

  if(data.length === 0 || data[0].quantidade < qtd)
    return alert("Estoque insuficiente.");

  const novaQtd = data[0].quantidade - qtd;

  await supabase.from("estoque")
    .update({ quantidade: novaQtd })
    .eq("tipo_id", tipo_id);

  await supabase.from("saidas_estoque").insert([{
    tipo_id,
    quantidade: qtd,
    data: new Date()
  }]);

  carregarEstoque();

  alert("Saída registrada.");
}

// ===============================
// GRÁFICOS
// ===============================

let grafico;

async function gerarGrafico(filtro){

  const { data } = await supabase
    .from("producao_diaria")
    .select("*")
    .order("data");

  let agrupado = {};

  data.forEach(item=>{

    let chave;

    if(filtro==="dia") chave = item.data;
    if(filtro==="mes") chave = item.data.slice(0,7);
    if(filtro==="ano") chave = item.data.slice(0,4);

    agrupado[chave] = (agrupado[chave] || 0) + item.liquido;

  });

  const labels = Object.keys(agrupado);
  const valores = Object.values(agrupado);

  const ctx = document.getElementById("grafico").getContext("2d");

  if(grafico) grafico.destroy();

  grafico = new Chart(ctx,{
    type:"bar",
    data:{
      labels,
      datasets:[{
        label:"Produção Líquida",
        data:valores
      }]
    }
  });

}

// ===============================
// INICIALIZAÇÃO
// ===============================

carregarTipos();
carregarEstoque();