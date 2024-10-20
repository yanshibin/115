// verification_script.js

(function() {
  const verifyButton = document.querySelector('#js_ver_code_box [rel="verify"]');
  if (!verifyButton) return;

  verifyButton.addEventListener('click', function() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const errorElement = document.querySelector('.vcode-hint');
          if (errorElement && errorElement.style.display !== 'none') {
            console.log('验证失败');
            // 可以在这里添加失败后的处理逻辑，比如显示一个提示
          } else {
            console.log('验证成功');
            // 验证成功，延迟关闭窗口
            setTimeout(() => {
              window.close();
            }, 1000);
          }
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 5秒后断开观察器，防止内存泄漏
    setTimeout(() => {
      observer.disconnect();
    }, 5000);
  });
})();