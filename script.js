// ===============================
// CONFIG SUPABASE
// ===============================
const supabaseUrl = 'https://ctjlmweuplsgkgbgmoad.supabase.co';
const supabaseKey = 'sb_publishable_DJrfzGVemmqakKE9yJtfwA_HsaZtvR2';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

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

  await db.from("tipos").insert([{ nome }]);

  document.getElementById("novoTipo").value="";

  carregarTipos();
}

async function carregarTipos(){

  const { data } = await db.from("tipos").select("*").order("id");

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

  await db.from("producao_diaria").insert([{
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
  const { data: tipoData } = await db
    .from("tipos")
    .select("nome")
    .eq("id", tipo_id)
    .single();

  const nomeTipo = tipoData.nome;

  // fator do tijolo
  const fator = fatores[nomeTipo] || 1;

  // equivalente para controle de forno
  const equivalente = quantidade * fator;

  await db.from("producao_semanal").insert([{
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

  const { data } = await db
    .from("estoque")
    .select("*")
    .eq("tipo_id", tipo_id);

  if(data.length === 0){

    await db.from("estoque")
    .insert([{ tipo_id, quantidade: qtd }]);

  }else{

    const novaQtd = data[0].quantidade + qtd;

    await db.from("estoque")
    .update({ quantidade: novaQtd })
    .eq("tipo_id", tipo_id);

  }

  carregarEstoque();
}

async function carregarEstoque(){

  const { data } = await db
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

  const { data } = await db
    .from("estoque")
    .select("*")
    .eq("tipo_id", tipo_id);

  if(data.length === 0 || data[0].quantidade < qtd)
    return alert("Estoque insuficiente.");

  const novaQtd = data[0].quantidade - qtd;

  await db.from("estoque")
    .update({ quantidade: novaQtd })
    .eq("tipo_id", tipo_id);

  await db.from("saidas_estoque").insert([{
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

let grafico = null;

async function gerarGrafico(filtro){

  let labels = [];
  let valores = [];

  const canvas = document.getElementById("grafico");

  if(!canvas){
    console.error("Canvas não encontrado");
    return;
  }

  const ctx = canvas.getContext("2d");

  // destruir gráfico anterior com segurança
  if(grafico && typeof grafico.destroy === "function"){
    grafico.destroy();
    grafico = null;
  }

  // ================= DIA =================
  if(filtro === "dia"){

    const { data, error } = await db
      .from("producao_diaria")
      .select("data, liquido")
      .order("data");

    if(error || !data) return alert("Erro ao carregar dados.");

    let agrupado = {};

    data.forEach(item=>{
      agrupado[item.data] = (agrupado[item.data] || 0) + item.liquido;
    });

    labels = Object.keys(agrupado).sort();
    valores = Object.values(agrupado);
  }

  // ================= MÊS =================
  if(filtro === "mes"){

    const mesSelecionado = document.getElementById("filtroMes").value;

    if(!mesSelecionado){
      alert("Selecione um mês.");
      return;
    }

    const { data, error } = await db
      .from("producao_semanal")
      .select("data, quantidade, fornos")
      .gte("data", mesSelecionado + "-01")
      .lte("data", mesSelecionado + "-31")
      .order("data");

    if(error || !data) return alert("Erro ao carregar dados.");

    let producaoDia = {};
    let fornosDia = {};

    data.forEach(item=>{
      const dia = item.data;

      producaoDia[dia] = (producaoDia[dia] || 0) + item.quantidade;
      fornosDia[dia] = (fornosDia[dia] || 0) + (item.fornos || 0);
    });

    labels = Object.keys(producaoDia).sort();

    const valoresProducao = labels.map(dia => producaoDia[dia]);
    const valoresFornos = labels.map(dia => fornosDia[dia]);

    grafico = new Chart(ctx,{
      type:"bar",
      data:{
        labels:labels,
        datasets:[
          {
            label:"Produção",
            data:valoresProducao,
            backgroundColor:"#008c4a"
          },
          {
            label:"Fornos",
            data:valoresFornos,
            backgroundColor:"#d66a00"
          }
        ]
      },
      options:{
        responsive:true,
        scales:{
          y:{beginAtZero:true}
        }
      }
    });

    return;
  }

  // ================= ANO =================
  if(filtro === "ano"){

    const { data, error } = await db
      .from("producao_semanal")
      .select("data, quantidade")
      .order("data");

    if(error || !data) return alert("Erro ao carregar dados.");

    let agrupado = {};

    data.forEach(item=>{
      const ano = item.data.slice(0,4);
      agrupado[ano] = (agrupado[ano] || 0) + item.quantidade;
    });

    labels = Object.keys(agrupado).sort();
    valores = Object.values(agrupado);
  }

  grafico = new Chart(ctx,{
    type:"bar",
    data:{
      labels:labels,
      datasets:[{
        label:"Produção",
        data:valores,
        backgroundColor:"#008c4a"
      }]
    },
    options:{
      responsive:true,
      scales:{
        y:{beginAtZero:true}
      }
    }
  });
}

// ===============================
// DEFINIR MÊS AUTOMÁTICO
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const inputMes = document.getElementById("filtroMes");
  if(inputMes){
    inputMes.value = new Date().toISOString().slice(0,7);
  }
});




// ===============================
// INICIALIZAÇÃO
// ===============================

carregarTipos();
carregarEstoque();