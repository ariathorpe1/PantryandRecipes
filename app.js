// router
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(page);
  if (el) el.classList.add('active');
  if (page === 'pantry') renderPantry();
  if (page === 'recipes') renderRecipes();
}
function nav(view) { showPage(view); }

// html escape
function h(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]
  ));
}

// storage
const LS = { ingredients: 'ingredients', recipes: 'recipes' };
const read = (k) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : []; }
  catch { localStorage.removeItem(k); return []; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));

// seed data (first run only)
function seedData() {
  if (read(LS.ingredients).length || read(LS.recipes).length) return;

  const ingredients = [
    {id:uuid(),name:'Flour',qty:5,unit:'cup',type:'measured'},
    {id:uuid(),name:'Sugar',qty:2,unit:'cup',type:'measured'},
    {id:uuid(),name:'Butter',qty:1,unit:'cup',type:'measured'},
    {id:uuid(),name:'Eggs',qty:12,unit:'unit',type:'discrete'},
    {id:uuid(),name:'Chocolate Chips',qty:3,unit:'cup',type:'measured'},
    {id:uuid(),name:'Spaghetti Noodles',qty:1,unit:'lb',type:'measured'},
    {id:uuid(),name:'Tomato Sauce',qty:24,unit:'oz',type:'measured'},
    {id:uuid(),name:'Blueberries',qty:2,unit:'cup',type:'measured'},
    {id:uuid(),name:'Milk',qty:4,unit:'cup',type:'measured'},
  ];

  const recipes = [
    {
      id: uuid(), name: 'Chocolate Chip Cookies',
      instructions: `1. Preheat oven to 350°F.
2. Mix flour, sugar, and butter.
3. Add eggs and chocolate chips.
4. Bake for 10–12 minutes.`,
      items: [
        {ingredientId:ingredients[0].id,qty:2.5,unit:'cup'},
        {ingredientId:ingredients[1].id,qty:1,unit:'cup'},
        {ingredientId:ingredients[2].id,qty:1,unit:'cup'},
        {ingredientId:ingredients[3].id,qty:2,unit:'unit'},
        {ingredientId:ingredients[4].id,qty:1.5,unit:'cup'},
      ]
    },
    {
      id: uuid(), name: 'Spaghetti',
      instructions: `1. Boil noodles until tender.
2. Heat tomato sauce.
3. Combine noodles and sauce.`,
      items: [
        {ingredientId:ingredients[5].id,qty:1,unit:'lb'},
        {ingredientId:ingredients[6].id,qty:12,unit:'oz'},
      ]
    },
    {
      id: uuid(), name: 'Blueberry Pancakes',
      instructions: `1. Mix flour, milk, and eggs.
2. Stir in blueberries.
3. Cook on griddle until golden brown.`,
      items: [
        {ingredientId:ingredients[0].id,qty:2,unit:'cup'},
        {ingredientId:ingredients[8].id,qty:1.5,unit:'cup'},
        {ingredientId:ingredients[3].id,qty:2,unit:'unit'},
        {ingredientId:ingredients[7].id,qty:1,unit:'cup'},
      ]
    },
  ];

  write(LS.ingredients, ingredients);
  write(LS.recipes, recipes);
}

// number formatting
function nice(n) {
  if (n == null || isNaN(n)) return '-';
  const targets = [[1/8,'1/8'],[1/4,'1/4'],[1/3,'1/3'],[1/2,'1/2'],[2/3,'2/3'],[3/4,'3/4']];
  const tol = .02;
  n = Number(n);
  for (const [v,l] of targets) {
    if (Math.abs(n - v) < tol) return l;
    if (Math.abs(n - Math.round(n) - v) < tol) return `${Math.round(n)} ${l}`.trim();
  }
  return (Math.round(n*100)/100).toString();
}

// unit conversions
const volTsp = {tsp:1,tbsp:3,cup:48};
const volMl  = {ml:1};
const wt     = {g:1,oz:28.349523125,lb:453.59237};
function convert(amount, from, to) {
  if (from === to) return amount;
  if (from === 'unit' || to === 'unit') return null;
  if (volTsp[from] && volTsp[to]) return amount * (volTsp[from]/volTsp[to]);
  if (volMl[from]  && volMl[to])  return amount * (volMl[from]/volMl[to]);
  if (wt[from]     && wt[to])     return amount * (wt[from]/wt[to]);
  return null;
}

