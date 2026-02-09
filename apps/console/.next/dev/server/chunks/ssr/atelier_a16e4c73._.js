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
"[project]/atelier/packages/preview/src/viewer.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "init3DViewer",
    ()=>init3DViewer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/node_modules/three/build/three.module.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/node_modules/three/examples/jsm/loaders/GLTFLoader.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$FBXLoader$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/node_modules/three/examples/jsm/loaders/FBXLoader.js [app-ssr] (ecmascript)");
;
;
;
function init3DViewer(container, options) {
    const { glbUrl, modelUrl, textureUrl, backgroundImageUrl, onLoad, onError } = options;
    // modelUrlを優先、なければglbUrlを使用（後方互換性）
    const currentModelUrl = modelUrl || glbUrl;
    // コンテナのサイズを取得（初期化時に0の場合はデフォルト値を使用）
    const getContainerSize = ()=>{
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        return {
            width,
            height
        };
    };
    const { width: initialWidth, height: initialHeight } = getContainerSize();
    console.log("[Atelier Preview] Initializing 3D viewer:", {
        containerWidth: container.clientWidth,
        containerHeight: container.clientHeight,
        initialWidth,
        initialHeight
    });
    // Scene setup（背景画像はフレームの背面に配置するため、3Dシーンでは透明にする）
    const scene = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Scene();
    // 背景画像はフレームの背面に配置するため、3Dシーンでは透明にする
    scene.background = null; // 透明
    // Camera（PreviewPanelのModelViewerと同じ: position: [0, 0, 5], fov: 50）
    const camera = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.PerspectiveCamera(50, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(0, 0, 4); // モデルを大きく見せるためにカメラを近づける
    // Renderer（背景画像はフレームの背面に配置するため、常に透明）
    const renderer = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    // 高解像度レンダリング（Retinaディスプレイ対応）
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // 最大2倍まで
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(initialWidth, initialHeight);
    // 色の再現性を向上（sRGB色空間）
    // Three.js r152以降ではoutputColorSpaceを使用
    if ('outputColorSpace' in renderer) {
        renderer.outputColorSpace = 'srgb';
    } else if ('outputEncoding' in renderer) {
        // 古いバージョンのThree.js用
        renderer.outputEncoding = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.sRGBEncoding;
    }
    renderer.toneMapping = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; // 露出を少し上げて明るく
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.PCFSoftShadowMap; // ソフトシャドウ
    // 背景画像はフレームの背面に配置するため、常に透明
    renderer.setClearColor(0x000000, 0); // 背景を透明にする
    const canvasElement = renderer.domElement;
    canvasElement.style.touchAction = "none"; // タッチイベントを有効化
    canvasElement.style.pointerEvents = "auto"; // ポインターイベントを有効化
    canvasElement.style.position = "relative"; // 位置を相対に設定
    canvasElement.style.zIndex = "1"; // z-indexを設定してイベントが確実に動作するように
    container.appendChild(canvasElement);
    // Lights（彩度を向上させるため、ライトの強度を調整）
    const ambientLight = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.AmbientLight(0xffffff, 1.2); // 環境光を少し強く
    scene.add(ambientLight);
    const directionalLight1 = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.DirectionalLight(0xffffff, 2.0); // メインライトを強く
    directionalLight1.position.set(10, 10, 5);
    directionalLight1.castShadow = true;
    // 影の設定
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 50;
    directionalLight1.shadow.camera.left = -10;
    directionalLight1.shadow.camera.right = 10;
    directionalLight1.shadow.camera.top = 10;
    directionalLight1.shadow.camera.bottom = -10;
    directionalLight1.shadow.bias = -0.0001;
    scene.add(directionalLight1);
    const directionalLight2 = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-10, -10, -5);
    scene.add(directionalLight2);
    const directionalLight3 = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.DirectionalLight(0xffffff, 0.5);
    directionalLight3.position.set(0, 10, 0);
    scene.add(directionalLight3);
    // OrbitControls（PreviewPanelのModelViewerと同じ制約）
    // enableZoom: false, enablePan: false
    // minPolarAngle: Math.PI / 4 (45度 - 上限), maxPolarAngle: (Math.PI * 3) / 4 (135度 - 下限)
    let isDragging = false;
    let previousMousePosition = {
        x: 0,
        y: 0
    };
    const minPolarAngle = Math.PI / 4; // 45度（上方向の限界）
    const maxPolarAngle = Math.PI * 3 / 4; // 135度（下方向の限界）
    // 初期のphi（上下回転）を保存して固定
    const initialSpherical = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Spherical();
    initialSpherical.setFromVector3(camera.position);
    const fixedPhi = initialSpherical.phi; // 上下回転を固定
    // canvas要素にイベントリスナーを追加
    canvasElement.addEventListener("mousedown", (e)=>{
        e.preventDefault();
        isDragging = true;
        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
        canvasElement.style.cursor = "grabbing";
    });
    canvasElement.addEventListener("mousemove", (e)=>{
        if (!isDragging) return;
        e.preventDefault();
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        // Rotate camera around the model（z軸回転のみ許可）
        const spherical = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Spherical();
        spherical.setFromVector3(camera.position);
        // z軸回転（theta）のみ変更可能、水平方向のドラッグで回転
        spherical.theta -= deltaX * 0.01; // 横方向のドラッグでz軸回転
        // 上下回転（phi）は固定
        spherical.phi = fixedPhi; // 上下回転を固定
        // z軸方向（前後方向）の動きを制限：radiusを固定（5に固定）
        spherical.radius = 5;
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
    });
    canvasElement.addEventListener("mouseup", ()=>{
        isDragging = false;
        canvasElement.style.cursor = "grab";
    });
    canvasElement.addEventListener("mouseleave", ()=>{
        isDragging = false;
        canvasElement.style.cursor = "grab";
    });
    // タッチイベントも追加
    canvasElement.addEventListener("touchstart", (e)=>{
        e.preventDefault();
        if (e.touches.length === 1) {
            isDragging = true;
            previousMousePosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    });
    canvasElement.addEventListener("touchmove", (e)=>{
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault();
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        const spherical = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Spherical();
        spherical.setFromVector3(camera.position);
        // z軸回転（theta）のみ変更可能、水平方向のドラッグで回転
        spherical.theta -= deltaX * 0.01; // 横方向のドラッグでz軸回転
        // 上下回転（phi）は固定
        spherical.phi = fixedPhi; // 上下回転を固定
        // z軸方向（前後方向）の動きを制限：radiusを固定（5に固定）
        spherical.radius = 5;
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
        previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    });
    canvasElement.addEventListener("touchend", ()=>{
        isDragging = false;
    });
    canvasElement.style.cursor = "grab";
    // 地面を追加（影を受けるため）
    const groundGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.PlaneGeometry(20, 20);
    const groundMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0 // 透明だが影を受ける
    });
    const ground = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // 地面を水平にする
    ground.position.y = -3; // モデルの下に配置
    ground.receiveShadow = true;
    scene.add(ground);
    // Load model
    let currentModel = null;
    const gltfLoader = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GLTFLoader"]();
    const fbxLoader = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$FBXLoader$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FBXLoader"]();
    // モデルのすべてのメッシュにcastShadowを設定し、マテリアルの色空間を設定する関数
    const enableShadow = (object)=>{
        object.traverse((child)=>{
            if (child instanceof __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // マテリアルの色空間を設定（彩度向上）
                if (child.material) {
                    const material = child.material;
                    if ('colorSpace' in material) {
                        material.colorSpace = 'srgb';
                    } else if ('encoding' in material) {
                        // 古いバージョンのThree.js用
                        material.encoding = __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.sRGBEncoding;
                    }
                }
            }
        });
    };
    // ファイル拡張子からモデル形式を判定
    function getModelFormat(url) {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.endsWith(".glb") || lowerUrl.endsWith(".gltf")) {
            return "glb";
        } else if (lowerUrl.endsWith(".fbx")) {
            return "fbx";
        }
        return "unknown";
    }
    function loadModel(url) {
        if (currentModel) {
            scene.remove(currentModel);
            currentModel = null;
        }
        // 既存のメッセージを削除（安全な方法）
        const existingMessage = container.querySelector("[data-atelier-message]");
        if (existingMessage) {
            try {
                // remove()メソッドを使用（親子関係を確認する必要がない）
                existingMessage.remove();
            } catch (error) {
                // エラーが発生した場合は、display: noneで非表示にする
                existingMessage.style.display = "none";
            }
        }
        if (!url) {
            // URLが指定されていない場合はメッセージを表示
            const messageDiv = document.createElement("div");
            messageDiv.setAttribute("data-atelier-message", "true");
            messageDiv.textContent = "3Dモデルが設定されていません";
            messageDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #6b7280;
        font-size: 14px;
        pointer-events: none;
        z-index: 10;
      `;
            container.appendChild(messageDiv);
            return;
        }
        console.log("[Atelier Preview] Loading 3D model:", url);
        const format = getModelFormat(url);
        // モデル形式に応じて適切なローダーを使用
        if (format === "fbx") {
            fbxLoader.load(url, (fbx)=>{
                console.log("[Atelier Preview] FBX model loaded successfully:", url);
                currentModel = fbx;
                // まずスケールを適用（バウンディングボックス計算前に）
                // FBXファイルは通常メートル単位なので、より大きなスケールを試す
                // まずは大きめのスケールで表示を確認
                const initialScale = 0.018; // 少し小さくする
                currentModel.scale.set(initialScale, initialScale, initialScale);
                // スケール適用後にバウンディングボックスを計算
                const box = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Box3().setFromObject(currentModel);
                const center = box.getCenter(new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Vector3());
                const size = box.getSize(new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__.Vector3());
                const maxSize = Math.max(size.x, size.y, size.z);
                console.log("[Atelier Preview] FBX bounding box (after scale):", {
                    center,
                    size,
                    maxSize,
                    initialScale
                });
                // 原点を中心に移動し、Y軸を少し上に移動
                currentModel.position.set(-center.x, -center.y + 0.2, -center.z);
                // 回転は一旦なし（表示確認後、必要に応じて調整）
                currentModel.rotation.set(0, 0, 0);
                // 影を有効化
                enableShadow(currentModel);
                console.log("[Atelier Preview] FBX model settings:", {
                    position: currentModel.position,
                    scale: currentModel.scale,
                    rotation: currentModel.rotation,
                    maxSize,
                    initialScale,
                    boundingBoxCenter: center,
                    boundingBoxSize: size
                });
                scene.add(currentModel);
                // モデルがシーンに追加されたことを確認
                console.log("[Atelier Preview] FBX model added to scene. Scene children count:", scene.children.length);
                // カメラをモデルに向ける（念のため）
                if (camera) {
                    camera.lookAt(0, 0, 0);
                    console.log("[Atelier Preview] Camera positioned at:", camera.position, "looking at:", [
                        0,
                        0,
                        0
                    ]);
                }
                // 成功したらメッセージを削除（安全な方法）
                const existingMessage = container.querySelector("[data-atelier-message]");
                if (existingMessage) {
                    try {
                        existingMessage.remove();
                    } catch (error) {
                        existingMessage.style.display = "none";
                    }
                }
                onLoad?.();
            }, undefined, (error)=>{
                handleModelError(error, url);
            });
        } else {
            // GLB/GLTFの場合はGLTFLoaderを使用
            gltfLoader.load(url, (gltf)=>{
                console.log("[Atelier Preview] GLB model loaded successfully:", url);
                currentModel = gltf.scene;
                // PreviewPanelのModelViewerと同じ: scale: [3.5, 3.5, 3.5], rotation: [0, -Math.PI / 2, 0]
                // 少し小さくする
                currentModel.scale.set(3.0, 3.0, 3.0);
                currentModel.rotation.y = -Math.PI / 2;
                // Y軸を少し上に移動
                currentModel.position.y = 0.2;
                // 影を有効化
                enableShadow(currentModel);
                scene.add(currentModel);
                // 成功したらメッセージを削除（安全な方法）
                const existingMessage = container.querySelector("[data-atelier-message]");
                if (existingMessage) {
                    try {
                        existingMessage.remove();
                    } catch (error) {
                        existingMessage.style.display = "none";
                    }
                }
                onLoad?.();
            }, undefined, (error)=>{
                handleModelError(error, url);
            });
        }
    }
    function handleModelError(error, url) {
        // 接続エラーの場合は、コンソールログを抑制（ブラウザのネットワークエラーは表示されるが、JavaScript側では抑制）
        const isConnectionError = error instanceof Error && (error.message === "Failed to fetch" || error.message.includes("network") || error.message.includes("connection"));
        if (!isConnectionError) {
            console.error("[Atelier Preview] Failed to load 3D model:", error, url);
        }
        // エラーメッセージを表示
        const errorDiv = document.createElement("div");
        errorDiv.setAttribute("data-atelier-message", "true");
        // 接続エラーの場合は、より詳細なメッセージを表示
        let errorMessage = "3Dモデルの読み込みに失敗しました";
        if (isConnectionError) {
            errorMessage = "consoleサーバーが起動していません\nnpm run dev:console を実行してください";
        }
        errorDiv.textContent = errorMessage;
        errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ef4444;
      font-size: 14px;
      pointer-events: none;
      z-index: 10;
      text-align: center;
      white-space: pre-line;
    `;
        container.appendChild(errorDiv);
        onError?.(error instanceof Error ? error : new Error(String(error)));
    }
    // Load initial model
    loadModel(currentModelUrl);
    // Animation loop
    let animationId;
    function animate() {
        animationId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
    // Handle resize
    const resizeObserver = new ResizeObserver(()=>{
        const { width, height } = getContainerSize();
        if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            console.log("[Atelier Preview] Resized 3D viewer:", {
                width,
                height
            });
        }
    });
    resizeObserver.observe(container);
    return {
        updateGlbUrl (newGlbUrl) {
            // 後方互換性のため
            loadModel(newGlbUrl);
        },
        updateModelUrl (newModelUrl) {
            // GLBとFBXの両方をサポート
            loadModel(newModelUrl);
        },
        destroy () {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
            if (currentModel) {
                scene.remove(currentModel);
            }
            // 地面を削除
            scene.remove(ground);
            groundGeometry.dispose();
            groundMaterial.dispose();
            // renderer.domElementを削除（安全な方法）
            try {
                // DOMに接続されているか確認してから削除
                if (renderer.domElement && renderer.domElement.isConnected) {
                    // remove()メソッドを使用（親子関係を確認する必要がない）
                    renderer.domElement.remove();
                } else if (renderer.domElement && renderer.domElement.parentNode) {
                    // isConnectedがfalseでもparentNodeがある場合は削除を試みる
                    try {
                        renderer.domElement.remove();
                    } catch (error) {
                        // エラーが発生した場合は、display: noneで非表示にする
                        renderer.domElement.style.display = "none";
                    }
                }
            } catch (error) {
                // エラーが発生した場合は、display: noneで非表示にする
                try {
                    renderer.domElement.style.display = "none";
                } catch (innerError) {
                    // それでもエラーが発生する場合は無視
                    console.warn("[Atelier Preview] Could not hide renderer element:", innerError);
                }
            }
            renderer.dispose();
        }
    };
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
    // サイズ選択エリア（下に配置、フレームに対して相対的な位置）
    const sizeArea = document.createElement("div");
    sizeArea.style.cssText = `
    position: relative;
    width: 100%;
    flex-shrink: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2%;
    padding: 0 6%;
    padding-bottom: 1%;
    box-sizing: border-box;
    margin-top: auto;
  `;
    // サイズ選択ボタン全体のコンテナ（矢印ボタンとサイズボタンを含む）
    const sizeSelectorWrapper = document.createElement("div");
    sizeSelectorWrapper.style.cssText = `
    display: flex;
    align-items: center;
    width: 100%;
    position: relative;
    min-width: 0;
    overflow: visible;
  `;
    // 左矢印ボタン（相対配置）
    const prevButton = document.createElement("button");
    prevButton.innerHTML = "&lt;";
    prevButton.style.cssText = `
    position: relative;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    font-size: 1.5%;
    color: #374151;
    cursor: pointer;
    padding: 0;
    outline: none;
    transition: all 0.2s ease;
    font-weight: 600;
    width: 3.3%;
    height: 3.3%;
    min-width: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    z-index: 10;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-right: -1.7%;
  `;
    // サイズ選択ボタンコンテナ（横スクロール可能、中央に配置）
    const sizeButtonsContainer = document.createElement("div");
    sizeButtonsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.9%;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    justify-content: center;
    flex: 1;
    min-width: 0;
    padding: 0 4.6%;
    margin: 0 auto;
  `;
    // スクロールバーを非表示（Chrome, Safari, Edge）
    const style = document.createElement("style");
    style.textContent = `
    [data-size-buttons-container]::-webkit-scrollbar {
      display: none;
    }
  `;
    document.head.appendChild(style);
    sizeButtonsContainer.setAttribute("data-size-buttons-container", "true");
    // サイズボタン配列
    const sizeButtons = [];
    // サイズボタンを横並びで表示（S, M, L, XLなど）
    availableSizes.forEach((size, index)=>{
        const sizeBtn = document.createElement("button");
        sizeBtn.textContent = size;
        const isSelected = size === initialSize;
        sizeBtn.style.cssText = `
      background: ${isSelected ? "#000000" : "rgba(255, 255, 255, 0.95)"};
      color: ${isSelected ? "#ffffff" : "#374151"};
      border: ${isSelected ? "1px solid #000000" : "1px solid rgba(0, 0, 0, 0.15)"};
      font-size: 1.2%;
      font-weight: ${isSelected ? "700" : "600"};
      padding: 0.7% 1.5%;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 4%;
      height: 3.3%;
      min-height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      flex-shrink: 0;
      white-space: nowrap;
      box-shadow: ${isSelected ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "0 1px 3px rgba(0, 0, 0, 0.1)"};
      backdrop-filter: blur(8px);
    `;
        sizeButtons.push(sizeBtn);
        sizeButtonsContainer.appendChild(sizeBtn);
    });
    // 右矢印ボタン（相対配置）
    const nextButton = document.createElement("button");
    nextButton.innerHTML = "&gt;";
    nextButton.style.cssText = `
    position: relative;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    font-size: 1.5%;
    color: #374151;
    cursor: pointer;
    padding: 0;
    outline: none;
    transition: all 0.2s ease;
    font-weight: 600;
    width: 3.3%;
    height: 3.3%;
    min-width: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-left: -1.7%;
  `;
    // ホバーエフェクト
    prevButton.addEventListener("mouseenter", ()=>{
        prevButton.style.background = "rgba(255, 255, 255, 1)";
        prevButton.style.transform = "scale(1.1)";
    });
    prevButton.addEventListener("mouseleave", ()=>{
        prevButton.style.background = "rgba(255, 255, 255, 0.9)";
        prevButton.style.transform = "scale(1)";
    });
    nextButton.addEventListener("mouseenter", ()=>{
        nextButton.style.background = "rgba(255, 255, 255, 1)";
        nextButton.style.transform = "scale(1.1)";
    });
    nextButton.addEventListener("mouseleave", ()=>{
        nextButton.style.background = "rgba(255, 255, 255, 0.9)";
        nextButton.style.transform = "scale(1)";
    });
    // レイアウト: 左矢印（相対配置） → サイズボタンコンテナ（中央） → 右矢印（相対配置）
    sizeSelectorWrapper.appendChild(prevButton);
    sizeSelectorWrapper.appendChild(sizeButtonsContainer);
    sizeSelectorWrapper.appendChild(nextButton);
    sizeArea.appendChild(sizeSelectorWrapper);
    // 商品名は別の要素として返す（サイズ選択の下に配置するため）
    let productNameDiv = null;
    if (productName) {
        productNameDiv = document.createElement("div");
        productNameDiv.textContent = productName.toUpperCase();
        productNameDiv.style.cssText = `
      font-size: 2.5%;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #1f2937;
      text-align: center;
      width: 100%;
      padding-bottom: 2%;
      box-sizing: border-box;
    `;
    }
    return {
        sizeArea,
        sizeButtons,
        sizeButtonsContainer,
        prevButton,
        nextButton,
        productNameDiv
    };
}
function createViewerContainer(productName) {
    // 3Dモデルエリア（中央、flex: 1で残りのスペースを埋める）
    const viewerContainer = document.createElement("div");
    viewerContainer.style.cssText = `
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    transform-origin: center center;
    pointer-events: auto;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
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
    // 左側フローティングアクションボタン
    const floatingButtons = document.createElement("div");
    floatingButtons.style.cssText = `
    position: absolute;
    left: 2.8%;
    bottom: 20%;
    display: flex;
    flex-direction: column;
    gap: 0.9%;
    z-index: 25;
    pointer-events: none;
  `;
    const getIconUrl = (iconName)=>{
        if ("TURBOPACK compile-time truthy", 1) return "";
        //TURBOPACK unreachable
        ;
        // data-atelier-api-url属性から取得
        const apiUrl = undefined;
        // widget.jsのスクリプトタグから取得（getApiBaseUrlと同じロジック）
        const scriptTag = undefined;
    };
    // ジャケットアイコンボタン
    const jacketButton = document.createElement("button");
    const jacketIcon = document.createElement("img");
    jacketIcon.src = getIconUrl("jaclet");
    jacketIcon.alt = "ジャケット";
    jacketIcon.style.cssText = `
    width: 2.2%;
    height: 2.2%;
    min-width: 20px;
    min-height: 20px;
    object-fit: contain;
  `;
    jacketButton.appendChild(jacketIcon);
    jacketButton.style.cssText = `
    width: 4.6%;
    height: 4.6%;
    min-width: 44px;
    min-height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    transition: all 0.2s ease;
    color: black;
  `;
    // ユーザーアイコンボタン
    const userButton = document.createElement("button");
    const userIcon = document.createElement("img");
    userIcon.src = getIconUrl("person");
    userIcon.alt = "ユーザー";
    userIcon.style.cssText = `
    width: 2.2%;
    height: 2.2%;
    min-width: 20px;
    min-height: 20px;
    object-fit: contain;
  `;
    userButton.appendChild(userIcon);
    userButton.style.cssText = `
    width: 4.6%;
    height: 4.6%;
    min-width: 44px;
    min-height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    transition: all 0.2s ease;
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
    messageArea.appendChild(messageForm);
    bottomControls.appendChild(messageArea);
    return {
        bottomControls,
        messageArea,
        messageForm,
        messageInput,
        sendButton
    };
}
}),
"[project]/atelier/packages/preview/src/preview.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "initPreviewPanel",
    ()=>initPreviewPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$viewer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/viewer.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$ui$2d$elements$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/ui-elements.ts [app-ssr] (ecmascript)");
;
;
function getBackgroundImageUrl() {
    if ("TURBOPACK compile-time truthy", 1) return "";
    //TURBOPACK unreachable
    ;
    // data-atelier-api-url属性から取得
    const apiUrl = undefined;
    // widget.jsのスクリプトタグから取得（getApiBaseUrlと同じロジック）
    const scriptTag = undefined;
}
function initPreviewPanel(options) {
    const { container, glbUrl, modelUrl, textureUrl, initialHeight = 170, minHeight = 150, maxHeight = 190, availableSizes = [
        "S",
        "M",
        "L"
    ], initialSize = "M", productName, onHeightChange, onSizeChange, onMessageSend, onModelLoad, onModelError, onBackClick } = options;
    // modelUrlを優先、なければglbUrlを使用（後方互換性）
    const currentModelUrl = modelUrl || glbUrl;
    let currentSize = initialSize;
    let isKeyboardVisible = false;
    // 既存の要素を個別に削除（innerHTMLを使わない - Reactとの競合を避けるため）
    // PreviewPanel.tsxでdestroy()の後にクリアしているが、念のためここでもクリア
    // ただし、innerHTMLは使わず、個別にremove()で削除
    try {
        // 子要素を配列にコピーしてから削除（削除中にDOMが変更されるのを防ぐ）
        const children = Array.from(container.children);
        for (const child of children){
            try {
                child.remove();
            } catch (error) {
                // 個別の削除エラーは無視
                console.warn("[Atelier Preview] Could not remove child element:", error);
            }
        }
    } catch (error) {
        // エラーは無視（既にクリアされている可能性がある）
        console.warn("[Atelier Preview] Could not clear container, continuing anyway:", error);
    }
    // コンテナのスタイルを完全にリセットして設定（親要素の影響を受けないように）
    container.style.cssText = `
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: transparent !important;
    gap: 0 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-sizing: border-box !important;
  `.trim();
    // UI要素を作成
    console.log("[Atelier Preview] initPreviewPanel - availableSizes:", availableSizes, "length:", availableSizes.length);
    const sizeAreaElements = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$ui$2d$elements$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSizeArea"])(availableSizes, initialSize, productName);
    const { sizeArea, sizeButtons, sizeButtonsContainer, prevButton, nextButton, productNameDiv } = sizeAreaElements;
    console.log("[Atelier Preview] initPreviewPanel - sizeButtons length:", sizeButtons.length);
    console.log("[Atelier Preview] initPreviewPanel - sizeButtonsContainer children:", sizeButtonsContainer.children.length);
    // 選択されたサイズボタンを中央にスクロールする関数
    const scrollToSelectedSize = ()=>{
        const currentIndex = availableSizes.indexOf(currentSize);
        if (currentIndex >= 0 && sizeButtons[currentIndex]) {
            const selectedButton = sizeButtons[currentIndex];
            const containerRect = sizeButtonsContainer.getBoundingClientRect();
            const buttonRect = selectedButton.getBoundingClientRect();
            const scrollLeft = sizeButtonsContainer.scrollLeft;
            const buttonLeft = buttonRect.left - containerRect.left + scrollLeft;
            const buttonWidth = buttonRect.width;
            const containerWidth = containerRect.width;
            const targetScroll = buttonLeft - containerWidth / 2 + buttonWidth / 2;
            sizeButtonsContainer.scrollTo({
                left: Math.max(0, targetScroll),
                behavior: "smooth"
            });
        }
    };
    // 初期表示時に選択されたサイズを中央にスクロール
    setTimeout(()=>{
        scrollToSelectedSize();
    }, 100);
    const viewerElements = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$ui$2d$elements$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createViewerContainer"])(productName);
    const { viewerContainer, floatingButtons, jacketButton, userButton } = viewerElements;
    // 各ボタンにpointer-eventsを設定
    const setButtonPointerEvents = (button)=>{
        button.style.pointerEvents = "auto";
    };
    setButtonPointerEvents(jacketButton);
    setButtonPointerEvents(userButton);
    // フローティングボタンのホバーエフェクト
    jacketButton.addEventListener("mouseenter", ()=>{
        jacketButton.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.18)";
        jacketButton.style.transform = "scale(1.08)";
        jacketButton.style.background = "rgba(255, 255, 255, 1)";
    });
    jacketButton.addEventListener("mouseleave", ()=>{
        jacketButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.12)";
        jacketButton.style.transform = "scale(1)";
        jacketButton.style.background = "rgba(255, 255, 255, 0.95)";
    });
    userButton.addEventListener("mouseenter", ()=>{
        userButton.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.18)";
        userButton.style.transform = "scale(1.08)";
        userButton.style.background = "rgba(255, 255, 255, 1)";
    });
    userButton.addEventListener("mouseleave", ()=>{
        userButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.12)";
        userButton.style.transform = "scale(1)";
        userButton.style.background = "rgba(255, 255, 255, 0.95)";
    });
    // サイズボタンのイベントハンドラー
    const updateSizeButtons = ()=>{
        sizeButtons.forEach((btn, idx)=>{
            const btnSize = availableSizes[idx];
            const selected = btnSize === currentSize;
            btn.style.background = selected ? "#000000" : "rgba(255, 255, 255, 0.95)";
            btn.style.color = selected ? "#ffffff" : "#374151";
            btn.style.border = selected ? "1px solid #000000" : "1px solid rgba(0, 0, 0, 0.15)";
            btn.style.fontWeight = selected ? "700" : "600";
            btn.style.fontSize = "1.2%";
            btn.style.padding = "0.7% 1.5%";
            btn.style.minWidth = "4%";
            btn.style.height = "3.3%";
            btn.style.minHeight = "32px";
            btn.style.borderRadius = "20px";
            btn.style.boxShadow = selected ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "0 1px 3px rgba(0, 0, 0, 0.1)";
        });
        // 選択されたサイズを中央にスクロール
        scrollToSelectedSize();
    };
    // タップで反転エフェクト（prevButton）
    prevButton.addEventListener("mousedown", ()=>{
        prevButton.style.opacity = "0.5";
    });
    prevButton.addEventListener("mouseup", ()=>{
        prevButton.style.opacity = "1";
    });
    prevButton.addEventListener("mouseleave", ()=>{
        prevButton.style.opacity = "1";
    });
    prevButton.addEventListener("touchstart", ()=>{
        prevButton.style.opacity = "0.5";
    });
    prevButton.addEventListener("touchend", ()=>{
        prevButton.style.opacity = "1";
    });
    prevButton.addEventListener("click", ()=>{
        const currentIndex = availableSizes.indexOf(currentSize);
        if (currentIndex > 0) {
            currentSize = availableSizes[currentIndex - 1];
            updateSizeButtons();
            onSizeChange?.(currentSize);
        }
    });
    // サイズボタンコンテナのタッチイベントでスワイプを許可
    let isScrolling = false;
    sizeButtonsContainer.addEventListener("touchstart", ()=>{
        isScrolling = false;
    });
    sizeButtonsContainer.addEventListener("touchmove", ()=>{
        isScrolling = true;
    });
    // タップで反転エフェクト（nextButton）
    nextButton.addEventListener("mousedown", ()=>{
        nextButton.style.opacity = "0.5";
    });
    nextButton.addEventListener("mouseup", ()=>{
        nextButton.style.opacity = "1";
    });
    nextButton.addEventListener("mouseleave", ()=>{
        nextButton.style.opacity = "1";
    });
    nextButton.addEventListener("touchstart", ()=>{
        nextButton.style.opacity = "0.5";
    });
    nextButton.addEventListener("touchend", ()=>{
        nextButton.style.opacity = "1";
    });
    nextButton.addEventListener("click", ()=>{
        const currentIndex = availableSizes.indexOf(currentSize);
        if (currentIndex < availableSizes.length - 1) {
            currentSize = availableSizes[currentIndex + 1];
            updateSizeButtons();
            onSizeChange?.(currentSize);
        }
    });
    // サイズボタンのクリックイベント
    sizeButtons.forEach((sizeBtn, idx)=>{
        sizeBtn.addEventListener("click", (e)=>{
            // スクロール中はクリックイベントを無視
            if (isScrolling) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            currentSize = availableSizes[idx];
            updateSizeButtons();
            onSizeChange?.(currentSize);
        });
    });
    // メッセージ入力エリアを作成
    const messageElements = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$ui$2d$elements$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createMessageArea"])();
    const { bottomControls, messageArea, messageForm, messageInput, sendButton } = messageElements;
    const handleSend = async ()=>{
        const message = messageInput.value.trim();
        if (!message || !onMessageSend) return;
        messageInput.value = "";
        // 送信ボタンを無効化
        sendButton.disabled = true;
        sendButton.style.opacity = "0.5";
        sendButton.style.cursor = "not-allowed";
        try {
            // LLM APIを呼び出し
            const response = await onMessageSend(message);
        // レスポンスはonMessageSendのコールバックで処理される
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally{
            // 送信ボタンを再有効化
            sendButton.disabled = false;
            sendButton.style.opacity = "1";
            sendButton.style.cursor = "pointer";
        }
    };
    // フォーム送信を防ぐ（captureフェーズでも処理）
    const handleFormSubmit = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleSend();
        return false;
    };
    messageForm.addEventListener("submit", handleFormSubmit, true); // capture phase
    messageForm.addEventListener("submit", handleFormSubmit, false); // bubble phase
    sendButton.type = "button"; // フォーム送信を防ぐ
    sendButton.addEventListener("click", (e)=>{
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleSend();
    });
    // Enterキーで送信（フォームのデフォルト動作を防ぐ）
    // captureフェーズでイベントをキャッチして、親要素のイベントハンドラーより先に処理する
    const handleKeyDown = (e)=>{
        if (e.key === "Enter") {
            e.preventDefault(); // フォーム送信を防ぐ
            e.stopPropagation(); // イベントの伝播を止める
            e.stopImmediatePropagation(); // 同じ要素の他のイベントリスナーも止める
            handleSend();
            return false; // さらに確実にイベントを止める
        }
    };
    // captureフェーズとbubbleフェーズの両方でイベントをキャッチ
    messageInput.addEventListener("keydown", handleKeyDown, true); // capture phase
    messageInput.addEventListener("keydown", handleKeyDown, false); // bubble phase
    // keypressイベントも止める（念のため）
    messageInput.addEventListener("keypress", (e)=>{
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, true);
    // messageFormでもEnterキーをキャッチ（念のため）
    messageForm.addEventListener("keydown", (e)=>{
        if (e.key === "Enter" && e.target === messageInput) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }, true);
    // 全要素を追加
    // コンテナの構造: モデル（中央、flex: 1） → サイズ選択（下） → 商品名（下）
    container.appendChild(viewerContainer);
    container.appendChild(sizeArea);
    if (productNameDiv) {
        container.appendChild(productNameDiv);
    }
    container.appendChild(bottomControls);
    // 3Dビューアを初期化（背景画像を指定）
    const backgroundImageUrl = getBackgroundImageUrl();
    const viewerInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$viewer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["init3DViewer"])(viewerContainer, {
        glbUrl,
        modelUrl,
        textureUrl,
        backgroundImageUrl,
        onLoad: onModelLoad,
        onError: onModelError
    });
    // 作成した要素への参照を保持（destroy()で個別に削除するため）
    const createdElements = [
        sizeArea,
        viewerContainer,
        bottomControls
    ];
    if (productNameDiv) {
        createdElements.push(productNameDiv);
    }
    return {
        updateGlbUrl (newGlbUrl) {
            // 後方互換性のため
            viewerInstance.updateGlbUrl(newGlbUrl);
        },
        updateModelUrl (newModelUrl) {
            // GLBとFBXの両方をサポート
            viewerInstance.updateModelUrl(newModelUrl);
        },
        updateHeight (height) {
            // 身長スライダーは削除されたため、コールバックのみ呼び出す
            onHeightChange?.(height);
        },
        updateSize (size) {
            currentSize = size;
            updateSizeButtons();
        },
        destroy () {
            // イベントリスナーの削除（チャット機能削除により不要）
            // 3Dビューアを破棄（viewerContainer内の要素も削除される）
            try {
                viewerInstance.destroy();
            } catch (error) {
                console.error("[Atelier Preview] Error destroying viewer instance:", error);
            }
            // DOMのクリーンアップ - 作成した要素を個別に削除（innerHTMLは使わない）
            // container要素自体はReactが管理しているが、子要素はVanilla JSで作成したものなので削除可能
            try {
                // 作成した要素を個別に削除（remove()メソッドを使用）
                for (const element of createdElements){
                    try {
                        if (element && element.isConnected) {
                            element.remove();
                        } else if (element && element.parentNode) {
                            // isConnectedがfalseでもparentNodeがある場合は削除を試みる
                            element.remove();
                        }
                    } catch (error) {
                        // 個別の削除エラーは無視
                        console.warn("[Atelier Preview] Could not remove element:", error);
                    }
                }
            } catch (error) {
                // エラーが発生した場合は無視（既に削除されている可能性がある）
                console.warn("[Atelier Preview] Could not clean up container:", error);
            }
        }
    };
}
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
(()=>{
    const e = new Error("Cannot find module './PhoneFrame'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
"use client";
;
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
    // 利用可能なサイズを取得（デフォルトでS、M、L、XLを表示）
    const availableSizes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        // 常にデフォルトサイズを返す（アセットの有無に関わらず）
        const defaultSizes = [
            "S",
            "M",
            "L",
            "XL"
        ];
        // アセットから実際に存在するサイズを取得
        const assetSizes = new Set();
        assets.forEach((asset)=>{
            if (asset.isActive !== false) {
                assetSizes.add(asset.size);
            }
        });
        // デフォルトサイズを返す（アセットが存在するサイズも含む）
        return defaultSizes;
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
        // 商品名を取得
        const currentProductName = selectedProduct?.name;
        console.log("[PreviewPanel] Product name:", currentProductName);
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
            productName: currentProductName,
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
            width: '400px'
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
                        lineNumber: 320,
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
                            lineNumber: 326,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                        lineNumber: 321,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 319,
                columnNumber: 7
            }, this),
            selectedProduct && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-6 py-3 text-sm text-gray-600 border-b bg-gray-50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "font-medium",
                    children: selectedProduct.name
                }, void 0, false, {
                    fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                    lineNumber: 333,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 332,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex items-center justify-center p-6 bg-gray-100 overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PhoneFrame, {
                    previewContainerRef: previewContainerRef,
                    selectedAsset: selectedAsset
                }, void 0, false, {
                    fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                    lineNumber: 341,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 338,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
        lineNumber: 295,
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
                className: `overflow-y-auto bg-gray-50 p-6 transition-all duration-300 ease-in-out ${isPreviewOpen ? "flex-1 mr-[400px]" : "flex-1"}`,
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

//# sourceMappingURL=atelier_a16e4c73._.js.map