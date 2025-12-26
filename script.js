lucide.createIcons();

const STORAGE_KEY = 'alpha_data_v1';

let state = {
    provider: 'gemini',
    history: [],
    theme: 'system',
    geminiKeys: [''], 
    orKeys: ['']
};

function initTheme() {
    const savedTheme = localStorage.getItem('alpha_theme') || 'system';
    state.theme = savedTheme;
    const isDark = savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('sunIcon').classList.toggle('hidden', isDark);
    document.getElementById('moonIcon').classList.toggle('hidden', !isDark);
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    state.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('alpha_theme', state.theme);
    initTheme();
});
initTheme();

function switchTab(tabId) {
    ['translate', 'history', 'settings'].forEach(id => {
        document.getElementById(`${id}Section`).classList.add('hidden');
        document.getElementById(`nav-${id}`).classList.remove('active');
    });
    document.getElementById(`${tabId}Section`).classList.remove('hidden');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    if (tabId === 'history') renderHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setProvider(p) {
    state.provider = p;
    const tGem = document.getElementById('tab-gemini');
    const tOr = document.getElementById('tab-or');
    const cGem = document.getElementById('config-gemini');
    const cOr = document.getElementById('config-or');

    if (p === 'gemini') {
        tGem.className = "flex-1 py-4 rounded-[1.5rem] text-sm font-black transition-all bg-indigo-600 text-white shadow-lg";
        tOr.className = "flex-1 py-4 rounded-[1.5rem] text-sm font-black transition-all opacity-50";
        cGem.classList.remove('hidden');
        cOr.classList.add('hidden');
    } else {
        tOr.className = "flex-1 py-4 rounded-[1.5rem] text-sm font-black transition-all bg-purple-600 text-white shadow-lg";
        tGem.className = "flex-1 py-4 rounded-[1.5rem] text-sm font-black transition-all opacity-50";
        cOr.classList.remove('hidden');
        cGem.classList.add('hidden');
    }
    saveState();
}

function addKeyInput(type, value = '') {
    const container = document.getElementById(type === 'gemini' ? 'geminiKeysContainer' : 'orKeysContainer');
    const wrapper = document.createElement('div');
    wrapper.className = "flex gap-2 items-center animate-in fade-in slide-in-from-top-2 duration-300";
    
    const input = document.createElement('input');
    input.type = "password";
    input.className = `${type}-key-input w-full bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-${type === 'gemini' ? 'indigo' : 'purple'}-500 font-mono text-sm shadow-inner`;
    input.placeholder = "Enter API Key...";
    input.value = value; 
    input.oninput = saveState;

    const btn = document.createElement('button');
    btn.className = "p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm";
    btn.innerHTML = `<i data-lucide="trash" class="w-4 h-4"></i>`;
    btn.onclick = () => { wrapper.remove(); saveState(); };

    wrapper.appendChild(input);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
    lucide.createIcons();
}

function getKeys(type) {
    return Array.from(document.querySelectorAll(`.${type}-key-input`)).map(i => i.value);
}

function saveState() {
    try {
        const data = {
            geminiKeys: getKeys('gemini').filter(k => k.trim() !== ''),
            orKeys: getKeys('or').filter(k => k.trim() !== ''),
            geminiModel: document.getElementById('geminiModel').value,
            orModel: document.getElementById('orModel').value,
            provider: state.provider,
            sourceLang: document.getElementById('sourceLang').value,
            targetLang: document.getElementById('targetLang').value,
            tone: document.getElementById('translationTone').value,
            gList: document.getElementById('geminiModel').innerHTML,
            oList: document.getElementById('orModel').innerHTML,
            history: state.history,
            sourceText: document.getElementById('sourceText').value,
            resultText: document.getElementById('resultText').innerText,
            isResultVisible: !document.getElementById('resultWrapper').classList.contains('hidden')
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.error("Save failed", e); }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            addKeyInput('gemini'); 
            addKeyInput('or');
            return;
        }
        const data = JSON.parse(raw);
        
        const gKeys = (data.geminiKeys && data.geminiKeys.length) ? data.geminiKeys : [''];
        document.getElementById('geminiKeysContainer').innerHTML = '';
        gKeys.forEach(k => addKeyInput('gemini', k));

        const oKeys = (data.orKeys && data.orKeys.length) ? data.orKeys : [''];
        document.getElementById('orKeysContainer').innerHTML = '';
        oKeys.forEach(k => addKeyInput('or', k));

        if (data.gList) document.getElementById('geminiModel').innerHTML = data.gList;
        if (data.oList) document.getElementById('orModel').innerHTML = data.oList;

        if(data.geminiModel) document.getElementById('geminiModel').value = data.geminiModel;
        if(data.orModel) document.getElementById('orModel').value = data.orModel;
        if(data.sourceLang) document.getElementById('sourceLang').value = data.sourceLang;
        if(data.targetLang) document.getElementById('targetLang').value = data.targetLang;
        if(data.tone) document.getElementById('translationTone').value = data.tone;
        
        setProvider(data.provider || 'gemini');
        state.history = data.history || [];

        if(data.sourceText) document.getElementById('sourceText').value = data.sourceText;
        if(data.resultText && data.resultText !== '...') {
            const out = document.getElementById('resultText');
            out.innerText = data.resultText;
            out.classList.remove('opacity-40', 'italic');
            out.classList.add('font-bold', 'text-indigo-900', 'dark:text-indigo-100');
        }
        if(data.isResultVisible && data.sourceText) {
            document.getElementById('resultWrapper').classList.remove('hidden');
        }
        updateDir();
    } catch (e) {
        console.error("Load failed", e);
        addKeyInput('gemini');
        addKeyInput('or');
    }
}

