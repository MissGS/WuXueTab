// ---------- 数据 ----------
// 存储搜索引擎数据，键为搜索引擎名称，值为搜索URL模板
let engines = JSON.parse(localStorage.getItem("engines")) || {
    "必应": "https://www.bing.com/search?q=%s",
    "百度": "https://www.baidu.com/s?wd=%s",
    "谷歌": "https://www.google.com/search?q=%s"
};

// 当前选中的搜索引擎，默认为必应
let currentEngine = localStorage.getItem("currentEngine") || "必应";

// 一言设置

// 加载配置文件
let config = JSON.parse(localStorage.getItem("config")) || {
    hitokotoEnabled: true,
    hitokotoDragEnabled: true,
    searchBoxPosition: null,
    hitokotoPosition: null
};

// ---------- 元素 ----------
// 获取页面中的各种DOM元素引用
const overlay = document.getElementById("overlay");                      // 遮罩层
const settingsBtn = document.getElementById("settingsBtn");              // 设置按钮
const settingsPanel = document.getElementById("settingsPanel");          // 设置面板
const searchBox = document.getElementById("searchBox");                  // 搜索框
const searchInput = document.getElementById("searchInput");              // 搜索输入框
const searchBtn = document.getElementById("searchBtn");                  // 搜索按钮
const currentEngineBtn = document.getElementById("currentEngineBtn");    // 当前搜索引擎按钮
const closeSettings = document.getElementById("closeSettings");          // 关闭设置按钮
const currentBgPreview = document.getElementById("currentBgPreview");    // 当前背景预览
const hitokotoBox = document.getElementById("hitokotoBox");              // 每日一言容器
const hitokotoText = document.getElementById("hitokotoText");            // 每日一言文本

const enginePopup = document.getElementById("enginePopup");              // 搜索引擎选择弹窗
const popupEngineList = document.getElementById("popupEngineList");      // 弹窗中的搜索引擎列表
const popupClose = document.getElementById("popupClose");                // 弹窗关闭按钮

const confirmPopup = document.getElementById("confirmPopup");            // 确认删除弹窗
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");      // 取消删除按钮
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");    // 确认删除按钮

const defaultGroupHeader = document.getElementById("defaultGroupHeader"); // 默认搜索引擎分组标题
const defaultGroupContent = document.getElementById("defaultGroupContent"); // 默认搜索引擎分组内容

// 用于跟踪待删除的搜索引擎
let engineToDelete = null;

// ---------- 性能优化 ----------
// 缓存常用DOM元素
let cachedElements = {};

