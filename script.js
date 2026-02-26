document.addEventListener("DOMContentLoaded", async function () {

// ================= NAVEGAÇÃO MENU =================

document.querySelectorAll(".menu button").forEach(btn=>{
 btn.addEventListener("click",function(){

  const tela=this.getAttribute("data-tela");

  document.querySelectorAll(".content > div").forEach(div=>{
   div.classList.add("hidden");
  });

  const alvo=document.getElementById(tela);
  if(alvo){
   alvo.classList.remove("hidden");
  }

 });
});

// ================= TIPOS =================

const tipos=[
 {n:"09x19x19",f:0.75},
 {n:"09x19x25",f:0.99},
 {n:"11,5x19x19",f:0.96},
 {n:"11,5x19x25",f:1.26},
 {n:"14x19x19",f:1.17},
 {n:"14x19x25",f:1.54}
];

let diariaDB=[];
let semanalDB=[];

// ================= SUPABASE =================

const SUPABASE_URL = "https://ctjlmweuplsgkgbgmoad.supabase.co";
const SUPABASE_KEY = "sb_publishable_DJrfzGVemmqakKE9yJtfwA_HsaZtvR2";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ================= ELEMENTOS =================

const tabelaDiaria=document.getElementById("tabelaDiaria");
const tabelaSemanal=document.getElementById("tabelaSemanal");
const dataDiaria=document.getElementById("dataDiaria");
const dataSemanal=document.getElementById("dataSemanal");
const qtdFornos=document.getElementById("qtdFornos");
const totalLiquido=document.getElementById("totalLiquido");

// ================= CRIAR TABELAS =================

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

// ================= CARREGAR BANCO =================

async function carregarDados(){

 const { data: diaria } = await supabase.from("producao_diaria").select("*");
 const { data: semanal } = await supabase.from("producao_semanal").select("*");

 diariaDB = diaria || [];
 semanalDB = semanal || [];

 atualizarPainel();
}

await carregarDados();

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
  totalLiquido.innerText=t;
 };
}

window.salvarDiaria=async function(){

 const horasParadas=+document.getElementById("horasParadas")?.value||0;

 const { error } = await supabase
  .from("producao_diaria")
  .insert([{
    data:dataDiaria.value,
    total:+totalLiquido.innerText,
    horas_paradas:horasParadas
  }]);

 if(error){
  alert("Erro ao salvar diária");
  console.log(error);
  return;
 }

 await carregarDados();
 toastMsg();
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

window.salvarSemanal=async function(){

 let total=0;

 document.querySelectorAll("#tabelaSemanal tr").forEach((r,i)=>{
  const q=+r.querySelector(".qtd")?.value||0;
  total+=q*tipos[i].f;
 });

 const { error } = await supabase
  .from("producao_semanal")
  .insert([{
    data:dataSemanal.value,
    total:Math.round(total),
    fornos:+qtdFornos.value||0
  }]);

 if(error){
  alert("Erro ao salvar semanal");
  console.log(error);
  return;
 }

 await carregarDados();
 toastMsg();
}

// ================= PAINEL =================

function atualizarPainel(){
 const totalDiario=diariaDB.reduce((s,r)=>s+r.total,0);
 const totalSemanal=semanalDB.reduce((s,r)=>s+r.total,0);
 const tf=semanalDB.reduce((s,r)=>s+(r.fornos||0),0);

 document.getElementById("totalDiario").innerText=totalDiario;
 document.getElementById("totalSemanal").innerText=totalSemanal;
 document.getElementById("totalFornos").innerText=tf;
 document.getElementById("eficienciaForno").innerText=tf?(totalSemanal/tf).toFixed(2):0;
}

// ================= TOAST =================

function toastMsg(){
 const t=document.getElementById("toast");
 if(!t) return;
 t.style.display="block";
 setTimeout(()=>t.style.display="none",2000);
}

});

window.entrar = function () {
  document.getElementById("start").style.display = "none";
  document.getElementById("sistema").classList.remove("hidden");
};