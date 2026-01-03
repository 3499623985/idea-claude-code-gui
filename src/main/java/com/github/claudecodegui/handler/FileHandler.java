package com.github.claudecodegui.handler;

import com.github.claudecodegui.util.EditorFileUtils;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.intellij.ide.BrowserUtil;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.fileEditor.FileEditorManager;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

/**
 * 文件和命令相关消息处理器
 */
public class FileHandler extends BaseMessageHandler {

    private static final Logger LOG = Logger.getInstance(FileHandler.class);

    private static final String[] SUPPORTED_TYPES = {
        "list_files",
        "get_commands",
        "open_file",
        "open_browser"
    };

    public FileHandler(HandlerContext context) {
        super(context);
    }

    @Override
    public String[] getSupportedTypes() {
        return SUPPORTED_TYPES;
    }

    @Override
    public boolean handle(String type, String content) {
        switch (type) {
            case "list_files":
                handleListFiles(content);
                return true;
            case "get_commands":
                handleGetCommands(content);
                return true;
            case "open_file":
                handleOpenFile(content);
                return true;
            case "open_browser":
                handleOpenBrowser(content);
                return true;
            default:
                return false;
        }
    }

    /**
     * 处理文件列表请求
     */
    private void handleListFiles(String content) {
        CompletableFuture.runAsync(() -> {
            try {
                String query = "";
                String currentPath = "";

                if (content != null && !content.isEmpty()) {
                    try {
                        Gson gson = new Gson();
                        JsonObject json = gson.fromJson(content, JsonObject.class);
                        if (json.has("query")) {
                            query = json.get("query").getAsString();
                        }
                        if (json.has("currentPath")) {
                            currentPath = json.get("currentPath").getAsString();
                        }
                    } catch (Exception e) {
                        query = content;
                    }
                }

                // 始终使用项目根目录，确保搜索范围限制在项目内
                String basePath = context.getProject().getBasePath();
                if (basePath == null || basePath.isEmpty()) {
                    LOG.warn("[FileHandler] Project base path is null, skipping file search");
                    return;
                }

                List<JsonObject> files = new ArrayList<>();

                if (query != null && !query.isEmpty()) {
                    File baseDir = new File(basePath);
                    collectFiles(baseDir, basePath, files, query.toLowerCase(), 0, 15, 200);
                } else {
                    File targetDir = new File(basePath, currentPath);
                    if (targetDir.exists() && targetDir.isDirectory()) {
                        listDirectChildren(targetDir, basePath, files, 100);
                    }
                }

                // 排序
                sortFiles(files);

                Gson gson = new Gson();
                JsonObject result = new JsonObject();
                result.add("files", gson.toJsonTree(files));
                String resultJson = gson.toJson(result);

                ApplicationManager.getApplication().invokeLater(() -> {
                    callJavaScript("window.onFileListResult", escapeJs(resultJson));
                });
            } catch (Exception e) {
                LOG.error("[FileHandler] Failed to list files: " + e.getMessage(), e);
            }
        });
    }