// 优化的防抖函数
function debounce(func, wait) {
    let timeout = null;
    return function(...args) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 缓存的窗口尺寸
let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;

// 更新缓存尺寸
function updateWindowSize() {
    windowHeight = window.innerHeight;
    windowWidth = window.innerWidth;
}

// 监听窗口尺寸变化
window.addEventListener('resize', debounce(updateWindowSize, 100));

// ---------- 分组管理 ----------
// 为默认搜索引擎分组添加展开/折叠功能
defaultGroupHeader.addEventListener('click', () => {
    // 切换折叠状态
    defaultGroupContent.classList.toggle('collapsed');
    // 旋转指示图标
    const icon = defaultGroupHeader.querySelector('.toggle-icon');
    icon.classList.toggle('rotated');
});

// 初始化时确保分组是折叠的
defaultGroupContent.classList.add('collapsed');
const toggleIcon = defaultGroupHeader.querySelector('.toggle-icon');
toggleIcon.classList.remove('rotated');

// ---------- 面板显示 ----------
/**
 * 控制设置面板的显示和隐藏
 * @param {boolean} show - true表示显示面板，false表示隐藏面板
 */
function toggleSettings(show){
    if(show){
        settingsPanel.classList.add("show");
        overlay.style.display="block";
        // 更新当前背景预览
        updateCurrentBgPreview();
    }else{
        settingsPanel.classList.remove("show");
        overlay.style.display="none";
    }
}

// 初始化设置面板状态
/**
 * 初始化设置面板的状态，确保正确显示默认内容
 */
function initSettingsPanel() {
    // 隐藏所有功能区
    document.querySelectorAll('.function-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 隐藏所有非背景相关的小分类
    document.querySelectorAll('.subcategory-item').forEach(subItem => {
        if (subItem.getAttribute('data-category') !== 'background') {
            subItem.style.display = 'none';
        }
    });
    
    // 确保背景相关的小分类可见并激活第一个
    const backgroundSubItems = document.querySelectorAll('.subcategory-item[data-category="background"]');
    backgroundSubItems.forEach((subItem, index) => {
        subItem.style.display = 'block';
        if (index === 0) {
            subItem.classList.add('active');
            // 显示对应的功能区
            const subcategory = subItem.getAttribute('data-subcategory');
            const targetContent = document.getElementById(subcategory);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        } else {
            subItem.classList.remove('active');
        }
    });
    
    // 确保背景大分类被激活
    document.querySelectorAll('.category-item').forEach(categoryItem => {
        categoryItem.classList.remove('active');
        if (categoryItem.getAttribute('data-category') === 'background') {
            categoryItem.classList.add('active');
        }
    });
    
    // 设置每日一言开关状态 - 同步config中的设置
    document.getElementById('hitokotoTogglePanel').checked = config.hitokotoEnabled;
}

// 绑定各种事件处理器
settingsBtn.onclick = ()=>{
    toggleSettings(true);
    // 延迟初始化设置面板，确保DOM已完全加载
    setTimeout(initSettingsPanel, 10);
};
closeSettings.onclick = ()=>toggleSettings(false);
overlay.onclick = ()=>{
    toggleSettings(false); 
    enginePopup.classList.remove("show");
    confirmPopup.classList.remove("show");
};

// ---------- 更新当前背景预览 ----------
/**
 * 更新当前背景预览图，显示当前正在使用的背景
 */
function updateCurrentBgPreview() {
    // 获取当前背景URL
    const currentBg = document.body.style.getPropertyValue('--bg');
    if (currentBg) {
        // 提取url()中的内容
        const urlMatch = currentBg.match(/url\(["']?(.*?)["']?\)/);
        if (urlMatch && urlMatch[1]) {
            currentBgPreview.style.backgroundImage = `url("${urlMatch[1]}")`;
        }
    } else {
        // 如果没有设置背景，显示默认背景
        currentBgPreview.style.backgroundImage = 'var(--bg)';
    }
}

// ---------- 新设置面板分类切换 ----------
// 大分类切换
document.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
        // 移除所有大分类的激活状态
        document.querySelectorAll('.category-item').forEach(i => {
            i.classList.remove('active');
        });
        // 添加当前点击的大分类为激活状态
        item.classList.add('active');
        
        // 隐藏所有功能区
        document.querySelectorAll('.function-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 显示关联的小分类并隐藏其他小分类
        const category = item.getAttribute('data-category');
        document.querySelectorAll('.subcategory-item').forEach(subItem => {
            if (subItem.getAttribute('data-category') === category) {
                subItem.style.display = 'block';
            } else {
                subItem.style.display = 'none';
            }
        });
        
        // 激活第一个匹配的小分类并显示对应功能区
        const firstSubItem = document.querySelector(`.subcategory-item[data-category="${category}"]`);
        if (firstSubItem) {
            firstSubItem.classList.add('active');
            const subcategory = firstSubItem.getAttribute('data-subcategory');
            const targetContent = document.getElementById(subcategory);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }
    });
});

// 小分类切换
document.querySelectorAll('.subcategory-item').forEach(item => {
    item.addEventListener('click', () => {
        // 移除所有小分类的激活状态
        document.querySelectorAll('.subcategory-item').forEach(i => {
            i.classList.remove('active');
        });
        // 添加当前点击的小分类为激活状态
        item.classList.add('active');
        
        // 显示对应的功能区
        const subcategory = item.getAttribute('data-subcategory');
        document.querySelectorAll('.function-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === subcategory) {
                content.classList.add('active');
            }
        });
    });
});

