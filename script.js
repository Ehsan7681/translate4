lucide.createIcons();

// --- State Management ---
let state = {
    provider: 'gemini',
    history: JSON.parse(localStorage.getItem('ultima_history') || '[]'),
    theme: localStorage.getItem('ultima_theme') || 'system',
    geminiKeys: [''], // Array of keys
    orKeys: ['']      // Array of keys
};

// --- Theme Logic ---
function initTheme() {
    const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('sunIcon').classList.toggle('hidden', isDark);
    document.getElementById('moonIcon').classList.toggle('hidden', !isDark);
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    state.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('ultima_theme', state.theme);
    initTheme();
});
initTheme();

// --- Navigation Logic ---
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

// --- Key Management Logic ---
function addKeyInput(type, value = '') {
    const container = document.getElementById(type === 'gemini' ? 'geminiKeysContainer' : 'orKeysContainer');
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center";
    div.innerHTML = `
        <input type="password" value="${value}" oninput="saveState()" class="${type}-key-input w-full bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-${type === 'gemini' ? 'indigo' : 'purple'}-500 font-mono text-sm" placeholder="Enter API Key...">
        <button onclick="this.parentElement.remove(); saveState();" class="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
            <i data-lucide="trash" class="w-4 h-4"></i>
        </button>
    `;
    container.appendChild(div);
    lucide.createIcons();
}

function renderKeys() {
    const gContainer = document.getElementById('geminiKeysContainer');
    const oContainer = document.getElementById('orKeysContainer');
    gContainer.innerHTML = '';
    oContainer.innerHTML = '';

    if (state.geminiKeys.length === 0) state.geminiKeys = [''];
    if (state.orKeys.length === 0) state.orKeys = [''];

    state.geminiKeys.forEach(k => addKeyInput('gemini', k));
    state.orKeys.forEach(k => addKeyInput('or', k));
}

function getKeys(type) {
    return Array.from(document.querySelectorAll(`.${type}-key-input`))
                .map(input => input.value.trim())
                .filter(k => k !== "");
}

// --- Persistence ---
function saveState() {
    state.geminiKeys = getKeys('gemini');
    state.orKeys = getKeys('or');

    const data = {
        geminiKeys: state.geminiKeys,
        geminiModel: document.getElementById('geminiModel').value,
        orKeys: state.orKeys,
        orModel: document.getElementById('orModel').value,
        provider: state.provider,
        sourceLang: document.getElementById('sourceLang').value,
        targetLang: document.getElementById('targetLang').value,
        tone: document.getElementById('translationTone').value,
        gList: document.getElementById('geminiModel').innerHTML,
        oList: document.getElementById('orModel').innerHTML
    };
    localStorage.setItem('ultima_settings_v2', JSON.stringify(data));
}

function loadState() {
    const data = JSON.parse(localStorage.getItem('ultima_settings_v2'));
    if (data) {
        state.geminiKeys = data.geminiKeys || [''];
        state.orKeys = data.orKeys || [''];
        
        if (data.gList) document.getElementById('geminiModel').innerHTML = data.gList;
        if (data.oList) document.getElementById('orModel').innerHTML = data.oList;

        document.getElementById('geminiModel').value = data.geminiModel;
        document.getElementById('orModel').value = data.orModel;
        document.getElementById('sourceLang').value = data.sourceLang;
        document.getElementById('targetLang').value = data.targetLang;
        document.getElementById('translationTone').value = data.tone || 'neutral';
        
        setProvider(data.provider || 'gemini');
    }
    renderKeys();
    updateDir();
}
window.addEventListener('DOMContentLoaded', loadState);

// --- Swap Language Logic ---
function swapLanguages() {
    const sourceSelect = document.getElementById('sourceLang');
    const targetSelect = document.getElementById('targetLang');
    
    if (sourceSelect.value === 'auto') {
        toast("زبان 'خودکار' قابل جابجایی نیست");
        return;
    }

    const temp = sourceSelect.value;
    sourceSelect.value = targetSelect.value;
    targetSelect.value = temp;

    saveState();
    updateDir();
    toast("زبان‌ها جابجا شدند");
}

