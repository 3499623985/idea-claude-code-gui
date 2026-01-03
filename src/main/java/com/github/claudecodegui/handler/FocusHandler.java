/********************************
 * @title FocusHandler
 * @package com.github.claudecodegui.handler
 * @description 处理 JCEF 浏览器焦点请求
 *
 * @author Mr.ｓｕ＇ｑｉａｎｇ
 * @date 2026/01/03 17:28
 * @version 0.0.1
 *********************************/
package com.github.claudecodegui.handler;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.ui.jcef.JBCefBrowser;

import javax.swing.*;

/**
 * 焦点处理器
 * 处理前端请求 JCEF 浏览器获取焦点的消息
 */
public class FocusHandler extends BaseMessageHandler {

    private static final Logger LOG = Logger.getInstance(FocusHandler.class);

    private static final String[] SUPPORTED_TYPES = {
        "request_focus"
    };

    public FocusHandler(HandlerContext context) {
        super(context);
    }

    @Override
    public String[] getSupportedTypes() {
        return SUPPORTED_TYPES;
    }

    @Override
    public boolean handle(String type, String content) {
        if ("request_focus".equals(type)) {
            handleRequestFocus();
            return true;
        }
        return false;
    }

    /**
     * 处理焦点请求
     * 让 JCEF 浏览器组件获取焦点
     */
    private void handleRequestFocus() {
        LOG.info("[FocusHandler] Received focus request");
        ApplicationManager.getApplication().invokeLater(() -> {
            JBCefBrowser browser = context.getBrowser();
            if (browser != null && !context.isDisposed()) {
                JComponent component = browser.getComponent();
                if (component != null) {
                    LOG.info("[FocusHandler] Requesting focus for browser component");
                    component.requestFocusInWindow();
                    executeJavaScript("if (window.__onFocusRestored) { window.__onFocusRestored(); }");
                }
            }
        });
    }
}