// ---------- 背景预览点击事件 ----------
// 点击每日一图预览图获取并设置新的背景
document.getElementById('dailyBgPreview').addEventListener('click', async () => {
    try {
        const res = await fetch("https://t.alcy.cc/ycy");
        if (res.ok) {
            const url = await res.text();
            document.body.style.setProperty("--bg", `url(${url})`);
            // 保存背景以便在新标签页中恢复
            localStorage.setItem('customBackground', url);
            // 更新预览
            updateCurrentBgPreview();
        }
    } catch (e) {
        console.error(e);
    }
    
    // 视觉反馈
    const preview = document.getElementById('dailyBgPreview');
    preview.style.transform = 'scale(0.95)';
    setTimeout(() => {
        preview.style.transform = '';
    }, 200);
});

// 点击当前背景预览图应用当前背景
document.getElementById('currentBgPreview').addEventListener('click', () => {
    // 获取当前背景URL
    const currentBg = document.body.style.getPropertyValue('--bg');
    if (currentBg) {
        // 应用当前背景
        document.body.style.setProperty("--bg", currentBg);
        // 保存背景以便在新标签页中恢复
        localStorage.setItem('customBackground', currentBg);
    }
    
    // 视觉反馈
    const preview = document.getElementById('currentBgPreview');
    preview.style.transform = 'scale(0.95)';
    setTimeout(() => {
        preview.style.transform = '';
    }, 200);
});

// ---------- 搜索引擎 ----------
/**
 * 更新当前搜索引擎按钮的文本显示
 */
function refreshCurrentEngineBtn(){
    currentEngineBtn.textContent = currentEngine;
}
refreshCurrentEngineBtn();

/**
 * 执行搜索操作
 */
function doSearch(){
    // 检查搜索关键字是否为空
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        alert("请输入搜索关键字");
        return;
    }
    
    // 检查当前引擎是否存在
    if (!engines[currentEngine]) {
        alert("当前搜索引擎配置有误");
        return;
    }
    
    try {
        const encodedSearchTerm = encodeURIComponent(searchTerm);
        const url = engines[currentEngine].replace("%s", encodedSearchTerm);
        window.location.href = url;
    } catch (error) {
        console.error("搜索过程中发生错误:", error);
        alert("搜索过程出现错误");
    }
}

searchBtn.onclick = doSearch;
searchInput.onkeydown = e => { 
    if(e.key === "Enter") {
        e.preventDefault(); // 阻止表单默认提交行为
        doSearch(); 
    }
};

// 为搜索输入框添加专门的点击事件处理程序
searchInput.onclick = (e) => {
    // 阻止事件冒泡到父级搜索框元素，避免触发拖拽
    e.stopPropagation();
};

// ---------- 弹窗选择搜索引擎 ----------
// 点击当前搜索引擎按钮时显示搜索引擎选择弹窗
currentEngineBtn.onclick = ()=>{
    popupEngineList.innerHTML="";
    Object.keys(engines).forEach(name=>{
        const btn = document.createElement("button");
        btn.textContent = name;
        // 点击切换搜索引擎
        btn.onclick = ()=>{
            currentEngine=name;
            localStorage.setItem("currentEngine",currentEngine);
            refreshCurrentEngineBtn();
            enginePopup.classList.remove("show");
        };
        // 长按删除搜索引擎
        let timer=null;
        btn.onmousedown = ()=>{ timer=setTimeout(()=>{
            // 使用自定义确认弹窗替代浏览器默认confirm
            engineToDelete = { name: name, button: btn };
            document.querySelector('.confirm-message').textContent = `确认删除 ${name} 吗？`;
            confirmPopup.classList.add("show");
        },800); };
        btn.onmouseup=btn.onmouseleave=()=>{ clearTimeout(timer); };
        popupEngineList.appendChild(btn);
    });
    enginePopup.classList.add("show");
};
popupClose.onclick = ()=>enginePopup.classList.remove("show");

// ---------- 删除确认弹窗处理 ----------
// 取消删除操作
cancelDeleteBtn.onclick = () => {
    confirmPopup.classList.remove("show");
    engineToDelete = null;
};

