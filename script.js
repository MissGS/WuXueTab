// ---------- 数据 ----------
const DEFAULT_ENGINES = {
    "必应": "https://www.bing.com/search?q=%s",
    "百度": "https://www.baidu.com/s?wd=%s",
    "谷歌": "https://www.google.com/search?q=%s"
};

function readJson(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value && typeof value === "object" ? value : fallback;
    } catch {
        return fallback;
    }
}

let engines = readJson("engines", DEFAULT_ENGINES);
if (!Object.keys(engines).length) engines = { ...DEFAULT_ENGINES };
let currentEngine = localStorage.getItem("currentEngine") || Object.keys(engines)[0] || "必应";
if (!engines[currentEngine]) currentEngine = Object.keys(engines)[0] || "必应";

let activeCategory = localStorage.getItem("activeCategory") || "background";
let activeSubcategory = localStorage.getItem("activeSubcategory") || "background-options";
let engineToDelete = null;
let toastTimer = null;

// ---------- 元素 ----------
const overlay = document.getElementById("overlay");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const searchBox = document.getElementById("searchBox");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const currentEngineBtn = document.getElementById("currentEngineBtn");
const closeSettings = document.getElementById("closeSettings");
const currentBgPreview = document.getElementById("currentBgPreview");
const dailyBgPreview = document.getElementById("dailyBgPreview");
const enginePopup = document.getElementById("enginePopup");
const popupEngineList = document.getElementById("popupEngineList");
const popupClose = document.getElementById("popupClose");
const confirmPopup = document.getElementById("confirmPopup");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const defaultGroupHeader = document.getElementById("defaultGroupHeader");
const defaultGroupContent = document.getElementById("defaultGroupContent");
const engineList = document.getElementById("engineList");
const customName = document.getElementById("customName");
const customUrl = document.getElementById("customUrl");
const addEngineBtn = document.getElementById("addEngineBtn");
const uploadInput = document.getElementById("uploadBgInput");
const toast = document.getElementById("toast");
const dailyQuoteBox = document.getElementById("dailyQuoteBox");
const dailyQuoteText = document.getElementById("dailyQuoteText");
const dailyQuoteFrom = document.getElementById("dailyQuoteFrom");
const refreshQuoteBtn = document.getElementById("refreshQuoteBtn");
const quoteToggle = document.getElementById("quoteToggle");

let quoteEnabled = localStorage.getItem("quoteEnabled") !== "false";

// ---------- 轻提示 ----------
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function nudgeSearchBox(message) {
    showToast(message);
    searchBox.classList.remove("shake");
    void searchBox.offsetWidth;
    searchBox.classList.add("shake");
    searchInput.focus();
}

// ---------- 设置面板 ----------
function setOverlay(show) {
    overlay.classList.toggle("show", show);
}

function toggleSettings(show) {
    settingsPanel.classList.toggle("show", show);
    setOverlay(show || enginePopup.classList.contains("show") || confirmPopup.classList.contains("show"));
    if (show) {
        applySettingsView(activeCategory, activeSubcategory);
        updateCurrentBgPreview();
    }
}

function applySettingsView(category, preferredSubcategory) {
    const categoryItems = [...document.querySelectorAll(".category-item")];
    const subItems = [...document.querySelectorAll(".subcategory-item")];
    const contents = [...document.querySelectorAll(".function-content")];
    const visibleSubItems = subItems.filter(item => item.dataset.category === category);
    const targetSubcategory = visibleSubItems.some(item => item.dataset.subcategory === preferredSubcategory)
        ? preferredSubcategory
        : visibleSubItems[0]?.dataset.subcategory;

    categoryItems.forEach(item => item.classList.toggle("active", item.dataset.category === category));
    subItems.forEach(item => {
        const visible = item.dataset.category === category;
        item.style.display = visible ? "block" : "none";
        item.classList.toggle("active", item.dataset.subcategory === targetSubcategory);
    });
    contents.forEach(content => content.classList.toggle("active", content.id === targetSubcategory));

    activeCategory = category;
    activeSubcategory = targetSubcategory || preferredSubcategory;
    localStorage.setItem("activeCategory", activeCategory);
    localStorage.setItem("activeSubcategory", activeSubcategory);
}

settingsBtn.onclick = () => toggleSettings(true);
closeSettings.onclick = () => toggleSettings(false);
overlay.onclick = () => {
    toggleSettings(false);
    enginePopup.classList.remove("show");
    confirmPopup.classList.remove("show");
    setOverlay(false);
};

