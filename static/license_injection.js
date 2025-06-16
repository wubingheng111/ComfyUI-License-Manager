// ComfyUI 卡密验证拦截器 - 完整版本
(function() {
    'use strict';

    let originalFetch = window.fetch;
    let licenseKey = '';  // 不从localStorage读取，每次都需要重新输入
    let dialogShown = false;

    // 重写fetch函数来拦截所有请求
    window.fetch = function(url, options) {
        console.log('[License] 拦截请求:', url, options?.method);
        
        // 检查是否是需要验证的请求
        const needsLicense = (
            (url.includes('/prompt') && options?.method === 'POST') ||
            (url.includes('/queue') && options?.method === 'POST') ||
            (url.includes('/interrupt') && options?.method === 'POST') ||
            (url.includes('/api/') && options?.method === 'POST') ||
            url.includes('/upload/') ||
            url.includes('/view') ||
            url.includes('/history')
        );
        
        if (needsLicense) {
            console.log('[License] 需要验证的请求:', url);
            
            if (!licenseKey) {
                console.log('[License] 没有卡密，显示对话框');
                showLicenseDialog();
                return Promise.reject(new Error('🔒 需要提供有效的卡密才能使用ComfyUI'));
            }

            if (options && options.body) {
                try {
                    const body = JSON.parse(options.body);
                    body.license_key = licenseKey;
                    options.body = JSON.stringify(body);
                    console.log('[License] 已添加卡密到请求');
                } catch (e) {
                    console.error('[License] 添加卡密失败:', e);
                }
            } else if (options) {
                options.body = JSON.stringify({ license_key: licenseKey });
                options.headers = options.headers || {};
                options.headers['Content-Type'] = 'application/json';
            }
        }

        return originalFetch.call(this, url, options);
    };

    // 只拦截特定的ComfyUI功能区域
    ['click', 'mousedown'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            if (!licenseKey && !e.target.closest('#licenseDialog')) {
                // 检查是否点击了ComfyUI的主要功能区域
                const comfyUISelectors = [
                    '.comfy-menu',
                    '.graph-canvas',
                    '.comfy-ui-button',
                    '[data-comfy-nodedef]',
                    '.comfy-widget',
                    '.comfy-input',
                    '.litegraph',
                    '#queue-button',
                    '#extra-options',
                    '.comfyui-button'
                ];
                
                const isComfyUIElement = comfyUISelectors.some(selector => 
                    e.target.closest(selector)
                );
                
                if (isComfyUIElement) {
                    console.log('[License] 拦截ComfyUI功能:', eventType);
                    e.preventDefault();
                    e.stopPropagation();
                    showLicenseDialog();
                    return false;
                }
            }
        }, true);
    });

    // 定期检查保护状态
    setInterval(function() {
        if (!licenseKey) {
            hidePageContent();
            if (!dialogShown) {
                showLicenseDialog();
                dialogShown = true;
            }
        }
    }, 2000);

    // 显示卡密输入对话框
    function showLicenseDialog() {
        const existingDialog = document.getElementById('licenseDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        dialogShown = true;

        const dialog = document.createElement('div');
        dialog.id = 'licenseDialog';
        dialog.innerHTML = createDialogHTML();
        document.body.appendChild(dialog);

        setupDialogEvents(dialog);
    }

    function createDialogHTML() {
        return '<div style="position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 2147483647 !important; pointer-events: auto !important;">' +
            '<div style="background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; padding: 40px; max-width: 550px; width: 90%; box-shadow: 0 25px 60px rgba(0,0,0,0.3);">' +
                '<div style="text-align: center; margin-bottom: 30px;">' +
                    '<div style="font-size: 64px; margin-bottom: 20px;">🔐</div>' +
                    '<h2 style="margin: 0; color: #2c3e50; font-size: 28px; font-weight: 700;">ComfyUI 授权验证</h2>' +
                    '<p style="color: #7f8c8d; margin: 10px 0; font-size: 16px;">请输入您的授权卡密以继续使用<br><span style="color: #e74c3c; font-weight: 600;">每次使用都需要重新验证</span></p>' +
                '</div>' +
                '<div style="margin-bottom: 25px;">' +
                    '<label style="display: block; margin-bottom: 12px; color: #2c3e50; font-weight: 700; font-size: 14px;">🔑 授权卡密</label>' +
                    '<input type="text" id="licenseInput" placeholder="请输入您的授权卡密..." style="width: 100%; padding: 18px 20px; border: 3px solid #e9ecef; border-radius: 12px; font-size: 16px; font-family: monospace; box-sizing: border-box;">' +
                '</div>' +
                '<div style="display: flex; gap: 15px; margin-bottom: 20px;">' +
                    '<button id="validateBtn" style="flex: 2; padding: 18px 30px; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">🚀 验证卡密</button>' +
                    '<button id="licensePageBtn" style="flex: 1; padding: 18px 25px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; background: #f8f9fa; color: #6c757d;">📋 管理</button>' +
                '</div>' +
                '<div id="dialogStatus" style="margin-top: 20px; padding: 15px 20px; border-radius: 10px; text-align: center; display: none; font-weight: 600; font-size: 14px;"></div>' +
                '<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">' +
                    '<p style="color: #95a5a6; font-size: 12px; margin: 0;">🛡️ 安全提示：每次使用都需要重新验证<br>💡 如需帮助，请联系管理员<br>⌨️ 快捷键：按 Enter 键快速验证</p>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    function setupDialogEvents(dialog) {
        const input = document.getElementById('licenseInput');
        const validateBtn = document.getElementById('validateBtn');
        const licensePageBtn = document.getElementById('licensePageBtn');
        const status = document.getElementById('dialogStatus');

        input.focus();

        validateBtn.onclick = async function() {
            const key = input.value.trim();
            if (!key) {
                showDialogStatus('请输入卡密', 'error');
                return;
            }

            showDialogStatus('正在验证...', 'loading');
            validateBtn.disabled = true;
            validateBtn.innerHTML = '⏳ 验证中...';

            try {
                const response = await originalFetch('/license/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ license_key: key })
                });

                const result = await response.json();

                if (result.valid) {
                    licenseKey = key;
                    showDialogStatus('✅ 验证成功！', 'success');
                    validateBtn.innerHTML = '🎉 验证成功';

                    setTimeout(() => {
                        showPageContent();
                        dialog.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(dialog);
                            dialogShown = false;
                        }, 500);
                    }, 2000);
                } else {
                    showDialogStatus('❌ ' + (result.message || '验证失败'), 'error');
                    validateBtn.disabled = false;
                    validateBtn.innerHTML = '🚀 验证卡密';
                }
            } catch (error) {
                showDialogStatus('❌ 验证请求失败', 'error');
                validateBtn.disabled = false;
                validateBtn.innerHTML = '🚀 验证卡密';
            }
        };

        licensePageBtn.onclick = function() {
            window.open('/license_dialog.html', '_blank');
        };

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validateBtn.click();
            }
        });

        function showDialogStatus(message, type) {
            status.textContent = message;
            status.style.display = 'block';

            if (type === 'success') {
                status.style.background = 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)';
                status.style.color = '#155724';
                status.style.border = '2px solid #27ae60';
            } else if (type === 'error') {
                status.style.background = 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)';
                status.style.color = '#721c24';
                status.style.border = '2px solid #e74c3c';
            } else {
                status.style.background = 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)';
                status.style.color = '#0c5460';
                status.style.border = '2px solid #3498db';
            }
        }
    }

    // 页面内容控制函数
    function hidePageContent() {
        if (!licenseKey) {
            const body = document.body;
            if (body && !body.classList.contains('license-hidden')) {
                // 不再应用模糊效果，只是标记状态
                body.classList.add('license-hidden');
            }
        }
    }

    function showPageContent() {
        const body = document.body;
        if (body && body.classList.contains('license-hidden')) {
            // 只是移除标记状态，不需要清除模糊效果
            body.classList.remove('license-hidden');
        }
    }

    // 页面加载时立即显示卡密对话框
    document.addEventListener('DOMContentLoaded', function() {
        if (!dialogShown) {
            showLicenseDialog();
            dialogShown = true;
        }
        hidePageContent();
    });

    // 页面可见性变化时重新验证
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            licenseKey = '';
            hidePageContent();
            if (!dialogShown) {
                setTimeout(() => {
                    showLicenseDialog();
                    dialogShown = true;
                }, 500);
            }
        }
    });

    // 窗口焦点变化时重新验证
    window.addEventListener('focus', function() {
        licenseKey = '';
        hidePageContent();
        if (!dialogShown) {
            setTimeout(() => {
                showLicenseDialog();
                dialogShown = true;
            }, 500);
        }
    });

})();