    /**
     * 处理获取命令列表请求
     * 调用 ClaudeSDKBridge 获取真实的 SDK 斜杠命令列表
     */
    private void handleGetCommands(String content) {
        CompletableFuture.runAsync(() -> {
            try {
                String query = "";
                if (content != null && !content.isEmpty()) {
                    try {
                        Gson gson = new Gson();
                        JsonObject json = gson.fromJson(content, JsonObject.class);
                        if (json.has("query")) {
                            query = json.get("query").getAsString();
                        }
                    } catch (Exception e) {
                        query = content;
                    }
                }

                // 获取工作目录
                String cwd = context.getSession() != null &&
                             context.getSession().getCwd() != null &&
                             !context.getSession().getCwd().isEmpty()
                    ? context.getSession().getCwd()
                    : (context.getProject().getBasePath() != null ?
                       context.getProject().getBasePath() : System.getProperty("user.home"));

                LOG.info("[FileHandler] Getting slash commands from SDK, cwd=" + cwd);

                // 调用 ClaudeSDKBridge 获取真实的斜杠命令
                final String finalQuery = query;
                context.getClaudeSDKBridge().getSlashCommands(cwd)
                    .thenAccept(sdkCommands -> {
                        try {
                            Gson gson = new Gson();
                            List<JsonObject> commands = new ArrayList<>();

                            // 转换 SDK 返回的命令格式
                            for (JsonObject cmd : sdkCommands) {
                                String name = cmd.has("name") ? cmd.get("name").getAsString() : "";
                                String description = cmd.has("description") ? cmd.get("description").getAsString() : "";

                                // 确保命令以 / 开头
                                String label = name.startsWith("/") ? name : "/" + name;

                                // 应用过滤
                                if (finalQuery.isEmpty() ||
                                    label.toLowerCase().contains(finalQuery.toLowerCase()) ||
                                    description.toLowerCase().contains(finalQuery.toLowerCase())) {
                                    JsonObject cmdObj = new JsonObject();
                                    cmdObj.addProperty("label", label);
                                    cmdObj.addProperty("description", description);
                                    commands.add(cmdObj);
                                }
                            }

                            LOG.info("[FileHandler] Got " + commands.size() + " commands from SDK (filtered from " + sdkCommands.size() + ")");

                            // 如果 SDK 没有返回命令，使用本地默认命令作为回退
                            if (commands.isEmpty() && sdkCommands.isEmpty()) {
                                LOG.info("[FileHandler] SDK returned no commands, using local fallback");
                                addCommand(commands, "/help", "显示帮助信息", finalQuery);
                                addCommand(commands, "/clear", "清空对话历史", finalQuery);
                                addCommand(commands, "/new", "创建新会话", finalQuery);
                                addCommand(commands, "/history", "查看历史记录", finalQuery);
                                addCommand(commands, "/model", "切换模型", finalQuery);
                                addCommand(commands, "/settings", "打开设置", finalQuery);
                                addCommand(commands, "/compact", "压缩对话上下文", finalQuery);
                            }

                            JsonObject result = new JsonObject();
                            result.add("commands", gson.toJsonTree(commands));
                            String resultJson = gson.toJson(result);

                            ApplicationManager.getApplication().invokeLater(() -> {
                                String js = "if (window.onCommandListResult) { window.onCommandListResult('" + escapeJs(resultJson) + "'); }";
                                context.executeJavaScriptOnEDT(js);
                            });
                        } catch (Exception e) {
                            LOG.error("[FileHandler] Failed to process SDK commands: " + e.getMessage(), e);
                        }
                    })
                    .exceptionally(ex -> {
                        LOG.error("[FileHandler] Failed to get commands from SDK: " + ex.getMessage());
                        // 出错时使用本地默认命令
                        try {
                            Gson gson = new Gson();
                            List<JsonObject> commands = new ArrayList<>();
                            addCommand(commands, "/help", "显示帮助信息", finalQuery);
                            addCommand(commands, "/clear", "清空对话历史", finalQuery);
                            addCommand(commands, "/new", "创建新会话", finalQuery);
                            addCommand(commands, "/history", "查看历史记录", finalQuery);
                            addCommand(commands, "/model", "切换模型", finalQuery);
                            addCommand(commands, "/settings", "打开设置", finalQuery);
                            addCommand(commands, "/compact", "压缩对话上下文", finalQuery);

                            JsonObject result = new JsonObject();
                            result.add("commands", gson.toJsonTree(commands));
                            String resultJson = gson.toJson(result);

                            ApplicationManager.getApplication().invokeLater(() -> {
                                String js = "if (window.onCommandListResult) { window.onCommandListResult('" + escapeJs(resultJson) + "'); }";
                                context.executeJavaScriptOnEDT(js);
                            });
                        } catch (Exception e) {
                            LOG.error("[FileHandler] Failed to send fallback commands: " + e.getMessage(), e);
                        }
                        return null;
                    });

            } catch (Exception e) {
                LOG.error("[FileHandler] Failed to get commands: " + e.getMessage(), e);
            }
        });
    }