// --- Core Translation Logic ---
document.getElementById('translateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('translateBtn');
    const src = document.getElementById('sourceText').value.trim();
    const from = document.getElementById('sourceLang').value;
    const to = document.getElementById('targetLang').value;
    const tone = document.getElementById('translationTone').value;
    const output = document.getElementById('resultText');
    const resultWrapper = document.getElementById('resultWrapper');

    if (!src) return toast("لطفاً متنی وارد کنید");

    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin w-6 h-6"></i> در حال پردازش...`;
    lucide.createIcons();

    const prompt = `Translate the following text from "${from}" to "${to}".
    Tone: ${tone}.
    Output ONLY the translation.
    Text: ${src}`;

    try {
        let result = "";
        if (state.provider === 'gemini') {
            result = await callGemini(prompt);
        } else {
            result = await callOpenRouter(prompt);
        }
        
        resultWrapper.classList.remove('hidden');
        output.innerText = result;
        output.classList.remove('opacity-40', 'italic');
        output.classList.add('font-bold', 'text-indigo-900', 'dark:text-indigo-100');
        
        state.history.unshift({
            id: Date.now(),
            src, res: result, from, to, date: new Date().toLocaleTimeString('fa-IR')
        });
        if(state.history.length > 50) state.history.pop();
        localStorage.setItem('ultima_history', JSON.stringify(state.history));

    } catch (err) {
        console.error(err);
        output.innerText = "خطا در برقراری ارتباط. لطفاً تنظیمات API را بررسی کنید.";
        resultWrapper.classList.remove('hidden');
        toast("خطا در ترجمه (تمام کلیدها تست شدند)");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="relative z-10 flex items-center gap-3"><i data-lucide="zap" class="w-6 h-6"></i> ترجمه هوشمند</span><div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>`;
        lucide.createIcons();
    }
});

// --- API Calls with Failover ---
async function callGemini(prompt) {
    const keys = getKeys('gemini');
    const model = document.getElementById('geminiModel').value;
    
    if (keys.length === 0) throw new Error("No Gemini Keys Provided");

    for (const key of keys) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data.candidates[0].content.parts[0].text.trim();
        } catch (e) {
            console.warn(`Key failed, trying next... Error: ${e.message}`);
            continue; 
        }
    }
    throw new Error("All Gemini keys failed");
}

async function callOpenRouter(prompt) {
    const keys = getKeys('or');
    const model = document.getElementById('orModel').value;

    if (keys.length === 0) throw new Error("No OpenRouter Keys Provided");

    for (const key of keys) {
        try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }] })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data.choices[0].message.content.trim();
        } catch (e) {
            console.warn(`Key failed, trying next... Error: ${e.message}`);
            continue;
        }
    }
    throw new Error("All OpenRouter keys failed");
}

// --- History & Utils ---
function renderHistory() {
    const list = document.getElementById('historyList');
    const empty = document.getElementById('emptyState');
    list.innerHTML = '';
    
    if (state.history.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    state.history.forEach(h => {
        const el = document.createElement('div');
        el.className = "glass-panel p-6 rounded-[2rem] space-y-3 relative group transition-all hover:scale-[1.01] hover:shadow-xl";
        el.innerHTML = `
            <div class="flex justify-between items-center opacity-40 text-[10px] font-black uppercase tracking-widest">
                <span>${h.from} <i data-lucide="arrow-right" class="inline w-3 h-3"></i> ${h.to}</span>
                <span>${h.date}</span>
            </div>
            <p class="text-xs opacity-60 line-clamp-1 border-r-2 border-indigo-500 pr-2">${h.src}</p>
            <p class="text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed">${h.res}</p>
            <div class="flex gap-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="restoreHistory(${h.id})" class="text-xs font-black bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg">استفاده</button>
                <button onclick="deleteHistoryItem(${h.id})" class="text-xs font-black text-red-500 border border-red-500/20 px-5 py-2.5 rounded-xl hover:bg-red-50">حذف</button>
            </div>
        `;
        list.appendChild(el);
    });
    lucide.createIcons();
}

function restoreHistory(id) {
    const h = state.history.find(x => x.id === id);
    if (h) {
        document.getElementById('sourceText').value = h.src;
        document.getElementById('resultText').innerText = h.res;
        document.getElementById('sourceLang').value = h.from;
        document.getElementById('targetLang').value = h.to;
        document.getElementById('resultWrapper').classList.remove('hidden');
        updateDir();
        switchTab('translate');
    }
}

function deleteHistoryItem(id) {
    if(!confirm('حذف شود؟')) return;
    state.history = state.history.filter(x => x.id !== id);
    localStorage.setItem('ultima_history', JSON.stringify(state.history));
    renderHistory();
}

function clearHistory() {
    if(!confirm('همه تاریخچه پاک شود؟')) return;
    state.history = [];
    localStorage.setItem('ultima_history', JSON.stringify([]));
    renderHistory();
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('opacity-0', 'scale-90');
    setTimeout(() => t.classList.add('opacity-0', 'scale-90'), 3000);
}

async function pasteText() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('sourceText').value = text;
        toast("متن جایگذاری شد");
    } catch (e) { toast("دسترسی به کلیپ‌بورد ندارید"); }
}

function clearText() {
    document.getElementById('sourceText').value = '';
    toast("پاک شد");
}

function copyResult() {
    const t = document.getElementById('resultText').innerText;
    if(t.includes("نتیجه هوشمند")) return;
    navigator.clipboard.writeText(t).then(() => toast("کپی شد"));
}

function updateDir() {
    const rtl = ['fa', 'ar', 'ur'].includes(document.getElementById('targetLang').value);
    const res = document.getElementById('resultContainer');
    res.dir = rtl ? 'rtl' : 'ltr';
    res.className = `p-8 max-h-[500px] overflow-y-auto scroller relative z-10 ${rtl ? 'text-right' : 'text-left'}`;
}

async function fetchModels(p) {
    toast("در حال دریافت لیست مدل‌ها...");
    const keys = getKeys(p === 'gemini' ? 'gemini' : 'or');
    if(keys.length === 0) return toast("لطفاً حداقل یک کلید API وارد کنید");

    const key = keys[0]; // Use first key for syncing
    try {
        if (p === 'gemini') {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const d = await r.json();
            if(d.models) {
                const s = document.getElementById('geminiModel'); s.innerHTML = '';
                d.models.forEach(m => {
                    if(m.supportedGenerationMethods.includes('generateContent')) 
                        s.add(new Option(m.name.split('/')[1], m.name.split('/')[1]));
                });
                saveState();
            }
        } else {
            const r = await fetch("https://openrouter.ai/api/v1/models");
            const d = await r.json();
            if(d.data) {
                const s = document.getElementById('orModel'); s.innerHTML = '';
                d.data.forEach(m => s.add(new Option(m.name, m.id)));
                saveState();
            }
        }
        toast("مدل‌ها بروز شدند");
    } catch (e) { toast("خطا در دریافت مدل‌ها"); }
}