// toasts
function toast(msg, type='success') {
  const root = document.getElementById('toast-root');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

// state
let pantryState = { q: '' };
let recipeState = { q: '' };

// pantry UI
function renderPantry() {
  const root = document.getElementById('pantry-root');
  const all  = read(LS.ingredients).slice();
  all.sort((a,b) => (a.qty ?? 0) - (b.qty ?? 0));
  const list = pantryState.q
    ? all.filter(i => i.name.toLowerCase().includes(pantryState.q.toLowerCase()))
    : all;
  root.innerHTML = `
    <div class="toolbar">
      <input placeholder="Search..." value="${h(pantryState.q)}"
             oninput="pantryState.q=this.value;renderPantry()" />
      <button class="btn secondary" onclick="openIngredientForm()">Add Ingredient</button>
    </div>
    ${ list.length ? list.map(ingCard).join('') : '<div>No ingredients yet.</div>' }
  `;
}

function ingCard(i) {
  const low = i.type === 'discrete' ? (i.qty || 0) < 3 : (i.qty || 0) < 1;
  const haveUnit = i.type === 'discrete' ? ((i.qty||0)===1 ? 'unit' : 'units') : (i.unit || '');
  return `
    <div class="card">
      <b class="${low ? 'low' : 'title'}">${h(i.name)}</b><br/>
      Have: ${nice(i.qty)} ${h(haveUnit)}
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn secondary" onclick="openIngredientForm('${i.id}')">Edit</button>
        <button class="btn warn" onclick="deleteIngredient('${i.id}')">Delete</button>
      </div>
    </div>
  `;
}

const UNIT_OPTIONS = ['unit','tsp','tbsp','cup','ml','g','oz','lb'];

function openIngredientForm(id) {
  const all = read(LS.ingredients);
  const ing = id ? all.find(i => i.id === id)
                 : {id:uuid(), name:'', type:'measured', qty:0, unit:'cup'};

  const unitSelect = (selected, disabled=false) =>
    `<select id="i_unit" ${disabled?'disabled':''}>
      ${UNIT_OPTIONS.map(u => `<option value="${u}" ${selected===u?'selected':''}>${u}</option>`).join('')}
    </select>`;

  const root = document.getElementById('pantry-root');
  root.innerHTML = `
    <div class="card">
      <div class="title">${id ? 'Edit' : 'Add'} Ingredient</div>
      <label>Name</label><input id="i_name" value="${h(ing.name)}" />
      <label>Type</label>
      <select id="i_type" onchange="toggleUnitForType()">
        <option ${ing.type==='measured'?'selected':''}>measured</option>
        <option ${ing.type==='discrete'?'selected':''}>discrete</option>
      </select>
      <label>Quantity</label><input id="i_qty" type="number" step="0.01" value="${ing.qty}" />
      <label>Unit</label>
      ${unitSelect(ing.unit, ing.type==='discrete')}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn accent" onclick="saveIngredient('${id||''}')">Save</button>
        <button class="btn ghost" onclick="renderPantry()">Cancel</button>
      </div>
    </div>
  `;

  // lock unit for discrete
  window.toggleUnitForType = () => {
    const type = document.getElementById('i_type').value;
    const unitEl = document.getElementById('i_unit');
    if (type === 'discrete') { unitEl.value = 'unit'; unitEl.disabled = true; }
    else { if (unitEl.value === 'unit') unitEl.value = 'cup'; unitEl.disabled = false; }
  };
  window.toggleUnitForType();
}

function saveIngredient(id) {
  const name = document.getElementById('i_name').value.trim();
  const qty  = parseFloat(document.getElementById('i_qty').value) || 0;
  const type = document.getElementById('i_type').value;
  const unit = document.getElementById('i_unit').value;

  if (!name) return alert('Name required');

  let all = read(LS.ingredients);
  if (id) {
    const i = all.find(x => x.id === id);
    if (i) { i.name = name; i.qty = qty; i.type = type; i.unit = (type==='discrete' ? 'unit' : unit); }
  } else {
    all.push({ id: uuid(), name, qty, type, unit: (type==='discrete' ? 'unit' : unit) });
  }
  write(LS.ingredients, all);
  toast('Ingredient saved');
  renderPantry();
}

function deleteIngredient(id) {
  if (!confirm('Delete this ingredient?')) return;
  const all = read(LS.ingredients).filter(i => i.id !== id);
  write(LS.ingredients, all);
  renderPantry();
}

// recipes UI
function renderRecipes() {
  const root = document.getElementById('recipes-root');
  const all  = read(LS.recipes);
  const list = recipeState.q
    ? all.filter(r => r.name.toLowerCase().includes(recipeState.q.toLowerCase()))
    : all;

  root.innerHTML = `
    <div class="toolbar">
      <input placeholder="Search..." value="${h(recipeState.q)}"
             oninput="recipeState.q=this.value;renderRecipes()" />
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn accent" onclick="openRecipeForm()">Add Recipe</button>
      </div>
    </div>
    ${ list.length ? list.map(recipeRow).join('') : '<div>No recipes yet.</div>' }
    <div id="recipe-form"></div>
    <div id="recipe-detail"></div>
  `;
}

function recipeRow(r) {
  const count = (r.items?.length) || 0;
  return `
    <div class="card">
      <div class="title">${h(r.name)}</div>
      <div class="muted">${count} ingredient${count===1?'':'s'}</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn primary"   onclick="openRecipeDetail('${r.id}',1)">Open</button>
        <button class="btn secondary" onclick="openRecipeForm('${r.id}')">Edit</button>
        <button class="btn warn"      onclick="deleteRecipe('${r.id}')">Delete</button>
      </div>
    </div>
  `;
}

const unitsAll = ['unit','tsp','tbsp','cup','ml','g','oz','lb'];

function openRecipeForm(id) {
  const host = document.getElementById('recipes-root');
  const all  = read(LS.recipes);
  const r    = id ? all.find(x => x.id === id) : { id: uuid(), name: '', instructions: '', items: [] };
  const ings = read(LS.ingredients);

  function itemRow(it, idx) {
    const opts = ings.map(ing => `<option value="${ing.id}" ${it.ingredientId===ing.id?'selected':''}>${h(ing.name)}</option>`).join('');
    const sel  = ings.find(x => x.id === it.ingredientId);
    const isD  = !!(sel && sel.type === 'discrete');
    return `
      <div class="card" style="border:1px solid #8CB5FF">
        <div class="grid2">
          <div>
            <label>Ingredient</label>
            <select onchange="rf_onIng(${idx},this.value)">${opts}</select>
          </div>
          <div>
            <label>Qty & Unit</label>
            <div class="grid2">
              <input type="number" step="0.01" min="0" value="${it.qty ?? 1}" onchange="rf_onQty(${idx},this.value)" />
              <select onchange="rf_onUnit(${idx},this.value)" ${isD?'disabled':''}>
                ${unitsAll.map(u => `<option value="${u}" ${it.unit===u?'selected':''} ${isD && u!=='unit'?'disabled':''}>${u}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn warn" onclick="rf_remove(${idx})">Remove</button>
        </div>
      </div>
    `;
  }

  host.innerHTML = `
    <div class="card">
      <div class="title">${id ? 'Edit' : 'Add'} Recipe</div>
      <label>Name</label><input id="r_name" value="${h(r.name)}" />
      <label>Instructions</label><textarea id="r_instr" rows="5">${h(r.instructions||'')}</textarea>
      <div class="title" style="margin-top:10px;">Ingredients</div>
      <div id="rf_items">${(r.items||[]).map(itemRow).join('') || '<div class="muted">No ingredients yet.</div>'}</div>
      <button class="btn secondary" onclick="rf_add()">+ Add Ingredient</button>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
        ${id ? `<button class="btn warn" onclick="deleteRecipe('${r.id}')">Delete</button>` : ''}
        <button class="btn ghost" onclick="renderRecipes()">Cancel</button>
        <button class="btn accent" onclick="saveRecipe('${id||''}')">Save</button>
      </div>
    </div>
  `;
  host.dataset.recipe = JSON.stringify(r);
  document.getElementById('recipe-detail').innerHTML = '';
}

function rf_sync() {
  const host = document.getElementById('recipes-root');
  return [host, JSON.parse(host.dataset.recipe || '{}')];
}
function rf_render() {
  const [host, r] = rf_sync();
  const ings = read(LS.ingredients);
  function itemRow(it, idx) {
    const opts = ings.map(ing => `<option value="${ing.id}" ${it.ingredientId===ing.id?'selected':''}>${h(ing.name)}</option>`).join('');
    const sel  = ings.find(x => x.id === it.ingredientId);
    const isD  = !!(sel && sel.type === 'discrete');
    return `
      <div class="card" style="border:1px solid #8CB5FF">
        <div class="grid2">
          <div>
            <label>Ingredient</label>
            <select onchange="rf_onIng(${idx},this.value)">${opts}</select>
          </div>
          <div>
            <label>Qty & Unit</label>
            <div class="grid2">
              <input type="number" step="0.01" min="0" value="${it.qty ?? 1}" onchange="rf_onQty(${idx},this.value)" />
              <select onchange="rf_onUnit(${idx},this.value)" ${isD?'disabled':''}>
                ${unitsAll.map(u => `<option value="${u}" ${it.unit===u?'selected':''} ${isD && u!=='unit'?'disabled':''}>${u}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn warn" onclick="rf_remove(${idx})">Remove</button>
        </div>
      </div>
    `;
  }
  const itemsHost = host.querySelector('#rf_items');
  if (itemsHost) itemsHost.innerHTML = (r.items||[]).map(itemRow).join('') || '<div class="muted">No ingredients yet.</div>';
}
function rf_add() {
  const [host, r] = rf_sync();
  const ings = read(LS.ingredients);
  const first = ings[0];
  r.items = r.items || [];
  r.items.push({ ingredientId: first ? first.id : '', qty: 1, unit: (first && first.type==='discrete') ? 'unit' : 'tsp' });
  host.dataset.recipe = JSON.stringify(r);
  rf_render();
}
function rf_remove(idx) { const [host, r] = rf_sync(); r.items.splice(idx,1); host.dataset.recipe=JSON.stringify(r); rf_render(); }
function rf_onIng(idx, val) {
  const [host, r] = rf_sync();
  r.items[idx].ingredientId = val;
  const ing = read(LS.ingredients).find(x => x.id === val);
  if (ing && ing.type === 'discrete') r.items[idx].unit = 'unit';
  host.dataset.recipe = JSON.stringify(r);
  rf_render();
}
function rf_onQty(idx, val) { const [host, r] = rf_sync(); r.items[idx].qty = Math.max(0, Number(val)); host.dataset.recipe=JSON.stringify(r); }
function rf_onUnit(idx, val) { const [host, r] = rf_sync(); r.items[idx].unit = val; host.dataset.recipe=JSON.stringify(r); }

function saveRecipe(id) {
  const host = document.getElementById('recipes-root');
  const r    = JSON.parse(host.dataset.recipe || '{}');
  r.name = document.getElementById('r_name').value.trim();
  r.instructions = document.getElementById('r_instr').value.trim();
  r.items = (r.items || []).filter(x => x.ingredientId);
  if (!r.name || !r.instructions) return alert('Name and instructions required');

  const all = read(LS.recipes);
  if (id) {
    const i = all.findIndex(x => x.id === id);
    if (i >= 0) all[i] = r;
  } else {
    all.push(r);
  }
  write(LS.recipes, all);
  toast('Recipe saved');
  renderRecipes();
}
function deleteRecipe(id) {
  if (!confirm('Delete this recipe?')) return;
  write(LS.recipes, read(LS.recipes).filter(r => r.id !== id));
  renderRecipes();
}

// recipe details
function openRecipeDetail(id, scale) {
  const detail  = document.getElementById('recipe-detail');
  const recipes = read(LS.recipes);
  const r       = recipes.find(x => x.id === id);
  const pantry  = read(LS.ingredients);
  if (!r) { detail.innerHTML = '<div class="card">Recipe not found</div>'; return; }

  scale = Number(scale) || 1;

  const lines = (r.items || []).map(it => {
    const ing = pantry.find(x => x.id === it.ingredientId);
    if (!ing) return `<li class="low">Missing pantry item</li>`;
    const need = (it.qty || 0) * scale;
    const needCanon = ing.type === 'discrete' ? Math.round(need) : convert(need, it.unit, ing.unit);
    const ok  = needCanon != null && (ing.qty || 0) >= needCanon;
    const haveTxt = `${nice(ing.qty || 0)} ${ing.type==='discrete' ? ((ing.qty||0)===1 ? 'unit' : 'units') : (ing.unit || '')}`;
    const needTxt = `${nice(need)} ${ing.type==='discrete' ? 'unit(s)' : it.unit}`;
    const mismatch = (needCanon == null) ? ` <span class="low">(unit mismatch)</span>` : '';
    return `<li>${ok ? h(ing.name) : `<span class="low">${h(ing.name)}</span>`}: need ${ok ? needTxt : `<span class="low">${needTxt}</span>`} • have ${h(haveTxt)}${mismatch}</li>`;
  }).join('');

  detail.innerHTML = `
    <div class="card" style="border:1px solid #8CB5FF">
      <div class="title">${h(r.name)}</div>
      <div class="grid2">
        <div>
          <div class="muted" style="margin-bottom:6px">Ingredients</div>
          <ul>${lines}</ul>
        </div>
        <div>
          <div class="muted" style="margin-bottom:6px">Scale</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn secondary" onclick="openRecipeDetail('${r.id}',0.5)">½×</button>
            <button class="btn primary"   onclick="openRecipeDetail('${r.id}',1)">1×</button>
            <button class="btn secondary" onclick="openRecipeDetail('${r.id}',2)">2×</button>
          </div>
          <div style="margin-top:8px">
            <button class="btn accent" onclick="cook('${r.id}',${scale})">Cook Recipe</button>
          </div>
        </div>
      </div>
      <div class="muted" style="margin-top:8px">Instructions</div>
      <div style="white-space:pre-wrap">${h(r.instructions)}</div>
    </div>
  `;
}

function cook(id, scale) {
  const recipes = read(LS.recipes);
  const r = recipes.find(x => x.id === id);
  const ings = read(LS.ingredients);

  // validate
  for (const it of (r.items || [])) {
    const ing = ings.find(x => x.id === it.ingredientId); if (!ing) return alert('Missing pantry ingredient');
    const need = (it.qty || 0) * scale;
    const cn = ing.type === 'discrete' ? Math.round(need) : convert(need, it.unit, ing.unit);
    if (cn == null) return alert(`Unit mismatch for ${ing.name}`);
    if ((ing.qty || 0) < cn) return alert(`Insufficient ${ing.name}`);
  }
  // deduct
  for (const it of (r.items || [])) {
    const ing = ings.find(x => x.id === it.ingredientId);
    const need = (it.qty || 0) * scale;
    const cn = ing.type === 'discrete' ? Math.round(need) : convert(need, it.unit, ing.unit);
    ing.qty = Math.max(0, (ing.qty || 0) - cn);
  }
  write(LS.ingredients, ings);
  toast('Meal cooked — pantry updated!');
  openRecipeDetail(id, scale);
  renderPantry();
}

// console checks
(function(){
  const log=(name,ok)=>console.log(`${ok?'PASS':'FAIL'} - ${name}`);
  log('nav defined', typeof nav==='function');
  log('renderPantry exists', typeof renderPantry==='function');
  log('renderRecipes exists', typeof renderRecipes==='function');
  log('convert tsp->tbsp', Math.abs(convert(3,'tsp','tbsp')-1) < 1e-9);
  log('convert oz->g', Math.abs(convert(1,'oz','g')-28.349523125) < 1e-6);
  log('convert lb->oz', Math.abs(convert(1,'lb','oz')-16) < 1e-9);
  log('convert g->cup incompatible -> null', convert(5,'g','cup')===null);
  log('nice(1/3) ~ 1/3', /1\/3/.test(nice(0.33)) || nice(1/3)==='1/3');
})();

// expose handlers
Object.assign(window, {
  nav,
  renderPantry, renderRecipes,
  openIngredientForm, saveIngredient, deleteIngredient,
  openRecipeForm, rf_add, rf_remove, rf_onIng, rf_onQty, rf_onUnit,
  openRecipeDetail, cook
});

// boot
seedData();
showPage('home');