    /**
     * 在编辑器中打开文件
     */
    private void handleOpenFile(String filePath) {
        LOG.info("请求打开文件: " + filePath);

        // 先在普通线程中处理文件路径解析（不涉及 VFS 操作）
        CompletableFuture.runAsync(() -> {
            try {
                File file = new File(filePath);

                // 如果文件不存在且是相对路径，尝试相对于项目根目录解析
                if (!file.exists() && !file.isAbsolute() && context.getProject().getBasePath() != null) {
                    File projectFile = new File(context.getProject().getBasePath(), filePath);
                    LOG.info("尝试相对于项目根目录解析: " + projectFile.getAbsolutePath());
                    if (projectFile.exists()) {
                        file = projectFile;
                    }
                }

                if (!file.exists()) {
                    LOG.error("文件不存在: " + filePath);
                    ApplicationManager.getApplication().invokeLater(() -> {
                        callJavaScript("addErrorMessage", escapeJs("无法打开文件: 文件不存在 (" + filePath + ")"));
                    }, ModalityState.nonModal());
                    return;
                }

                final File finalFile = file;

                // 使用工具类方法异步刷新并查找文件
                EditorFileUtils.refreshAndFindFileAsync(
                        finalFile,
                        virtualFile -> {
                            // 成功找到文件，在编辑器中打开
                            FileEditorManager.getInstance(context.getProject()).openFile(virtualFile, true);
                            LOG.info("成功打开文件: " + filePath);
                        },
                        () -> {
                            // 失败回调
                            LOG.error("最终无法获取 VirtualFile: " + filePath);
                        callJavaScript("addErrorMessage", escapeJs("无法打开文件: " + filePath));
                    }
                );

            } catch (Exception e) {
                LOG.error("打开文件失败: " + e.getMessage(), e);
            }
        });
    }

    /**
     * 打开浏览器
     */
    private void handleOpenBrowser(String url) {
        ApplicationManager.getApplication().invokeLater(() -> {
            try {
                BrowserUtil.browse(url);
            } catch (Exception e) {
                LOG.error("无法打开浏览器: " + e.getMessage(), e);
            }
        });
    }

    /**
     * 列出目录的直接子文件/文件夹（不递归）
     */
    private void listDirectChildren(File dir, String basePath, List<JsonObject> files, int maxFiles) {
        if (!dir.isDirectory()) return;

        File[] children = dir.listFiles();
        if (children == null) return;

        int added = 0;
        for (File child : children) {
            if (added >= maxFiles) break;

            String name = child.getName();

            // 跳过常见的忽略目录和系统文件
            if (shouldSkipFile(name)) {
                continue;
            }

            String relativePath = getRelativePath(child, basePath);
            JsonObject fileObj = createFileObject(child, name, relativePath);
            files.add(fileObj);
            added++;
        }
    }

    /**
     * 递归收集文件
     */
    private void collectFiles(File dir, String basePath, List<JsonObject> files,
                              String query, int depth, int maxDepth, int maxFiles) {
        if (depth > maxDepth || files.size() >= maxFiles) return;
        if (!dir.isDirectory()) return;

        File[] children = dir.listFiles();
        if (children == null) return;

        for (File child : children) {
            if (files.size() >= maxFiles) break;

            String name = child.getName();
            if (shouldSkipDirectory(name)) {
                continue;
            }

            String relativePath = getRelativePath(child, basePath);

            // 检查是否匹配查询
            if (!query.isEmpty()) {
                boolean matchesName = name.toLowerCase().contains(query);
                boolean matchesPath = relativePath.toLowerCase().contains(query);
                boolean matchesExtension = query.startsWith(".") && name.toLowerCase().endsWith(query);

                if (!matchesName && !matchesPath && !matchesExtension) {
                    if (child.isDirectory()) {
                        collectFiles(child, basePath, files, query, depth + 1, maxDepth, maxFiles);
                    }
                    continue;
                }
            }

            JsonObject fileObj = createFileObject(child, name, relativePath);
            files.add(fileObj);

            if (child.isDirectory()) {
                collectFiles(child, basePath, files, query, depth + 1, maxDepth, maxFiles);
            }
        }
    }