// 确认删除操作
confirmDeleteBtn.onclick = () => {
    if (engineToDelete) {
        const name = engineToDelete.name;
        const btn = engineToDelete.button;
        
        delete engines[name];
        localStorage.setItem("engines", JSON.stringify(engines));
        
        // 更新设置面板中的引擎列表
        refreshEngineList();
        
        // 如果删除的是当前引擎，则切换到第一个引擎
        if (currentEngine === name) {
            currentEngine = Object.keys(engines)[0] || "百度";
            localStorage.setItem("currentEngine", currentEngine);
            refreshCurrentEngineBtn();
        }
        
        // 从弹窗中移除按钮
        if (btn.parentNode) {
            btn.parentNode.removeChild(btn);
        }
        
        confirmPopup.classList.remove("show");
        engineToDelete = null;
    }
};

// ---------- 设置面板搜索引擎管理 ----------
const engineList = document.getElementById("engineList");

/**
 * 刷新设置面板中的搜索引擎列表
 */
function refreshEngineList(){
    engineList.innerHTML="";
    Object.keys(engines).forEach(name=>{
        const btn=document.createElement("button");
        btn.textContent=name;
        btn.className = "glass-button"; // 添加玻璃效果类名
        let timer=null;
        btn.onmousedown = ()=>{ timer=setTimeout(()=>{
            // 使用自定义确认弹窗替代浏览器默认confirm
            engineToDelete = { name: name, button: btn };
            document.querySelector('.confirm-message').textContent = `确认删除 ${name} 吗？`;
            confirmPopup.classList.add("show");
        },800);}
        btn.onmouseup=btn.onmouseleave=()=>{ clearTimeout(timer); };
        engineList.appendChild(btn);
    });
}
refreshEngineList();

// 添加自定义搜索引擎
document.getElementById("addEngineBtn").onclick = ()=>{
    const name=document.getElementById("customName").value.trim();
    const url=document.getElementById("customUrl").value.trim();
    if(!name||!url) return;
    engines[name]=url;
    localStorage.setItem("engines",JSON.stringify(engines));
    refreshEngineList();
};

// ---------- 背景 ----------
/**
 * 获取并设置每日一图作为背景
 */
async function fetchDailyBg(){
    try{
        const res=await fetch("https://t.alcy.cc/ycy");
        if(res.ok){
            const url=await res.text();
            document.body.style.setProperty("--bg",`url(${url})`);
            // 保存背景以便在新标签页中恢复
            localStorage.setItem('customBackground', url);
            // 更新预览
            updateCurrentBgPreview();
        }
    }catch(e){ console.error(e); }
}
fetchDailyBg();

// 将每日一言定位在搜索框下方
function positionHitokotoBelowSearch() {
    // 只有当每日一言处于非拖拽状态时才自动定位
    if (!config.hitokotoDragEnabled || hitokotoBox.style.display === 'none') return;
    
    // 获取搜索框的位置信息
    const searchRect = searchBox.getBoundingClientRect();
    const newTop = searchRect.bottom + 20; // 搜索框下方20px
    
    hitokotoBox.style.top = newTop + "px";
    hitokotoBox.style.left = "50%";
    hitokotoBox.style.transform = "translateX(-50%)";
    
    // 保存位置
    config.hitokotoPosition = {
        top: hitokotoBox.style.top,
        left: hitokotoBox.style.left,
        transform: hitokotoBox.style.transform
    };
    localStorage.setItem('config', JSON.stringify(config));
}

// 页面加载时尝试恢复保存的背景
document.addEventListener('DOMContentLoaded', () => {
    const savedBg = localStorage.getItem('customBackground');
    if (savedBg) {
        document.body.style.setProperty("--bg", `url(${savedBg})`);
    }
    // 初始化预览
    updateCurrentBgPreview();
    
    // 检查是否有保存的搜索框位置
    if (config.searchBoxPosition) {
        const pos = config.searchBoxPosition;
        searchBox.style.top = pos.top;
        searchBox.style.left = pos.left;
        searchBox.style.transform = pos.transform;
    } else {
        // 设置搜索框居中位置（水平居中，垂直50%）
        searchBox.style.top = "50%";
        searchBox.style.left = "50%";
        searchBox.style.transform = "translate(-50%, -50%)";
    }
    
    // 检查是否有保存的每日一言位置
    if (config.hitokotoPosition) {
        const pos = config.hitokotoPosition;
        hitokotoBox.style.top = pos.top;
        hitokotoBox.style.left = pos.left;
        hitokotoBox.style.transform = pos.transform;
    } else {
        // 设置每日一言在搜索框下方居中
        hitokotoBox.style.top = "calc(50% + 60px)";
        hitokotoBox.style.left = "50%";
        hitokotoBox.style.transform = "translate(-50%, -50%)";
    }
    
    // 恢复设置选项 - 使用config中的设置
    document.getElementById('hitokotoToggle').checked = config.hitokotoEnabled;
    document.getElementById('hitokotoDragToggle').checked = config.hitokotoDragEnabled;
    
    // 根据设置显示/隐藏每日一言
    toggleHitokotoDisplay();
    
    // 获取每日一言
    fetchHitokoto();
});

