// AutoIt Help RU — общие функции страниц
// Поддерживает: современный браузер (navigator.clipboard) и CHM (hhctrl, execCommand)

function ClipBoard(id) {
    var code = document.getElementById(id);
    if (!code) return;
    var clone = code.cloneNode(true);
    var spans = clone.getElementsByTagName("span");
    for (var i = spans.length - 1; i >= 0; i--) {
        if (spans[i].className === "code-actions") {
            spans[i].parentNode.removeChild(spans[i]);
        }
    }
    var text = clone.innerText || clone.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        return;
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
}

function OpenScript(id) {
    try {
        var ctl = document.getElementById(id);
        if (ctl && ctl.Click) { ctl.Click(); return; }
    } catch (e) {}
    alert("Открытие примера работает только внутри CHM-справки.");
}

// Перехват кликов по внешним ссылкам (http/https) — открываем в системном браузере.
// В HH Viewer без этого внешние ссылки либо заблокированы, либо открываются во
// встроенном IE7 Trident, который не поддерживает современный TLS/HTTPS.
function _openExternal(href) {
    // 1) Попытка через hhctrl.ocx (работает в CHM/HH Viewer).
    try {
        var sh = document.getElementById("_shellexec");
        if (!sh) {
            sh = document.createElement("object");
            sh.id = "_shellexec";
            sh.type = "application/x-oleobject";
            sh.setAttribute("classid", "clsid:adb880a6-d8ff-11cf-9377-00aa003b7a11");
            sh.style.display = "none";
            var p1 = document.createElement("param");
            p1.name = "Command"; p1.value = "ShellExecute";
            sh.appendChild(p1);
            var p2 = document.createElement("param");
            p2.name = "Item1"; p2.value = ",explorer.exe," + href;
            sh.appendChild(p2);
            document.body.appendChild(sh);
        } else {
            // обновляем параметр Item1
            var params = sh.getElementsByTagName("param");
            for (var i = 0; i < params.length; i++) {
                if (params[i].name === "Item1") {
                    params[i].value = ",explorer.exe," + href;
                }
            }
        }
        if (sh.Click) { sh.Click(); return true; }
    } catch (e) {}
    // 2) Fallback для обычного браузера — просто открыть окно.
    try { window.open(href, "_blank"); return true; } catch (e) {}
    return false;
}

document.attachEvent ? document.attachEvent("onclick", _handleLinkClick)
                     : document.addEventListener("click", _handleLinkClick, false);

function _handleLinkClick(e) {
    e = e || window.event;
    var t = e.target || e.srcElement;
    while (t && t.nodeName !== "A") t = t.parentNode;
    if (!t || !t.href) return;
    var href = t.href;
    if (!/^https?:/i.test(href)) return;
    if (_openExternal(href)) {
        if (e.preventDefault) e.preventDefault();
        e.returnValue = false;
        return false;
    }
}

// ===== Переключатель языка RU <-> EN =====
// EN-зеркало лежит в html/en/. Кнопка вставляется на onload, парная страница
// вычисляется относительным путём (работает в HH Viewer mk:@MSITStore и file:///).

// Флаги-иконки (встроены, чтобы не зависеть от пути/глубины и background-size)
var _FLAG_EN = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAYCAIAAAAd2sgZAAABCUlEQVR42u1WMQ6DMAx0ogz8oT9gYmNmZuQr7YTEUKkTfKWbmTt3y9Qf8IeOHVxZUVKCATVSpXo0Z58dx1wUIkIqMwBQ3B8AcDif2Hu8XD3c0DYAMHW956eoEB9G2TI3FDB1PbkomEBzKSRGGbz6tFug940DtjG5DVB+zR2wi0EUtoqS8ZzBnY7mITHl5hbnGuJ+FCLe7DNy1m5pcxckBITXrSoyhYh1XQtPaZEsYuM4akhoChFpz75ttsyTdvYn+z0ys2pX9uyZTbxnRqJekvIjPyqyqsjMog4JD8pTjI+6qIW/7bgJRUNLdEgo2XFdfM9sP42HH9qGnhqUlhNq4Xg3UIYtqpRPuRd2McPfzKwa+gAAAABJRU5ErkJggg==";
var _FLAG_RU = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAYCAIAAAAd2sgZAAAATklEQVR42mPcsmULA70ACwMDg7e3Nx1s2rp1KxMDHcGoZaOWEUz6xZPP08EmJ6XROBu1bCTns9IfW+lg01kGw9E4G7VscCX9s1qG9LEMAMr/C9VaLwXEAAAAAElFTkSuQmCC";

function _getLangToggleUrl(toEnglish) {
    var href = location.href.replace(/\\/g, "/").replace(/[?#].*$/, "");
    var idx = href.indexOf("/html/");
    if (idx === -1) return null;
    var relPath = href.substring(idx + 6); // часть после "/html/"
    if (!relPath || relPath.charAt(relPath.length - 1) === "/") return null;
    var depth = (relPath.match(/\//g) || []).length;
    var prefix = "";
    for (var i = 0; i < depth; i++) prefix += "../";
    var isEn = relPath.substring(0, 3) === "en/";
    if (toEnglish) {
        if (isEn) return null;
        return prefix + "en/" + relPath;
    }
    if (!isEn) return null;
    return prefix + relPath.substring(3);
}

function _initLangSwitch() {
    if (!document.body) return;
    var href = location.href.replace(/\\/g, "/");
    var isEn = href.indexOf("/html/en/") !== -1;
    var url = _getLangToggleUrl(!isEn);
    if (!url) return;

    // Кнопка-иконка: <a><img флаг></a>. Флаг = ИНДИКАТОР текущей версии:
    // RU-страница — русский флаг, EN-страница — английский (Union Jack).
    // Клик переключает на другой язык. Fixed (всегда вверху справа при скролле).
    var btn = document.createElement("a");
    btn.className = "lang-switch";
    btn.href = url;
    btn.title = isEn ? "Показать русскую версию"
                     : "Показать оригинал (English)";
    var img = document.createElement("img");
    img.src = isEn ? _FLAG_EN : _FLAG_RU;
    img.width = 36;
    img.height = 24;
    img.alt = isEn ? "EN" : "RU";
    img.border = 0;
    btn.appendChild(img);
    document.body.appendChild(btn);
}

if (window.attachEvent) {
    window.attachEvent("onload", _initLangSwitch);
} else if (window.addEventListener) {
    window.addEventListener("load", _initLangSwitch, false);
} else {
    window.onload = _initLangSwitch;
}