document.querySelectorAll(".category-item").forEach(item => {
    item.addEventListener("click", () => applySettingsView(item.dataset.category, activeSubcategory));
});

document.querySelectorAll(".subcategory-item").forEach(item => {
    item.addEventListener("click", () => applySettingsView(item.dataset.category, item.dataset.subcategory));
});

defaultGroupHeader.addEventListener("click", () => {
    defaultGroupContent.classList.toggle("collapsed");
    defaultGroupHeader.querySelector(".toggle-icon").classList.toggle("rotated");
});

// ---------- 背景 ----------
function setBackground(value) {
    document.body.style.setProperty("--bg", `url("${value}")`);
    localStorage.setItem("uploadedBackground", value);
    updateCurrentBgPreview();
}

function updateCurrentBgPreview() {
    const currentBg = document.body.style.getPropertyValue("--bg");
    const urlMatch = currentBg.match(/url\(["']?(.*?)["']?\)/);
    currentBgPreview.style.backgroundImage = urlMatch?.[1] ? `url("${urlMatch[1]}")` : "none";
    currentBgPreview.textContent = urlMatch?.[1] ? "" : "暂无背景";
}

async function fetchDailyBg(apply = false) {
    try {
        const res = await fetch("https://t.alcy.cc/ycy");
        if (!res.ok) throw new Error("background request failed");
        const url = (await res.text()).trim();
        if (apply) {
            setBackground(url);
            showToast("已切换每日一图");
        }
        return url;
    } catch (error) {
        console.error(error);
        showToast("每日一图暂时获取失败");
        return null;
    }
}

dailyBgPreview.addEventListener("click", async () => {
    dailyBgPreview.style.transform = "scale(0.98)";
    await fetchDailyBg(false);
    showToast("每日一图仅作预览，上传后才会设置背景");
    setTimeout(() => dailyBgPreview.style.transform = "", 180);
});

currentBgPreview.addEventListener("click", () => {
    updateCurrentBgPreview();
    showToast("当前背景已保持");
});

uploadInput.onchange = event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        showToast("请选择图片文件");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
        setBackground(evt.target.result);
        showToast("背景已更新");
    };
    reader.onerror = err => {
        console.error("文件读取出错:", err);
        showToast("图片读取失败");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
};

// ---------- 每日一言 ----------
function formatQuoteSource(data) {
    const from = data.from ? `《${data.from}》` : "未知出处";
    return data.from_who ? `${data.from_who} · ${from}` : from;
}

async function fetchDailyQuote() {
    if (!quoteEnabled) return;

    dailyQuoteText.textContent = "正在加载每日一言...";
    dailyQuoteFrom.textContent = "一言 Hitokoto";

    try {
        const res = await fetch("https://v1.hitokoto.cn/?encode=json");
        if (!res.ok) throw new Error("quote request failed");
        const data = await res.json();
        dailyQuoteText.textContent = data.hitokoto || "今天也要好好生活。";
        dailyQuoteFrom.textContent = formatQuoteSource(data);
    } catch (error) {
        console.error(error);
        dailyQuoteText.textContent = "今天也要好好生活。";
        dailyQuoteFrom.textContent = "本地默认";
        showToast("每日一言暂时获取失败");
    }
}

function applyQuoteVisibility() {
    quoteToggle.checked = quoteEnabled;
    dailyQuoteBox.classList.toggle("hidden", !quoteEnabled);
    if (quoteEnabled && dailyQuoteText.textContent === "正在加载每日一言...") {
        fetchDailyQuote();
    }
}

quoteToggle.onchange = () => {
    quoteEnabled = quoteToggle.checked;
    localStorage.setItem("quoteEnabled", String(quoteEnabled));
    applyQuoteVisibility();
    showToast(quoteEnabled ? "每日一言已开启" : "每日一言已关闭");
};

refreshQuoteBtn.onclick = event => {
    event.stopPropagation();
    fetchDailyQuote();
};

// ---------- 搜索 ----------
function normalizeEngineUrl(url) {
    const trimmed = url.trim();
    if (!trimmed) return "";
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return withProtocol.includes("%s")
        ? withProtocol
        : `${withProtocol}${withProtocol.includes("?") ? "&" : "?"}q=%s`;
}

function looksLikeUrl(text) {
    return /^(https?:\/\/|localhost(:\d+)?(\/|$)|[\w-]+\.[\w.-]{2,})(\S*)$/i.test(text);
}

function buildSearchUrl(term) {
    if (looksLikeUrl(term)) {
        if (/^https?:\/\//i.test(term) || /^localhost/i.test(term)) return term;
        return `https://${term}`;
    }

    const template = engines[currentEngine];
    if (!template) return null;
    return template.replace("%s", encodeURIComponent(term));
}

function refreshCurrentEngineBtn() {
    currentEngineBtn.textContent = currentEngine;
    currentEngineBtn.title = `当前搜索引擎：${currentEngine}`;
}

function setCurrentEngine(name) {
    if (!engines[name]) return;
    currentEngine = name;
    localStorage.setItem("currentEngine", currentEngine);
    refreshCurrentEngineBtn();
    refreshEngineList();
    renderEnginePopup();
}

function doSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        nudgeSearchBox("先输入一点内容");
        return;
    }

    const url = buildSearchUrl(searchTerm);
    if (!url) {
        nudgeSearchBox("当前搜索引擎不可用，请重新选择");
        return;
    }

    localStorage.setItem("lastSearchText", searchTerm);
    window.location.href = url;
}

searchBtn.onclick = doSearch;
searchInput.onkeydown = event => {
    if (event.key === "Enter") {
        event.preventDefault();
        doSearch();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.select();
    }
    if (event.key === "Escape") searchInput.value = "";
};
searchInput.onclick = event => event.stopPropagation();

document.addEventListener("keydown", event => {
    const isTyping = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (!isTyping && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        searchInput.focus();
    }
});

// ---------- 搜索引擎弹窗 ----------
function renderEnginePopup() {
    popupEngineList.innerHTML = "";
    Object.keys(engines).forEach(name => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.toggle("active-engine", name === currentEngine);
        btn.innerHTML = `<span>${name}</span><span>${name === currentEngine ? "当前" : "切换"}</span>`;
        btn.onclick = () => {
            setCurrentEngine(name);
            enginePopup.classList.remove("show");
            if (!settingsPanel.classList.contains("show")) setOverlay(false);
            showToast(`已切换到 ${name}`);
        };
        popupEngineList.appendChild(btn);
    });
}

