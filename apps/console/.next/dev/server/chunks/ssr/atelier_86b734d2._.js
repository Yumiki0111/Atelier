module.exports = [
"[project]/atelier/apps/console/src/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-ssr] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-ssr] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
const navigationItems = [
    {
        href: "/",
        label: "ダッシュボード",
        icon: "/icon/home.png"
    },
    {
        href: "/database/products",
        label: "商品データベース",
        icon: "/icon/jaclet.png"
    },
    {
        href: "/analytics",
        label: "アナリティクス",
        icon: "/icon/analysis.png"
    },
    {
        href: "/install",
        label: "埋め込みスニペット",
        icon: "/icon/book.png"
    }
];
const bottomItems = [
    {
        href: "/settings",
        label: "アカウント設定",
        icon: "/icon/setting.png"
    },
    {
        href: "/logout",
        label: "ログアウト",
        icon: "/icon/log_out.png"
    }
];
function Sidebar() {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const [isCollapsed, setIsCollapsed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex h-screen flex-col border-r bg-white transition-all duration-300", isCollapsed ? "w-16" : "w-64"),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex h-16 items-center border-b transition-all", isCollapsed ? "justify-center px-2" : "justify-between px-6"),
                children: [
                    !isCollapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                src: "/logo.png",
                                alt: "Atelier",
                                width: 80,
                                height: 0,
                                className: "h-6 w-auto object-contain"
                            }, void 0, false, {
                                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                                lineNumber: 42,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xl font-semibold",
                                children: "Atelier"
                            }, void 0, false, {
                                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                                lineNumber: 49,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                        lineNumber: 41,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setIsCollapsed(!isCollapsed),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-lg p-1.5 hover:bg-gray-100 transition-colors", !isCollapsed && "ml-auto"),
                        "aria-label": isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたみ",
                        children: isCollapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                            className: "h-4 w-4"
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                            lineNumber: 61,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
                            className: "h-4 w-4"
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                            lineNumber: 63,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex-1 space-y-2 py-4", isCollapsed ? "px-2" : "px-4"),
                children: navigationItems.map((item)=>{
                    const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: item.href,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex items-center rounded-lg py-3 text-sm font-medium transition-colors overflow-hidden", isCollapsed ? "justify-center px-2" : "gap-3 px-3", isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
                        title: isCollapsed ? item.label : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                src: item.icon,
                                alt: item.label,
                                width: 20,
                                height: 20,
                                className: "h-5 w-5 object-contain flex-shrink-0"
                            }, void 0, false, {
                                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                                lineNumber: 93,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("whitespace-nowrap overflow-hidden transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100"),
                                children: item.label
                            }, void 0, false, {
                                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                                lineNumber: 100,
                                columnNumber: 15
                            }, this)
                        ]
                    }, item.href, true, {
                        fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                        lineNumber: 81,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("border-t py-4 space-y-2", isCollapsed ? "px-2" : "px-4"),
                children: bottomItems.map((item)=>{
                    const isLogout = item.href === "/logout";
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: item.href,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex items-center rounded-lg py-3 text-sm font-medium transition-colors overflow-hidden", isCollapsed ? "justify-center px-2" : "gap-3 px-3", isLogout ? "text-red-600 hover:bg-red-50 hover:text-red-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
                        title: isCollapsed ? item.label : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                src: item.icon,
                                alt: item.label,
                                width: 20,
                                height: 20,
                                className: "h-5 w-5 object-contain flex-shrink-0"
                            }, void 0, false, {
                                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                                lineNumber: 135,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("whitespace-nowrap overflow-hidden transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100"),
                                children: item.label
                            }, void 0, false, {
                                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                                lineNumber: 142,
                                columnNumber: 15
                            }, this)
                        ]
                    }, item.href, true, {
                        fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                        lineNumber: 123,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                lineNumber: 114,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
}),
"[project]/atelier/apps/console/src/contexts/ProductSelectionContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProductSelectionProvider",
    ()=>ProductSelectionProvider,
    "useProductSelection",
    ()=>useProductSelection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const ProductSelectionContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function ProductSelectionProvider({ children }) {
    const [selectedProduct, setSelectedProduct] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const [selectedSize, setSelectedSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const [isPreviewOpen, setIsPreviewOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [viewStats, setViewStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        // ローカルストレージから読み込み
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        return {
            totalViews: 0,
            productViews: {}
        };
    });
    const selectProduct = (product, size)=>{
        // 既に同じ商品とサイズが選択されている場合は何もしない
        if (selectedProduct?.id === product.id && selectedSize === size) {
            return;
        }
        setSelectedProduct(product);
        setSelectedSize(size);
    };
    const togglePreview = ()=>{
        setIsPreviewOpen((prev)=>{
            const newState = !prev;
            // プレビューが開かれたときにカウントを増やす
            if (newState && selectedProduct) {
                setViewStats((stats)=>{
                    const newStats = {
                        totalViews: stats.totalViews + 1,
                        productViews: {
                            ...stats.productViews,
                            [selectedProduct.id]: (stats.productViews[selectedProduct.id] || 0) + 1
                        },
                        lastViewedAt: new Date()
                    };
                    // ローカルストレージに保存
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                    return newStats;
                });
            }
            return newState;
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ProductSelectionContext.Provider, {
        value: {
            selectedProduct,
            selectedSize,
            selectProduct,
            isPreviewOpen,
            togglePreview,
            viewStats
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/atelier/apps/console/src/contexts/ProductSelectionContext.tsx",
        lineNumber: 91,
        columnNumber: 5
    }, this);
}
function useProductSelection() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ProductSelectionContext);
    if (context === undefined) {
        throw new Error("useProductSelection must be used within a ProductSelectionProvider");
    }
    return context;
}
}),
"[project]/atelier/apps/console/src/features/products/useAssets.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAssets",
    ()=>useAssets
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-ssr] (ecmascript)");
"use client";
;
async function fetchAssets(productId) {
    const response = await fetch(`/api/assets?productId=${productId}`);
    if (!response.ok) {
        // データベースが設定されていない場合は空配列を返す
        if (response.status === 500) {
            const error = await response.json();
            if (error.error === "Database not configured") {
                return [];
            }
        }
        throw new Error("Failed to fetch assets");
    }
    return response.json();
}
function useAssets(productId) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "assets",
            productId
        ],
        queryFn: ()=>fetchAssets(productId),
        enabled: !!productId,
        staleTime: 1000 * 60 * 5
    });
}
}),
"[project]/atelier/packages/preview/src/ui-elements.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createMessageArea",
    ()=>createMessageArea,
    "createSizeArea",
    ()=>createSizeArea,
    "createViewerContainer",
    ()=>createViewerContainer
]);
function createSizeArea(availableSizes, initialSize, productName) {
    // サイズ選択エリア
    const sizeArea = document.createElement("div");
    sizeArea.style.cssText = `
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    gap: 8px;
  `;
    // サイズ選択ボタンコンテナ
    const sizeButtonsContainer = document.createElement("div");
    sizeButtonsContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;
    // サイズボタン配列
    const sizeButtons = [];
    // 左矢印ボタン
    const prevButton = document.createElement("button");
    prevButton.innerHTML = "&lt;";
    prevButton.style.cssText = `
    background: white;
    border: 1px solid black;
    font-size: 14px;
    color: black;
    cursor: pointer;
    padding: 6px 10px;
    outline: none;
    transition: all 0.15s ease;
    border-radius: 4px;
    font-weight: 500;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;
    // 右矢印ボタン
    const nextButton = document.createElement("button");
    nextButton.innerHTML = "&gt;";
    nextButton.style.cssText = `
    background: white;
    border: 1px solid black;
    font-size: 14px;
    color: black;
    cursor: pointer;
    padding: 6px 10px;
    outline: none;
    transition: all 0.15s ease;
    border-radius: 4px;
    font-weight: 500;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;
    // サイズボタンを横並びで表示（S, M, L, XLなど）
    availableSizes.forEach((size)=>{
        const sizeBtn = document.createElement("button");
        sizeBtn.textContent = size;
        const isSelected = size === initialSize;
        sizeBtn.style.cssText = `
      background: ${isSelected ? "black" : "white"};
      color: ${isSelected ? "white" : "black"};
      border: 1px solid black;
      font-size: 14px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 40px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    `;
        sizeButtons.push(sizeBtn);
        sizeButtonsContainer.appendChild(sizeBtn);
    });
    sizeButtonsContainer.appendChild(prevButton);
    sizeButtonsContainer.appendChild(nextButton);
    sizeArea.appendChild(sizeButtonsContainer);
    // 商品名表示
    if (productName) {
        const productNameDiv = document.createElement("div");
        productNameDiv.textContent = productName;
        productNameDiv.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: black;
      text-align: center;
      margin-top: 4px;
    `;
        sizeArea.appendChild(productNameDiv);
    }
    return {
        sizeArea,
        sizeButtons,
        prevButton,
        nextButton
    };
}
function createViewerContainer() {
    // 3Dモデルエリア（中央、広く取る）
    const viewerContainer = document.createElement("div");
    viewerContainer.style.cssText = `
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    transform-origin: center top;
    pointer-events: auto;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  `;
    // 3Dモデルを表示するためのラッパー
    const modelWrapper = document.createElement("div");
    modelWrapper.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  `;
    viewerContainer.appendChild(modelWrapper);
    // 右側フローティングアクションボタン
    const floatingButtons = document.createElement("div");
    floatingButtons.style.cssText = `
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 25;
    pointer-events: none;
  `;
    // ジャケットアイコンボタン
    const jacketButton = document.createElement("button");
    jacketButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 7h-3M4 7h3m13 0v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7m13 0V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/>
    </svg>
  `;
    jacketButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    color: black;
  `;
    // ユーザーアイコンボタン
    const userButton = document.createElement("button");
    userButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  `;
    userButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    color: black;
  `;
    floatingButtons.appendChild(jacketButton);
    floatingButtons.appendChild(userButton);
    viewerContainer.appendChild(floatingButtons);
    return {
        viewerContainer,
        modelWrapper,
        floatingButtons,
        jacketButton,
        userButton
    };
}
function createMessageArea() {
    // 下部コントロールエリア
    const bottomControls = document.createElement("div");
    bottomControls.style.cssText = `
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  `;
    // 質問入力エリア（通常時は非表示）
    const messageArea = document.createElement("div");
    messageArea.style.cssText = `
    flex-shrink: 0;
    padding: 0 12px;
    display: none;
  `;
    const messageForm = document.createElement("form");
    messageForm.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 2px solid #e5e7eb;
    border-radius: 20px;
    background: white;
  `;
    const messageInput = document.createElement("input");
    messageInput.type = "text";
    messageInput.placeholder = "質問はありますか？";
    messageInput.style.cssText = `
    flex: 1;
    border: none;
    outline: none;
    font-size: 11px;
    background: transparent;
    color: #6b7280;
  `;
    const sendButton = document.createElement("button");
    sendButton.innerHTML = "▶";
    sendButton.style.cssText = `
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    outline: none;
    transform: rotate(0deg);
    display: flex;
    align-items: center;
    justify-content: center;
  `;
    messageForm.appendChild(messageInput);
    messageForm.appendChild(sendButton);
    messageArea.appendChild(messageForm.cloneNode(true));
    bottomControls.appendChild(messageArea);
    return {
        messageArea,
        messageForm,
        messageInput,
        sendButton
    };
}
}),
"[project]/atelier/packages/preview/src/preview.ts [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

const e = new Error("Could not parse module '[project]/atelier/packages/preview/src/preview.ts'\n\nReturn statement is not allowed here");
e.code = 'MODULE_UNPARSABLE';
throw e;
}),
"[project]/atelier/packages/preview/src/index.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Preview panel exports
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$preview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/preview.ts [app-ssr] (ecmascript)");
;
}),
"[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authenticatedFetch",
    ()=>authenticatedFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/client.ts [app-ssr] (ecmascript)");
"use client";
;
async function authenticatedFetch(url, options = {}) {
    try {
        console.log("[authenticatedFetch] Starting, url:", url);
        console.log("[authenticatedFetch] Getting session...");
        const { data: { session }, error: sessionError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        console.log("[authenticatedFetch] Session retrieved:", {
            hasSession: !!session,
            hasError: !!sessionError
        });
        if (sessionError) {
            console.error("[authenticatedFetch] Error getting session:", sessionError);
            throw new Error("セッションの取得に失敗しました");
        }
        const headers = new Headers(options.headers);
        if (session?.access_token) {
            headers.set("Authorization", `Bearer ${session.access_token}`);
            console.log("[authenticatedFetch] Authorization header set");
        } else {
            console.warn("[authenticatedFetch] No session found, making request without auth token");
        }
        console.log("[authenticatedFetch] Making fetch request to:", url);
        const response = await fetch(url, {
            ...options,
            headers
        });
        console.log("[authenticatedFetch] Fetch completed, status:", response.status);
        return response;
    } catch (error) {
        console.error("[authenticatedFetch] Error:", error);
        throw error;
    }
}
}),
"[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PreviewPanel",
    ()=>PreviewPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/ProductSelectionContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$products$2f$useAssets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/features/products/useAssets.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$preview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/preview.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
function PreviewPanel({ selectedProduct, selectedSize }) {
    const { togglePreview } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProductSelection"])();
    const { shopId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const [height, setHeight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(170);
    const [currentSize, setCurrentSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(selectedSize || "M");
    const { data: assets = [] } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$products$2f$useAssets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAssets"])(selectedProduct?.id);
    const previewContainerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const previewInstanceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [isSendingMessage, setIsSendingMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const conversationIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const sessionIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    // 選択されたサイズに応じたアセットの最新バージョンを取得
    const selectedAsset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (assets.length === 0) {
            // アセットがない場合はnullを返す（モックデータは使用しない）
            return null;
        }
        // 現在選択されているサイズのアセットをフィルタ
        const sizeAssets = assets.filter((asset)=>asset.size === currentSize && asset.isActive !== false).sort((a, b)=>b.version - a.version);
        // 該当サイズのアセットがない場合、他のサイズから最新のものを取得
        if (sizeAssets.length === 0) {
            const allAssets = assets.filter((asset)=>asset.isActive !== false).sort((a, b)=>b.version - a.version);
            return allAssets.length > 0 ? allAssets[0] : null;
        }
        return sizeAssets[0];
    }, [
        assets,
        currentSize
    ]);
    // 利用可能なサイズを取得（アセットから動的に取得）
    const availableSizes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const sizes = new Set();
        assets.forEach((asset)=>{
            if (asset.isActive !== false) {
                sizes.add(asset.size);
            }
        });
        // アセットがない場合はデフォルトサイズを返す
        return sizes.size > 0 ? Array.from(sizes).sort() : [
            "S",
            "M",
            "L"
        ];
    }, [
        assets
    ]);
    // Vanilla JSのプレビューパネルを初期化
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!previewContainerRef.current) return;
        // modelUrlを優先、なければglbUrlを使用（後方互換性）
        const modelUrl = selectedAsset?.modelUrl || selectedAsset?.glbUrl;
        console.log("[PreviewPanel] Initializing preview panel:", {
            modelUrl,
            glbUrl: selectedAsset?.glbUrl,
            hasAsset: !!selectedAsset,
            assetsCount: assets.length,
            availableSizes,
            currentSize
        });
        // 既存のインスタンスを破棄（新しいインスタンスを作成する前に）
        if (previewInstanceRef.current) {
            try {
                previewInstanceRef.current.destroy();
            } catch (error) {
                console.error("[PreviewPanel] Error destroying previous instance:", error);
            } finally{
                previewInstanceRef.current = null;
            }
        }
        // コンテナをクリア（destroy()の後、新しいインスタンスを作成する前）
        // innerHTMLは使わず、個別にremove()で削除（Reactとの競合を避けるため）
        if (previewContainerRef.current) {
            try {
                // 子要素を配列にコピーしてから削除（削除中にDOMが変更されるのを防ぐ）
                const children = Array.from(previewContainerRef.current.children);
                for (const child of children){
                    try {
                        child.remove();
                    } catch (error) {
                        // 個別の削除エラーは無視
                        console.warn("[PreviewPanel] Could not remove child element:", error);
                    }
                }
            } catch (error) {
                console.warn("[PreviewPanel] Could not clear container:", error);
            }
        }
        // アセットがない場合は初期化しない
        if (!modelUrl) {
            console.warn("[PreviewPanel] No asset available, skipping initialization");
            return;
        }
        // 新しいインスタンスを初期化
        const instance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$preview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initPreviewPanel"])({
            container: previewContainerRef.current,
            glbUrl: selectedAsset?.glbUrl,
            modelUrl: modelUrl,
            textureUrl: selectedProduct?.thumbnailUrl,
            initialHeight: height,
            minHeight: 150,
            maxHeight: 190,
            availableSizes: availableSizes,
            initialSize: currentSize,
            onBackClick: ()=>{
            // PreviewPanel.tsxでは、ナビゲーションバーの戻るボタンは不要
            // （既に独自のヘッダーがあるため）
            },
            onSizeChange: (newSize)=>{
                setCurrentSize(newSize);
            },
            onHeightChange: (newHeight)=>{
                setHeight(newHeight);
            },
            onMessageSend: async (message)=>{
                // isSendingMessageの状態を確認（refを使用して最新の値を取得）
                if (isSendingMessage) return null;
                setIsSendingMessage(true);
                try {
                    // 最新の値を取得するために、現在の値を直接使用
                    const currentProductId = selectedProduct?.id;
                    const currentShopId = shopId;
                    const currentProductName = selectedProduct?.name;
                    const currentSizeValue = currentSize;
                    const currentHeightValue = height;
                    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authenticatedFetch"])("/api/chat", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            message,
                            productId: currentProductId,
                            shopId: currentShopId,
                            conversationId: conversationIdRef.current,
                            sessionId: sessionIdRef.current,
                            context: {
                                productName: currentProductName,
                                size: currentSizeValue,
                                height: currentHeightValue
                            }
                        })
                    });
                    if (!response.ok) {
                        const error = await response.json();
                        console.error("[PreviewPanel] Chat API error:", error);
                        throw new Error(error.message || "メッセージの送信に失敗しました");
                    }
                    const data = await response.json();
                    // 会話IDとセッションIDを保存（次回のリクエストで使用）
                    if (data.conversationId) {
                        conversationIdRef.current = data.conversationId;
                    }
                    if (data.sessionId) {
                        sessionIdRef.current = data.sessionId;
                    }
                    return data.response;
                } catch (error) {
                    console.error("[PreviewPanel] Failed to send message:", error);
                    throw error;
                } finally{
                    setIsSendingMessage(false);
                }
            },
            onModelLoad: ()=>{
                console.log("[PreviewPanel] 3D model loaded:", modelUrl);
            },
            onModelError: (error)=>{
                console.error("[PreviewPanel] Failed to load 3D model:", error, modelUrl);
            }
        });
        previewInstanceRef.current = instance;
        // クリーンアップ
        return ()=>{
            if (previewInstanceRef.current) {
                try {
                    previewInstanceRef.current.destroy();
                } catch (error) {
                    console.error("[PreviewPanel] Error destroying preview instance:", error);
                } finally{
                    previewInstanceRef.current = null;
                }
            }
        };
    // 依存配列を最小限に（isSendingMessageは削除 - コールバック内で最新の値を取得）
    // availableSizesはuseMemoでメモ化されているので、参照が変わったときだけ再初期化される
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedAsset?.modelUrl,
        selectedAsset?.glbUrl,
        selectedProduct?.thumbnailUrl,
        availableSizes,
        currentSize,
        height
    ]);
    // サイズが変更されたときに、対応するアセットのGLB URLを更新
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // modelUrlを優先、なければglbUrlを使用（後方互換性）
        const modelUrl = selectedAsset?.modelUrl || selectedAsset?.glbUrl;
        if (previewInstanceRef.current && modelUrl) {
            previewInstanceRef.current.updateModelUrl(modelUrl);
        }
    }, [
        selectedAsset?.modelUrl,
        selectedAsset?.glbUrl,
        currentSize
    ]);
    // 身長が変更されたときに更新
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (previewInstanceRef.current) {
            previewInstanceRef.current.updateHeight(height);
        }
    }, [
        height
    ]);
    // Enterキーでモーダルが閉じるのを防ぐ（ネイティブイベントリスナー）
    const rootRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const handleKeyDown = (e)=>{
            if (!(e instanceof KeyboardEvent)) return;
            if (e.key === "Enter") {
                // アクティブな要素がinputまたはtextareaの場合、preview.tsで処理される
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
                    // 入力フィールド内でのEnterキーは、preview.tsで処理される
                    // ここでは何もしない（イベントの伝播を止めない）
                    return;
                }
                // 入力フィールド外でのEnterキーは無視（モーダルを閉じない）
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        };
        const rootElement = rootRef.current;
        if (rootElement) {
            // captureフェーズとbubbleフェーズの両方でイベントをキャッチ
            rootElement.addEventListener("keydown", handleKeyDown, true);
            rootElement.addEventListener("keydown", handleKeyDown, false);
        }
        return ()=>{
            if (rootElement) {
                rootElement.removeEventListener("keydown", handleKeyDown, true);
                rootElement.removeEventListener("keydown", handleKeyDown, false);
            }
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: rootRef,
        className: "flex h-screen flex-col shadow-lg overflow-hidden",
        style: {
            width: '390px'
        },
        onKeyDownCapture: (e)=>{
            // captureフェーズでイベントをキャッチ（他のイベントリスナーより先に処理）
            if (e.key === "Enter") {
                // アクティブな要素がinputまたはtextareaの場合、preview.tsで処理される
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
                    // 入力フィールド内でのEnterキーは、preview.tsで処理される
                    // ここでは何もしない（イベントの伝播を止めない）
                    return;
                }
                // 入力フィールド外でのEnterキーは無視（モーダルを閉じない）
                e.preventDefault();
                e.stopPropagation();
            }
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-6 pt-6 pb-4 flex items-center justify-between border-b bg-white",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-semibold",
                        children: "プレビュー"
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                        lineNumber: 308,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: togglePreview,
                        className: "rounded-lg p-1.5 hover:bg-gray-100 transition-colors",
                        "aria-label": "プレビューを閉じる",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                            lineNumber: 314,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                        lineNumber: 309,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this),
            selectedProduct && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-6 py-3 text-sm text-gray-600 border-b bg-gray-50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "font-medium",
                    children: selectedProduct.name
                }, void 0, false, {
                    fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                    lineNumber: 321,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 320,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex items-center justify-center p-6 bg-gray-100 overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col relative overflow-hidden",
                    style: {
                        width: '300px',
                        height: '600px',
                        border: '3px solid black',
                        borderRadius: '16px',
                        background: 'white'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 flex flex-col relative overflow-hidden",
                        style: {
                            padding: '24px 4px',
                            boxSizing: 'border-box'
                        },
                        children: selectedAsset?.modelUrl || selectedAsset?.glbUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: previewContainerRef,
                            className: "flex-1 flex flex-col overflow-hidden",
                            style: {
                                minHeight: 0
                            }
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                            lineNumber: 350,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 flex items-center justify-center text-gray-400",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-medium mb-1",
                                        children: "アセットがありません"
                                    }, void 0, false, {
                                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                                        lineNumber: 360,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs",
                                        children: "アセット管理から3Dモデルを追加してください"
                                    }, void 0, false, {
                                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                                        lineNumber: 361,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                                lineNumber: 359,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                            lineNumber: 358,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                        lineNumber: 341,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                    lineNumber: 330,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 326,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
        lineNumber: 283,
        columnNumber: 5
    }, this);
}
}),
"[project]/atelier/apps/console/src/app/database/layout.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DatabaseLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$components$2f$sidebar$2f$Sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/ProductSelectionContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$preview$2f$PreviewPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
function DatabaseLayoutContent({ children }) {
    const { isPreviewOpen, selectedProduct, selectedSize } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProductSelection"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-screen overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$components$2f$sidebar$2f$Sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: `overflow-y-auto bg-gray-50 p-6 transition-all duration-300 ease-in-out ${isPreviewOpen ? "flex-1 mr-96" : "flex-1"}`,
                children: children
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `fixed right-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out ${isPreviewOpen ? "translate-x-0" : "translate-x-full"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$preview$2f$PreviewPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PreviewPanel"], {
                    selectedProduct: selectedProduct,
                    selectedSize: selectedSize
                }, void 0, false, {
                    fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
                    lineNumber: 29,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
function DatabaseLayout({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProductSelectionProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DatabaseLayoutContent, {
            children: children
        }, void 0, false, {
            fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
            lineNumber: 45,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=atelier_86b734d2._.js.map