    /**
     * 应该忽略的目录/文件列表
     */
    private static final Set<String> IGNORED_NAMES = Set.of(
        // 版本控制
        ".git",
        ".svn",
        ".hg",
        ".bzr",
        // IDE 配置
        ".idea",
        ".vscode",
        ".eclipse",
        ".settings",
        ".intellijPlatform",
        ".project",
        ".classpath",
        ".factorypath",
        ".apt_generated",
        ".sts4-cache",
        ".springBeans",
        "nbproject",
        ".nb-gradle",
        // 构建产物/依赖
        "node_modules",
        "target",
        "build",
        "dist",
        "out",
        "bin",
        ".gradle",
        "vendor",
        "bower_components",
        "jspm_packages",
        ".pnp",
        ".pnp.js",
        // 缓存/临时文件
        "__pycache__",
        ".cache",
        ".npm",
        ".yarn",
        ".parcel-cache",
        ".turbo",
        ".sass-cache",
        ".eslintcache",
        ".stylelintcache",
        ".tsbuildinfo",
        ".temp",
        ".tmp",
        "tmp",
        "temp",
        // 系统文件
        ".DS_Store",
        "Thumbs.db",
        "desktop.ini",
        ".Spotlight-V100",
        ".Trashes",
        "ehthumbs.db",
        // 框架特定
        ".next",
        ".nuxt",
        ".output",
        ".docusaurus",
        ".serverless",
        ".vercel",
        ".netlify",
        // 测试覆盖率
        "coverage",
        ".nyc_output",
        "htmlcov",
        ".pytest_cache",
        ".tox",
        ".nox",
        ".hypothesis",
        // 日志
        "logs",
        // 环境配置
        ".env.local",
        ".env.development.local",
        ".env.test.local",
        ".env.production.local",
        // 其他
        ".sandbox",
        ".claude",
        ".kotlin",
        ".metals",
        ".bloop"
    );

    /**
     * 判断是否应该跳过文件/目录
     */
    private boolean shouldSkipFile(String name) {
        return IGNORED_NAMES.contains(name);
    }

    /**
     * 判断是否应该跳过目录（递归搜索时使用）
     */
    private boolean shouldSkipDirectory(String name) {
        return IGNORED_NAMES.contains(name);
    }

    /**
     * 获取相对路径
     */
    private String getRelativePath(File file, String basePath) {
        String relativePath = file.getAbsolutePath().substring(basePath.length());
        if (relativePath.startsWith(File.separator)) {
            relativePath = relativePath.substring(1);
        }
        return relativePath.replace("\\", "/");
    }

    /**
     * 创建文件对象
     */
    private JsonObject createFileObject(File file, String name, String relativePath) {
        JsonObject fileObj = new JsonObject();
        fileObj.addProperty("name", name);
        fileObj.addProperty("path", relativePath);
        fileObj.addProperty("absolutePath", file.getAbsolutePath().replace("\\", "/"));
        fileObj.addProperty("type", file.isDirectory() ? "directory" : "file");

        if (file.isFile()) {
            int dotIndex = name.lastIndexOf('.');
            if (dotIndex > 0) {
                fileObj.addProperty("extension", name.substring(dotIndex + 1));
            }
        }
        return fileObj;
    }

    /**
     * 添加命令到列表
     */
    private void addCommand(List<JsonObject> commands, String label, String description, String query) {
        if (query.isEmpty() ||
            label.toLowerCase().contains(query.toLowerCase()) ||
            description.toLowerCase().contains(query.toLowerCase())) {
            JsonObject cmd = new JsonObject();
            cmd.addProperty("label", label);
            cmd.addProperty("description", description);
            commands.add(cmd);
        }
    }

    /**
     * 文件排序
     */
    private void sortFiles(List<JsonObject> files) {
        files.sort((a, b) -> {
            String aPath = a.get("path").getAsString();
            String bPath = b.get("path").getAsString();
            boolean aDir = "directory".equals(a.get("type").getAsString());
            boolean bDir = "directory".equals(b.get("type").getAsString());
            String aName = a.get("name").getAsString();
            String bName = b.get("name").getAsString();

            int aDepth = aPath.split("/").length;
            int bDepth = bPath.split("/").length;

            if (aDepth != bDepth) return aDepth - bDepth;

            String aParent = aPath.contains("/") ? aPath.substring(0, aPath.lastIndexOf('/')) : "";
            String bParent = bPath.contains("/") ? bPath.substring(0, bPath.lastIndexOf('/')) : "";
            int parentCompare = aParent.compareToIgnoreCase(bParent);
            if (parentCompare != 0) return parentCompare;

            if (aDir != bDir) return aDir ? -1 : 1;

            return aName.compareToIgnoreCase(bName);
        });
    }
}