function positionEnginePopup() {
    const rect = searchBox.getBoundingClientRect();
    enginePopup.style.top = `${Math.min(window.innerHeight - 20, rect.bottom + 12)}px`;
    enginePopup.style.left = `${rect.left + rect.width / 2}px`;
}

currentEngineBtn.onclick = event => {
    event.stopPropagation();
    renderEnginePopup();
    positionEnginePopup();
    enginePopup.classList.toggle("show");
    setOverlay(enginePopup.classList.contains("show") || settingsPanel.classList.contains("show"));
};

popupClose.onclick = () => {
    enginePopup.classList.remove("show");
    if (!settingsPanel.classList.contains("show")) setOverlay(false);
};

// ---------- 删除确认 ----------
function askDeleteEngine(name) {
    if (Object.keys(engines).length <= 1) {
        showToast("至少保留一个搜索引擎");
        return;
    }
    engineToDelete = name;
    document.querySelector(".confirm-message").textContent = `确认删除 ${name} 吗？`;
    confirmPopup.classList.add("show");
    setOverlay(true);
}

cancelDeleteBtn.onclick = () => {
    confirmPopup.classList.remove("show");
    engineToDelete = null;
    setOverlay(settingsPanel.classList.contains("show") || enginePopup.classList.contains("show"));
};

confirmDeleteBtn.onclick = () => {
    if (!engineToDelete) return;
    delete engines[engineToDelete];
    localStorage.setItem("engines", JSON.stringify(engines));
    if (currentEngine === engineToDelete) setCurrentEngine(Object.keys(engines)[0]);
    refreshEngineList();
    renderEnginePopup();
    showToast("搜索引擎已删除");
    confirmPopup.classList.remove("show");
    engineToDelete = null;
    setOverlay(settingsPanel.classList.contains("show") || enginePopup.classList.contains("show"));
};

