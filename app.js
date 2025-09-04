// ====== Data & Initialization ======
let tasks = JSON.parse(localStorage.getItem("advTasksFlow") || "[]");
if (!tasks.length) tasks = [
  {id:"1", title:"Complete project proposal", desc:"Finish the Q1 project proposal and send to stakeholders", completed:false, priority:"high", category:"Work", due:"2025-09-05"},
  {id:"2", title:"Buy groceries", desc:"Milk, bread, eggs, and fruits for the week", completed:false, priority:"medium", category:"Personal", due:"2025-09-03"},
  {id:"3", title:"Review pull requests", desc:"Check latest PRs on the client repo", completed:true, priority:"low", category:"Work", due:"2025-09-02"}
];
let dragSrcIdx = null, selectedCategory = null;

// ====== Storage & Toast ======
function saveTasks() { localStorage.setItem("advTasksFlow", JSON.stringify(tasks)); }
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2100);
}

// ====== Category Tabs ======
function renderCategoryTabs() {
  const cats = Array.from(new Set(tasks.map(t=>t.category).filter(Boolean)));
  let html = '<button class="category-tab-btn'+(!selectedCategory?' active':'')+'" onclick="selectCategory(null)">All</button>';
  cats.forEach(cat => {
    html += `<button class="category-tab-btn${selectedCategory===cat?' active':''}" onclick="selectCategory('${cat}')">${cat}</button>`;
  });
  document.getElementById("categoryTabs").innerHTML = html;
}
window.selectCategory = function(cat) {
  selectedCategory = cat;
  renderCategoryTabs();
  renderCategories();
};

// ====== Categories Panel ======
function renderCategories() {
  let filtered = tasks.slice();
  if(selectedCategory) filtered = filtered.filter(t => t.category === selectedCategory);
  let cats = {};
  filtered.forEach(t=>{
    let x = t.category||'(none)';
    cats[x]=cats[x]||[];
    cats[x].push(t);
  });
  let html = "";
  Object.keys(cats).forEach(cat=>{
    html += `<li><b>${cat}</b> <span style="color:#7493d5;font-size:.96em;">(${cats[cat].length})</span>`;
    cats[cat].forEach(t=>{
      html += `<div style="margin-left:12px;">- ${t.title} <span style="color:#7ecffd;font-size:.85em;">[${t.priority}, ${t.completed?"✔":"❌"}]</span></div>`;
    });
    html += `</li>`;
  });
  document.getElementById("categoriesList").innerHTML = html;
}

