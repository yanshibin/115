// background.js

const NOTIFICATION_ICON = chrome.runtime.getURL("icons/icon48.png");
const OFFLINE_TASK_URL = 'https://115.com/?tab=offline&mode=wangpan';
const API_SPACE_URL = "https://115.com/?ct=offline&ac=space";
const API_ADD_TASK_URL = "https://115.com/web/lixian/?ct=lixian&ac=add_task_url";
const MAGNET_PREFIX = "magnet:?xt=urn:btih:";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendTo115",
    title: "发送选中文字到115",
    contexts: ["selection", "link"]
  });
  console.log('Extension installed. Context menu created.');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendTo115") {
    let text = info.selectionText || info.linkUrl;
    if (text) {
      if (text.length === 40 && /^[0-9A-Fa-f]{40}$/.test(text)) {
        text = MAGNET_PREFIX + text;
      }
      sendTo115(text);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  if (request.action === "sendTo115") {
    let url = request.url;
    if (url.length === 40 && /^[0-9A-Fa-f]{40}$/.test(url)) {
      url = MAGNET_PREFIX + url;
    }
    sendTo115(url);
    sendResponse({status: 'Received'});
  } else if (request.method === "getConfig") {
    sendResponse({
      data: {
        pluginicon: chrome.runtime.getURL("icons/download_icon.png")
      }
    });
  }
  return true;
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "accountVerification") {
    openVerificationWindow();
  } else {
    openOfflineTaskPage();
  }
});

function showNotification(message, title = "115网盘离线下载", notificationId = "", duration = 3000) {
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: NOTIFICATION_ICON,
    title,
    message,
    isClickable: true
  }, (createdId) => {
    setTimeout(() => {
      chrome.notifications.clear(createdId);
    }, duration);
  });
}

function openOfflineTaskPage() {
  chrome.tabs.create({ url: OFFLINE_TASK_URL });
}

async function sendTo115(url) {
  try {
    const cookie = await chrome.cookies.get({ url: 'http://115.com', name: 'UID' });
    if (!cookie) {
      showNotification("请先登录115网盘");
      return;
    }

    const spaceResponse = await fetch(API_SPACE_URL, { credentials: "include" });
    const spaceData = await spaceResponse.json();

    if (!spaceData.sign) {
      throw new Error("无法获取签名，请确保已登录115网盘");
    }

    const formData = new URLSearchParams({
      uid: spaceData.uid,
      sign: spaceData.sign,
      time: spaceData.time,
      url: url
    });

    const taskResponse = await fetch(API_ADD_TASK_URL, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });

    const result = await taskResponse.json();

    if (result.state) {
      showNotification(`成功添加离线任务：${result.name || '未知文件名'}`);
    } else if (result.errcode === 10008) {
      showNotification("任务已存在，无需重复添加");
    } else if (result.errcode === 911) {
      handleAccountVerification();
    } else {
      throw new Error(result.error_msg || "未知错误");
    }
  } catch (error) {
    console.error("发送到115失败：", error);
    showNotification(`发送到115失败：${error.message}`);
  }
}

function handleAccountVerification() {
  showNotification("账号异常，请验证账号\n点击此通知前往验证", "115账号验证", "accountVerification");
}

function openVerificationWindow() {
  const time = Date.now();
  const url = `https://captchaapi.115.com/?ac=security_code&type=web&cb=Close911_${time}`;

  chrome.windows.create({
    url: url,
    type: 'popup',
    width: 335,
    height: 500,
    top: Math.round((screen.availHeight - 500) / 2),
    left: Math.round((screen.availWidth - 335) / 2)
  }, (window) => {
    const tabId = window.tabs[0].id;
    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["verification_script.js"]
        });
      }
    });

    chrome.windows.onRemoved.addListener(function windowClosedListener(windowId) {
      if (windowId === window.id) {
        chrome.windows.onRemoved.removeListener(windowClosedListener);
        showNotification("验证完成，请重新尝试离线下载", "115账号验证");
      }
    });
  });
}