// ---------- 设置面板搜索引擎管理 ----------
function refreshEngineList() {
    engineList.innerHTML = "";
    Object.keys(engines).forEach(name => {
        const row = document.createElement("div");
        row.className = `glass-button engine-row${name === currentEngine ? " active-engine" : ""}`;

        const label = document.createElement("span");
        label.textContent = name;

        const actions = document.createElement("span");
        actions.className = "engine-actions";

        const useBtn = document.createElement("button");
        useBtn.type = "button";
        useBtn.className = "mini-button";
        useBtn.textContent = name === currentEngine ? "当前" : "设为默认";
        useBtn.disabled = name === currentEngine;
        useBtn.onclick = event => {
            event.stopPropagation();
            setCurrentEngine(name);
            showToast(`默认引擎已设为 ${name}`);
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "mini-button delete-button";
        deleteBtn.textContent = "删除";
        deleteBtn.onclick = event => {
            event.stopPropagation();
            askDeleteEngine(name);
        };

        actions.append(useBtn, deleteBtn);
        row.append(label, actions);
        row.onclick = () => setCurrentEngine(name);
        engineList.appendChild(row);
    });
}

addEngineBtn.onclick = () => {
    const name = customName.value.trim();
    const url = normalizeEngineUrl(customUrl.value);

    if (!name) {
        showToast("给引擎起个名字");
        customName.focus();
        return;
    }
    if (!url) {
        showToast("填一下搜索链接");
        customUrl.focus();
        return;
    }

    engines[name] = url;
    localStorage.setItem("engines", JSON.stringify(engines));
    setCurrentEngine(name);
    customName.value = "";
    customUrl.value = "";
    defaultGroupContent.classList.remove("collapsed");
    defaultGroupHeader.querySelector(".toggle-icon").classList.add("rotated");
    showToast("搜索引擎已添加");
};

// ---------- 搜索框拖拽 ----------
let offsetY = 0;
searchBox.addEventListener("mousedown", event => {
    if ([searchInput, searchBtn, currentEngineBtn].includes(event.target)) return;

    event.preventDefault();
    searchBox.classList.add("dragging");
    offsetY = event.clientY - searchBox.getBoundingClientRect().top;

    function move(moveEvent) {
        const newTop = Math.max(12, Math.min(window.innerHeight - searchBox.offsetHeight - 12, moveEvent.clientY - offsetY));
        searchBox.style.top = `${newTop}px`;
        searchBox.style.left = "50%";
        localStorage.setItem("searchBoxPosition", JSON.stringify({ top: searchBox.style.top, left: searchBox.style.left }));
        if (enginePopup.classList.contains("show")) positionEnginePopup();
    }

    function up() {
        searchBox.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
});

let quoteOffsetY = 0;
dailyQuoteBox.addEventListener("mousedown", event => {
    if (event.target === refreshQuoteBtn || !quoteEnabled) return;

    event.preventDefault();
    dailyQuoteBox.classList.add("dragging");
    quoteOffsetY = event.clientY - dailyQuoteBox.getBoundingClientRect().top;

    function move(moveEvent) {
        const newTop = Math.max(12, Math.min(window.innerHeight - dailyQuoteBox.offsetHeight - 12, moveEvent.clientY - quoteOffsetY));
        dailyQuoteBox.style.top = `${newTop}px`;
        dailyQuoteBox.style.bottom = "auto";
        dailyQuoteBox.style.left = "50%";
        localStorage.setItem("dailyQuotePosition", JSON.stringify({ top: dailyQuoteBox.style.top, left: "50%" }));
    }

    function up() {
        dailyQuoteBox.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
});

// ---------- 初始化 ----------
document.addEventListener("DOMContentLoaded", () => {
    localStorage.removeItem("customBackground");
    const savedBg = localStorage.getItem("uploadedBackground");
    if (savedBg) setBackground(savedBg);
    updateCurrentBgPreview();

    const savedPos = readJson("searchBoxPosition", null);
    if (savedPos?.top) {
        searchBox.style.top = savedPos.top;
        searchBox.style.left = savedPos.left || "50%";
    }

    const savedQuotePos = readJson("dailyQuotePosition", null);
    if (savedQuotePos?.top) {
        dailyQuoteBox.style.top = savedQuotePos.top;
        dailyQuoteBox.style.bottom = "auto";
        dailyQuoteBox.style.left = "50%";
    }

    const lastSearchText = localStorage.getItem("lastSearchText");
    if (lastSearchText) searchInput.value = lastSearchText;

    applySettingsView(activeCategory, activeSubcategory);
    refreshCurrentEngineBtn();
    refreshEngineList();
    renderEnginePopup();
    applyQuoteVisibility();
});
