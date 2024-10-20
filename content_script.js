// content_script.js

(function() {
  const INJECTED_CLASS = 'data-115-icon-injected';
  const MAGNET_PREFIX = "magnet:?xt=urn:btih:";
  let iconURL;

  function initializeExtension() {
    console.log('Initializing extension...');
    chrome.runtime.sendMessage({method: "getConfig"}, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Failed to get config:", chrome.runtime.lastError);
        return;
      }
      console.log('Received config:', response);
      iconURL = response?.data?.pluginicon || chrome.runtime.getURL("icons/download_icon.png");
      console.log('Icon URL:', iconURL);
      injectIcons();
      setupObserver();
    });
  }

  function createIcon() {
    const icon = document.createElement("img");
    icon.src = iconURL;
    icon.title = "发送到115离线下载";
    icon.style.cssText = "display:inline-block; width:18px; margin:0 5px 2px 0; vertical-align:middle; cursor:pointer;";
    icon.addEventListener("click", handleIconClick, false);
    return icon;
  }

  function handleIconClick(event) {
    event.preventDefault();
    const url = event.target.nextSibling.href || MAGNET_PREFIX + event.target.nextSibling.textContent.trim();
    console.log('Clicked icon. URL:', url);
    chrome.runtime.sendMessage({action: "sendTo115", url: url});
  }

  function injectIcons() {
    console.log('Injecting icons...');
    let injectedCount = 0;
    document.querySelectorAll(`a[href^="magnet:"]:not(.${INJECTED_CLASS})`).forEach(anchor => {
      anchor.classList.add(INJECTED_CLASS);
      anchor.parentNode.insertBefore(createIcon(), anchor);
      injectedCount++;
    });

    const xpathResult = document.evaluate(
      "//text()[matches(., '^[0-9A-Fa-f]{40}$')]",
      document,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    for (let i = 0; i < xpathResult.snapshotLength; i++) {
      const textNode = xpathResult.snapshotItem(i);
      if (textNode.parentNode.nodeName !== 'A' && !textNode.parentNode.classList.contains(INJECTED_CLASS)) {
        const span = document.createElement('span');
        span.classList.add(INJECTED_CLASS);
        textNode.parentNode.replaceChild(span, textNode);
        span.appendChild(textNode);
        span.insertBefore(createIcon(), textNode);
        injectedCount++;
      }
    }
    console.log(`Injected ${injectedCount} icons.`);
  }

  function setupObserver() {
    console.log('Setting up observer...');
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
        console.log('DOM changed. Re-injecting icons...');
        injectIcons();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('unload', () => {
      observer.disconnect();
    }, { once: true });
  }

  console.log('Content script loaded.');
  initializeExtension();

  window.addEventListener('load', () => {
    console.log('Window loaded. Re-initializing extension...');
    initializeExtension();
  }, { once: true });
})();