// 上传背景图片
const uploadInput=document.getElementById("uploadBgInput");
uploadInput.onchange=e=>{
    const file=e.target.files[0];
    if(!file) return;
    
    // 检查文件类型
    if(!file.type.match('image.*')) {
        console.error('请选择图片文件');
        return;
    }
    
    const reader=new FileReader();
    reader.onload=function(evt) {
        const result = evt.target.result;
        document.body.style.setProperty("--bg",`url(${result})`);
        // 保存背景以便在新标签页中恢复
        localStorage.setItem('customBackground', result);
        // 更新预览
        updateCurrentBgPreview();
    };
    reader.onerror = function(err) {
        console.error('文件读取出错:', err);
    };
    reader.readAsDataURL(file);
    // 清空input值，确保可以重复上传同一张图片
    e.target.value = '';
};

// ---------- 优化的搜索框拖拽 ----------
let isDraggingSearch = false;
let searchOffsetX = 0;
let searchOffsetY = 0;
let initialSearchTop = 0;

// 使用requestAnimationFrame优化拖拽性能
function updateSearchBoxPosition(e) {
    if (!isDraggingSearch) return;
    
    let newTop = e.clientY - searchOffsetY;
    
    // 限制在窗口范围内（只允许垂直移动）
    newTop = Math.max(0, Math.min(windowHeight - searchBox.offsetHeight, newTop));
    
    // 保持水平居中
    searchBox.style.top = newTop + "px";
    searchBox.style.left = "50%";
    searchBox.style.transform = "translate(-50%, 0)";
    
    // 保存位置（使用防抖减少存储频率）
    debouncedSaveSearchPosition();
}

// 防抖保存位置
const debouncedSaveSearchPosition = debounce(() => {
    config.searchBoxPosition = {
        top: searchBox.style.top,
        left: searchBox.style.left,
        transform: searchBox.style.transform
    };
    localStorage.setItem('config', JSON.stringify(config));
}, 150);

searchBox.addEventListener("mousedown", e => {
    // 如果点击的是输入框或按钮，不执行拖拽
    if (e.target === searchInput || e.target === searchBtn || e.target === currentEngineBtn) {
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingSearch = true;
    const rect = searchBox.getBoundingClientRect();
    searchOffsetX = e.clientX - rect.left;
    searchOffsetY = e.clientY - rect.top;
    initialSearchTop = rect.top;
    searchBox.classList.add('dragging');
    
    function onMouseMove(e) {
        if (!isDraggingSearch) return;
        updateSearchBoxPosition(e);
    }
    
    function onMouseUp() {
        if (!isDraggingSearch) return;
        isDraggingSearch = false;
        searchBox.classList.remove('dragging');
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("mouseleave", onMouseUp);
        
        // 保存最终位置
        config.searchBoxPosition = {
            top: searchBox.style.top,
            left: searchBox.style.left,
            transform: searchBox.style.transform
        };
        localStorage.setItem('config', JSON.stringify(config));
    }
    
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseUp);
});

// ---------- 优化的每日一言拖拽 ----------
let isDraggingHitokoto = false;
let hitokotoOffsetX = 0;
let hitokotoOffsetY = 0;
let initialHitokotoTop = 0;