window.addEventListener('DOMContentLoaded', loadState);

function swapLanguages() {
    const s = document.getElementById('sourceLang');
    const t = document.getElementById('targetLang');
    if (s.value === 'auto') return toast("زبان خودکار جابجا نمی‌شود");
    [s.value, t.value] = [t.value, s.value];
    saveState();
    updateDir();
}

function updateDir() {
    const rtl = ['fa', 'ar', 'ur'].includes(document.getElementById('targetLang').value);
    const res = document.getElementById('resultContainer');
    res.dir = rtl ? 'rtl' : 'ltr';
    res.className = `p-8 max-h-[500px] overflow-y-auto scroller relative z-10 ${rtl ? 'text-right' : 'text-left'}`;
}

document.getElementById('translateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('translateBtn');
    const src = document.getElementById('sourceText').value.trim();
    const from = document.getElementById('sourceLang').value;
    const to = document.getElementById('targetLang').value;
    const tone = document.getElementById('translationTone').value;
    const out = document.getElementById('resultText');
    const wrap = document.getElementById('resultWrapper');

    if (!src) return toast("متنی وارد کنید");

    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin w-6 h-6"></i> در حال پردازش...`;
    
    const prompt = `Translate this text from "${from}" to "${to}". Tone: ${tone}. Output ONLY translation: ${src}`;

    try {
        let result = "";
        if (state.provider === 'gemini') result = await callAPI('gemini', prompt);
        else result = await callAPI('or', prompt);
        
        wrap.classList.remove('hidden');
        out.innerText = result;
        out.classList.remove('opacity-40', 'italic');
        out.classList.add('font-bold', 'text-indigo-900', 'dark:text-indigo-100');
        
        state.history.unshift({id: Date.now(), src, res: result, from, to, date: new Date().toLocaleTimeString('fa-IR')});
        if(state.history.length > 50) state.history.pop();
        
        saveState();

    } catch (e) {
        console.error(e);
        wrap.classList.remove('hidden');
        out.innerText = "خطا در ترجمه. لطفاً کلید API را بررسی کنید.";
        toast("خطا در برقراری ارتباط");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="relative z-10 flex items-center gap-3"><i data-lucide="zap" class="w-6 h-6"></i> ترجمه هوشمند</span><div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>`;
        lucide.createIcons();
    }
});

async function callAPI(type, prompt) {
    const keys = Array.from(document.querySelectorAll(`.${type}-key-input`))
                      .map(i => i.value.trim())
                      .filter(k => k !== '');
                      
    if(keys.length === 0) throw new Error("No Keys");

    const model = document.getElementById(type === 'gemini' ? 'geminiModel' : 'orModel').value;

    for (const key of keys) {
        try {
            let res, data;
            if(type === 'gemini') {
                res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                data = await res.json();
                if(!res.ok) throw new Error();
                return data.candidates[0].content.parts[0].text.trim();
            } else {
                res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: 'POST', headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json'},
                    body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }] })
                });
                data = await res.json();
                if(!res.ok) throw new Error();
                return data.choices[0].message.content.trim();
            }
        } catch(e) { continue; }
    }
    throw new Error("All keys failed");
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('opacity-0', 'scale-90');
    setTimeout(() => t.classList.add('opacity-0', 'scale-90'), 3000);
}

function clearText() { document.getElementById('sourceText').value = ''; saveState(); toast("پاک شد"); }
async function pasteText() { 
    try { 
        document.getElementById('sourceText').value = await navigator.clipboard.readText(); 
        saveState(); toast("چسبانده شد"); 
    } catch(e){ toast("عدم دسترسی"); } 
}
function copyResult() { navigator.clipboard.writeText(document.getElementById('resultText').innerText); toast("کپی شد"); }

function renderHistory() {
    const list = document.getElementById('historyList');
    const empty = document.getElementById('emptyState');
    list.innerHTML = '';
    if(state.history.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    state.history.forEach(h => {
        const div = document.createElement('div');
        div.className = "glass-panel p-5 rounded-[2rem] space-y-3 relative transition-all";
        div.innerHTML = `
            <div class="flex justify-between opacity-50 text-[10px] font-black">
                <span>${h.from} > ${h.to}</span>
                <span>${h.date}</span>
            </div>
            <p class="text-xs opacity-60 truncate">${h.src}</p>
            <p class="font-bold text-indigo-600 dark:text-indigo-400 break-words leading-relaxed">${h.res}</p>
            
            <div class="flex gap-3 pt-2">
                <button onclick="restore('${h.id}')" class="flex-1 text-xs font-bold bg-indigo-600 text-white py-3 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <i data-lucide="refresh-ccw" class="w-3 h-3"></i> استفاده
                </button>
                <button onclick="delHistory('${h.id}')" class="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-5 py-3 rounded-xl active:scale-95 transition-transform flex items-center justify-center">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
    lucide.createIcons();
}

function restore(id) {
    const h = state.history.find(x => x.id == id);
    if(h) {
        document.getElementById('sourceText').value = h.src;
        document.getElementById('resultText').innerText = h.res;
        document.getElementById('resultWrapper').classList.remove('hidden');
        switchTab('translate');
        saveState();
    }
}

function delHistory(id) {
    state.history = state.history.filter(x => x.id != id);
    saveState(); renderHistory();
}

function clearHistory() {
    state.history = []; saveState(); renderHistory();
}

async function fetchModels(type) {
    toast("در حال دریافت...");
    const key = document.querySelector(`.${type}-key-input`).value.trim();
    if(!key) return toast("کلید API وارد نشده است");
    
    try {
        if(type === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await res.json();
            if(data.models) {
                const s = document.getElementById('geminiModel'); s.innerHTML = '';
                data.models.forEach(m => { if(m.supportedGenerationMethods.includes('generateContent')) s.add(new Option(m.name.split('/')[1], m.name.split('/')[1])) });
                saveState();
            }
        } else {
            const res = await fetch("https://openrouter.ai/api/v1/models");
            const data = await res.json();
            if(data.data) {
                const s = document.getElementById('orModel'); s.innerHTML = '';
                data.data.forEach(m => s.add(new Option(m.name, m.id)));
                saveState();
            }
        }
        toast("لیست مدل‌ها بروز شد");
    } catch(e) { toast("خطا در دریافت لیست"); }
}