// ====== Filter/Sort Selects ======
function renderCategoryOptions() {
  const cats = Array.from(new Set(tasks.map(t=>t.category).filter(Boolean)));
  document.getElementById("categoryFilter").innerHTML =
    `<option value="all">All Categories</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
  document.getElementById("categoryDataList").innerHTML =
    cats.map(c => `<option value="${c}">`).join("");
}

// ====== Task List Rendering ======
function renderTasks() {
  renderCategoryOptions();
  let list = tasks.slice();
  const searchVal = (document.getElementById("searchInput").value||"").trim().toLowerCase();
  if (searchVal)
    list = list.filter(t => t.title.toLowerCase().includes(searchVal) || (t.desc||"").toLowerCase().includes(searchVal));
  const status = document.getElementById("statusFilter").value;
  if (status !== "all") list = list.filter(t=>status==="completed"?t.completed:!t.completed);
  const priority = document.getElementById("priorityFilter").value;
  if (priority !== "all") list = list.filter(t => t.priority === priority);
  const cat = document.getElementById("categoryFilter").value;
  if (cat && cat !== "all") list = list.filter(t => t.category === cat);

  const sort = document.getElementById("sortFilter").value;
  if (sort === "due") list.sort((a,b)=>(a.due||"").localeCompare(b.due||""));
  if (sort === "priority") {
    const order = {high:3,medium:2,low:1};
    list.sort((a,b)=> order[b.priority]-order[a.priority]);
  }
  const ul = document.getElementById("tasksList");
  ul.innerHTML = "";
  list.forEach((task, i) => ul.appendChild(makeTaskCard(task, i, list)));
  document.querySelectorAll(".task-card").forEach((el, idx) => {
    el.draggable = true;
    el.ondragstart = () => { dragSrcIdx = idx; };
    el.ondragover = e => e.preventDefault();
    el.ondrop = () => { onDrop(idx, list); };
  });
}

// ====== Single Task Card Rendering ======
function makeTaskCard(task, idx, currentList) {
  const li = document.createElement("li");
  li.className = "task-card" +
    (task.completed ? " completed" : "") +
    (!task.completed && task.due && new Date(task.due) < new Date(new Date().toISOString().split("T")[0]) ? " overdue" : "");
  li.tabIndex = 0;
  const cb = document.createElement("input");
  cb.type = "checkbox"; cb.className = "task-check"; cb.checked = !!task.completed;
  cb.title = "Mark complete";
  cb.onchange = () => {
    task.completed = cb.checked; saveTasks(); renderTasks(); renderAnalytics(); renderCategories();
    showToast(task.completed ? "Task completed!" : "Marked pending.");
  };
  const wrap = document.createElement("div");
  wrap.className = "task-content";
  wrap.innerHTML = `<div class="task-title">${escapeHTML(task.title)}</div>` +
    (task.desc ? `<div class="task-desc">${escapeHTML(task.desc)}</div>` : "");
  const meta = document.createElement("div"); meta.className = "task-meta";
  const chips = [];
  if(task.priority) chips.push(`<span class="chip ${task.priority}">${task.priority}</span>`);
  if(task.due) {
    const now = new Date();
    const d = new Date(task.due);
    const overdue = !task.completed && d < new Date(now.toISOString().split("T")[0]);
    chips.push(`<span class="chip due${overdue?' overdue':''}">
      ${overdue?'Overdue: ':''}${d.toLocaleDateString()}
    </span>`);
  }
  if(task.category) chips.push(`<span class="chip ${task.category.toLowerCase()}">${escapeHTML(task.category)}</span>`);
  meta.innerHTML = `<div class="tag-chips">${chips.join('')}</div>`;
  wrap.appendChild(meta);
  const act = document.createElement("div");
  act.className = "task-actions";
  act.innerHTML = `
    <button title="Edit task" onclick="editTask('${task.id}')"><svg width="18" height="18"><rect x="4" y="14" width="9" height="2" fill="#776bff"/><polygon points="13,5 16,8 8,16 5,16 5,13" fill="#7ecffd"/></svg></button>
    <button title="Delete task" onclick="deleteTask('${task.id}')"><svg width="18" height="18"><rect x="5" y="8" width="8" height="6" fill="#d252a0"/><rect x="7" y="6" width="4" height="2" fill="#e66969"/></svg></button>
  `;
  li.appendChild(cb); li.appendChild(wrap); li.appendChild(act);
  return li;
}
function escapeHTML(str) {
  return str.replace(/[<>&"']/g,c=>({ "<":"&lt;","&": "&amp;",'"':'&quot;', "'":"&#39;"}[c]));
}
function onDrop(targetIdx, curList) {
  if(dragSrcIdx==null) return;
  const srcTaskId = curList[dragSrcIdx].id, tgtTaskId = curList[targetIdx].id;
  const srcIdx0 = tasks.findIndex(t=>t.id===srcTaskId), tgtIdx0=tasks.findIndex(t=>t.id===tgtTaskId);
  const [moved] = tasks.splice(srcIdx0, 1);
  tasks.splice(tgtIdx0,0,moved);
  saveTasks(); dragSrcIdx=null; renderTasks(); renderAnalytics(); renderCategories();
}

// ====== Modal Logic ======
document.getElementById("addTaskBtn").onclick = ()=> openTaskModal();
document.getElementById("cancelBtn").onclick = closeModal;
document.getElementById("taskForm").onsubmit = function(e){
  e.preventDefault();
  const id = document.getElementById("taskId").value || "_"+Math.random().toString(36).substr(2,9);
  const obj = {
    id, title: document.getElementById("titleInput").value.trim(),
    desc: document.getElementById("descInput").value.trim(),
    priority: document.getElementById("priorityInput").value,
    category: document.getElementById("categoryInput").value.trim(),
    due: document.getElementById("dateInput").value,
    completed: false
  };
  const i = tasks.findIndex(t=>t.id===id);
  if(i>=0){ obj.completed = tasks[i].completed; tasks[i]= obj; showToast("Task updated!");}
  else { tasks.push(obj); showToast("Task added!"); }
  saveTasks(); closeModal(); renderTasks(); renderAnalytics(); renderCategories();
};
function openTaskModal(task=null){
  document.getElementById("modal").classList.add("active");
  document.getElementById("modalTitle").textContent = task?"Edit Task":"Add Task";
  document.getElementById("taskForm").reset();
  document.getElementById("taskId").value = task?task.id:"";
  document.getElementById("titleInput").value = task?task.title:"";
  document.getElementById("descInput").value = task?task.desc:"";
  document.getElementById("priorityInput").value = task?task.priority:"medium";
  document.getElementById("categoryInput").value = task?task.category:"";
  document.getElementById("dateInput").value = task?task.due:"";
  document.getElementById("titleInput").focus();
}
function closeModal(){
  document.getElementById("modal").classList.remove("active");
  document.getElementById("taskForm").reset();
}
window.editTask = function(id) {
  const t=tasks.find(t=>t.id===id); if(t) openTaskModal(t);
};
window.deleteTask = function(id){
  if(confirm("Delete this task?")) {
    tasks = tasks.filter(t=>t.id!==id);
    saveTasks(); showToast("Task deleted!"); renderTasks(); renderAnalytics(); renderCategories();
  }
};
document.getElementById("statusFilter").onchange = renderTasks;
document.getElementById("categoryFilter").onchange = renderTasks;
document.getElementById("priorityFilter").onchange = renderTasks;
document.getElementById("sortFilter").onchange = renderTasks;
document.getElementById("searchInput").oninput = renderTasks;

// ====== Sidebar Navigation ======
document.querySelectorAll('.sidebar nav button').forEach(btn=>{
  btn.onclick = function(){
    document.getElementById("tasksPanel").style.display = "none";
    document.getElementById("categoriesPanel").style.display = "none";
    document.getElementById("analyticsPanel").style.display = "none";
    if(btn.dataset.panel==="tasks"){document.getElementById("tasksPanel").style.display="";renderTasks();}
    if(btn.dataset.panel==="categories"){document.getElementById("categoriesPanel").style.display="";renderCategoryTabs();renderCategories();}
    if(btn.dataset.panel==="analytics"){document.getElementById("analyticsPanel").style.display="";renderAnalytics();}
  };
});

// ====== Analytics: Bar and Pie Charts ======
function renderAnalytics() {
  const total = tasks.length;
  const completed = tasks.filter(t=>t.completed).length;
  const pending = tasks.filter(t=>!t.completed).length;
  const overdue = tasks.filter(t=>!t.completed && t.due && t.due < (new Date().toISOString().slice(0,10))).length;
  const categories = {};
  tasks.forEach(t=>{if(t.category){categories[t.category]=(categories[t.category]||0)+1;}});
  let catsHTML = "";
  for(let cat in categories) catsHTML += `<div><b>${cat}:</b> ${categories[cat]}</div>`;
  document.getElementById("analyticsGrid").innerHTML = `
    <div class="analytics-card"><div class="large-num">${total}</div>Total Tasks</div>
    <div class="analytics-card"><div class="large-num">${completed}</div>Completed</div>
    <div class="analytics-card"><div class="large-num">${pending}</div>Pending</div>
    <div class="analytics-card"><div class="large-num">${overdue}</div>Overdue</div>
    <div class="analytics-card"><b>By Category:</b>${catsHTML ? catsHTML : "<div style='margin-top:8px;'>No categories</div>"}</div>
  `;
  drawBarChart(categories);
  drawPieChart(categories);
}

function drawBarChart(categories) {
  const canvas = document.getElementById("barChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const labels = Object.keys(categories);
  if (!labels.length) return;
  const values = Object.values(categories);
  const max = Math.max(...values, 1);
  const barWidth = (canvas.width-40) / labels.length;
  labels.forEach((cat,i)=>{
    let grad = ctx.createLinearGradient(0,0,0,canvas.height-25);
    grad.addColorStop(0, "#776bff");
    grad.addColorStop(1, "#7ecffd");
    const val = values[i];
    const x = 20 + i*barWidth;
    const y = canvas.height - 30 - (val/max*120);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth-17, (val/max*120));
    ctx.font = "15px Segoe UI";
    ctx.fillText(cat, x+2, canvas.height-10);
    ctx.fillStyle = "#c6eaff";
    ctx.fillText(val, x+barWidth/3, y-7);
  });
  ctx.font = "bold 18px Segoe UI";
  ctx.fillStyle = "#c6eaff";
  ctx.fillText("Tasks by Category", 24, 25);
}

function drawPieChart(categories) {
  const canvas = document.getElementById("pieChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const labels = Object.keys(categories);
  const values = Object.values(categories);
  const total = values.reduce((a,b)=>a+b,0) || 1;
  let start=0;
  const baseColors = [
    {from: "#776bff", to: "#7ecffd"},
    {from: "#7ecffd", to: "#776bff"}
  ];
  labels.forEach((cat,i)=>{
    const pair = baseColors[i % 2];
    let grad = ctx.createRadialGradient(110,110,15,110,110,80);
    grad.addColorStop(0, pair.from);
    grad.addColorStop(1, pair.to);
    const angle = (values[i]/total)*2*Math.PI;
    ctx.beginPath();
    ctx.moveTo(110,110);
    ctx.arc(110,110,82,start,start+angle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.save(); ctx.translate(110,110);
    ctx.rotate(start+angle/2);
    ctx.font="bold 13px Segoe UI";
    ctx.fillStyle="#fff";
    ctx.fillText(cat, 55, 0);
    ctx.restore();
    start += angle;
  });
  ctx.font = "bold 14px Segoe UI";
  ctx.fillStyle = "#fff";
  ctx.fillText("Category %", 60, 22);
}

// ====== App Initialization ======
renderTasks(); renderAnalytics(); renderCategoryTabs(); renderCategories();
setInterval(()=>{
  const now = new Date().toISOString().split("T")[0];
  const overdue = tasks.filter(t=>!t.completed&&t.due&&t.due<now);
  if(overdue.length) showToast(`🔔 ${overdue.length} overdue task(s)!`);
},120000);
