document.addEventListener("DOMContentLoaded", function () {

const tipos=[
 {n:"09x19x19",f:0.75},
 {n:"09x19x25",f:0.99},
 {n:"11,5x19x19",f:0.96},
 {n:"11,5x19x25",f:1.26},
 {n:"14x19x19",f:1.17},
 {n:"14x19x25",f:1.54}
];

let diariaDB=JSON.parse(localStorage.getItem("diaria"))||[];
let semanalDB=JSON.parse(localStorage.getItem("semanal"))||[];
let estoqueDB=JSON.parse(localStorage.getItem("estoque"))||{};
tipos.forEach(t=>estoqueDB[t.n]??=0);

const tabelaDiaria=document.getElementById("tabelaDiaria");
const tabelaSemanal=document.getElementById("tabelaSemanal");
const tabelaEstoque=document.getElementById("tabelaEstoque");

const SUPABASE_URL = "https://ctjlmweuplsgkgbgmoad.supabase.co";
const SUPABASE_KEY = "sb_publishable_DJrfzGVemmqakKE9yJtfwA_HsaZtvR2";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ================= TABELAS =================

tipos.forEach(t=>{
 if(tabelaDiaria){
  tabelaDiaria.innerHTML+=`
  <tr>
   <td>${t.n}</td>
   <td><input class="prod" type="number"></td>
   <td><input class="desc" type="number"></td>
   <td class="liq">0</td>
  </tr>`;
 }

 if(tabelaSemanal){
  tabelaSemanal.innerHTML+=`
  <tr>
   <td>${t.n}</td>
   <td><input class="qtd" type="number"></td>
   <td>${t.f}</td>
   <td class="eq">0</td>
  </tr>`;
 }
});

// ================= DIARIA =================

if(tabelaDiaria){
 tabelaDiaria.oninput=()=>{
  let t=0;
  document.querySelectorAll("#tabelaDiaria tr").forEach(r=>{
   const p=+r.querySelector(".prod")?.value||0;
   const d=+r.querySelector(".desc")?.value||0;
   const l=Math.max(p-d,0);
   r.querySelector(".liq").innerText=l;
   t+=l;
  });
  document.getElementById("totalLiquido").innerText=t;
 };
}

// ================= SEMANAL =================

if(tabelaSemanal){
 tabelaSemanal.oninput=()=>{
  let t=0;
  document.querySelectorAll("#tabelaSemanal tr").forEach((r,i)=>{
   const q=+r.querySelector(".qtd")?.value||0;
   const e=q*tipos[i].f;
   r.querySelector(".eq").innerText=e.toFixed(2);
   t+=e;
  });
  document.getElementById("totalEq").innerText=Math.round(t);
 };
}

// ================= FUNÇÕES =================

window.salvarDiaria=function(){
 diariaDB.push({d:dataDiaria.value,total:+totalLiquido.innerText});
 localStorage.setItem("diaria",JSON.stringify(diariaDB));
 atualizarPainel();
 toastMsg();
}

window.salvarSemanal=function(){
 let total=0;
 document.querySelectorAll("#tabelaSemanal tr").forEach((r,i)=>{
  const q=+r.querySelector(".qtd")?.value||0;
  estoqueDB[tipos[i].n]+=q;
  total+=q*tipos[i].f;
 });
 semanalDB.push({d:dataSemanal.value,total:Math.round(total),fornos:+qtdFornos.value||0});
 localStorage.setItem("semanal",JSON.stringify(semanalDB));
 localStorage.setItem("estoque",JSON.stringify(estoqueDB));
 atualizarPainel();
 atualizarEstoque();
 toastMsg();
}

function atualizarPainel(){
 const totalDiario=diariaDB.reduce((s,r)=>s+r.total,0);
 const totalSemanal=semanalDB.reduce((s,r)=>s+r.total,0);
 const tf=semanalDB.reduce((s,r)=>s+(r.fornos||0),0);

 document.getElementById("totalDiario").innerText=totalDiario;
 document.getElementById("totalSemanal").innerText=totalSemanal;
 document.getElementById("totalFornos").innerText=tf;
 document.getElementById("eficienciaForno").innerText=tf?(totalSemanal/tf).toFixed(2):0;
}

function atualizarEstoque(){
 if(!tabelaEstoque) return;
 tabelaEstoque.innerHTML="";
 Object.entries(estoqueDB).forEach(([k,v])=>{
  tabelaEstoque.innerHTML+=`<tr><td>${k}</td><td>${v}</td></tr>`;
 });
}

window.entrar=function(){
 document.getElementById("start").style.display="none";
 document.getElementById("sistema").classList.remove("hidden");
 atualizarPainel();
 atualizarEstoque();
}


function toastMsg(){
 const t=document.getElementById("toast");
 if(!t) return;
 t.style.display="block";
 setTimeout(()=>t.style.display="none",2000);
}

// ================= TROCA DE TELAS =================

document.querySelectorAll(".menu button").forEach(btn => {
  btn.addEventListener("click", () => {

    // Esconde todas as telas
    document.querySelectorAll(".content > div").forEach(tela => {
      tela.classList.add("hidden");
    });

    // Mostra a tela clicada
    const telaID = btn.getAttribute("data-tela");
    document.getElementById(telaID).classList.remove("hidden");

  });
});

// ================= GRÁFICO =================

let grafico;

window.filtrarGrafico = function(tipo){

 const ctx = document.getElementById("grafico");

 let labels = [];
 let dados = [];

 if(tipo === "dia"){
   labels = diariaDB.map(r => r.d);
   dados = diariaDB.map(r => r.total);
 }

 if(tipo === "mes" || tipo === "ano"){
   labels = semanalDB.map(r => r.d);
   dados = semanalDB.map(r => r.total);
 }

 if(grafico) grafico.destroy();

 grafico = new Chart(ctx, {
   type: "bar",
   data: {
     labels: labels,
     datasets: [{
       label: "Produção",
       data: dados
     }]
   }
 });

}


});