function updateHitokotoPosition(e) {
    if (!isDraggingHitokoto) return;
    
    let newTop = e.clientY - hitokotoOffsetY;
    
    newTop = Math.max(0, Math.min(windowHeight - hitokotoBox.offsetHeight, newTop));
    
    // 保持水平居中
    hitokotoBox.style.top = newTop + "px";
    hitokotoBox.style.left = "50%";
    hitokotoBox.style.transform = "translate(-50%, 0)";
    
    // 保存位置
    debouncedSaveHitokotoPosition();
}

// 防抖保存每日一言位置
const debouncedSaveHitokotoPosition = debounce(() => {
    config.hitokotoPosition = {
        top: hitokotoBox.style.top,
        left: hitokotoBox.style.left,
        transform: hitokotoBox.style.transform
    };
    localStorage.setItem('config', JSON.stringify(config));
}, 150);

hitokotoBox.addEventListener("mousedown", e => {
    // 如果禁用了拖拽功能，则不执行
    if (!config.hitokotoDragEnabled) return;
    
    // 只有点击文本部分才允许拖拽
    if (e.target === hitokotoText) {
        e.preventDefault();
        e.stopPropagation();
        
        isDraggingHitokoto = true;
        const rect = hitokotoBox.getBoundingClientRect();
        hitokotoOffsetX = e.clientX - rect.left;
        hitokotoOffsetY = e.clientY - rect.top;
        initialHitokotoTop = rect.top;
        hitokotoBox.classList.add('dragging');
        
        function onMouseMove(e) {
            if (!isDraggingHitokoto) return;
            updateHitokotoPosition(e);
        }
        
        function onMouseUp() {
            if (!isDraggingHitokoto) return;
            isDraggingHitokoto = false;
            hitokotoBox.classList.remove('dragging');
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mouseleave", onMouseUp);
            
            // 保存最终位置
            config.hitokotoPosition = {
                top: hitokotoBox.style.top,
                left: hitokotoBox.style.left,
                transform: hitokotoBox.style.transform
            };
            localStorage.setItem('config', JSON.stringify(config));
        }
        
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("mouseleave", onMouseUp);
    }
});

// ---------- 每日一言功能 ----------
/**
 * 获取并显示每日一言
 */
async function fetchHitokoto() {
    if (!config.hitokotoEnabled) return;
    
    try {
        const res = await fetch("https://v1.hitokoto.cn/?encode=json&charset=utf-8");
        if (res.ok) {
            const data = await res.json();
            hitokotoText.textContent = data.hitokoto;
        } else {
            hitokotoText.textContent = "获取失败，请稍后再试";
        }
    } catch (e) {
        console.error(e);
        hitokotoText.textContent = "网络错误，获取失败";
    }
}

/**
 * 切换每日一言显示状态
 */
function toggleHitokotoDisplay() {
    if (config.hitokotoEnabled) {
        hitokotoBox.style.display = "flex";
        fetchHitokoto(); // 获取一言内容
    } else {
        hitokotoBox.style.display = "none";
    }
    
    // 保存设置状态
    localStorage.setItem("config", JSON.stringify(config));
}

// ---------- 设置面板事件监听 ----------
// 监听每日一言开关
document.getElementById('hitokotoToggle').addEventListener('change', function() {
    config.hitokotoEnabled = this.checked;
    localStorage.setItem("config", JSON.stringify(config));
    toggleHitokotoDisplay();
    
    // 同步设置面板中的开关状态
    document.getElementById('hitokotoTogglePanel').checked = this.checked;
});

// 监听设置面板中的每日一言开关
document.getElementById('hitokotoTogglePanel').addEventListener('change', function() {
    config.hitokotoEnabled = this.checked;
    localStorage.setItem("config", JSON.stringify(config));
    toggleHitokotoDisplay();
    
    // 同步主页设置开关状态
    document.getElementById('hitokotoToggle').checked = this.checked;
});

// 监听每日一言拖拽开关
document.getElementById('hitokotoDragToggle').addEventListener('change', function() {
    config.hitokotoDragEnabled = this.checked;
    localStorage.setItem("config", JSON.stringify(config));
    
    // 立即应用设置
    if (!config.hitokotoDragEnabled) {
        // 如果禁用拖拽，恢复到默认位置
        positionHitokotoBelowSearch();
    }
});