(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/atelier/apps/console/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-client] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
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
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [isCollapsed, setIsCollapsed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex h-screen flex-col border-r bg-white transition-all duration-300", isCollapsed ? "w-16" : "w-64"),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex h-16 items-center border-b transition-all", isCollapsed ? "justify-center px-2" : "justify-between px-6"),
                children: [
                    !isCollapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setIsCollapsed(!isCollapsed),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg p-1.5 hover:bg-gray-100 transition-colors", !isCollapsed && "ml-auto"),
                        "aria-label": isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたみ",
                        children: isCollapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                            className: "h-4 w-4"
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx",
                            lineNumber: 61,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex-1 space-y-2 py-4", isCollapsed ? "px-2" : "px-4"),
                children: navigationItems.map((item)=>{
                    const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: item.href,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center rounded-lg py-3 text-sm font-medium transition-colors overflow-hidden", isCollapsed ? "justify-center px-2" : "gap-3 px-3", isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
                        title: isCollapsed ? item.label : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("whitespace-nowrap overflow-hidden transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100"),
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("border-t py-4 space-y-2", isCollapsed ? "px-2" : "px-4"),
                children: bottomItems.map((item)=>{
                    const isLogout = item.href === "/logout";
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: item.href,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center rounded-lg py-3 text-sm font-medium transition-colors overflow-hidden", isCollapsed ? "justify-center px-2" : "gap-3 px-3", isLogout ? "text-red-600 hover:bg-red-50 hover:text-red-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
                        title: isCollapsed ? item.label : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("whitespace-nowrap overflow-hidden transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100"),
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
_s(Sidebar, "UcWkLXTbdBOZNTGAQRDdfpMLVOc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/contexts/ProductSelectionContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProductSelectionProvider",
    ()=>ProductSelectionProvider,
    "useProductSelection",
    ()=>useProductSelection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
const ProductSelectionContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function ProductSelectionProvider({ children }) {
    _s();
    const [selectedProduct, setSelectedProduct] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [selectedSize, setSelectedSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [isPreviewOpen, setIsPreviewOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [viewStats, setViewStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "ProductSelectionProvider.useState": ()=>{
            // ローカルストレージから読み込み
            if ("TURBOPACK compile-time truthy", 1) {
                const stored = localStorage.getItem("productViewStats");
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        return {
                            totalViews: parsed.totalViews || 0,
                            productViews: parsed.productViews || {},
                            lastViewedAt: parsed.lastViewedAt ? new Date(parsed.lastViewedAt) : undefined
                        };
                    } catch  {
                        return {
                            totalViews: 0,
                            productViews: {}
                        };
                    }
                }
            }
            return {
                totalViews: 0,
                productViews: {}
            };
        }
    }["ProductSelectionProvider.useState"]);
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        localStorage.setItem("productViewStats", JSON.stringify(newStats));
                    }
                    return newStats;
                });
            }
            return newState;
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProductSelectionContext.Provider, {
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
_s(ProductSelectionProvider, "wnoA/ZCwGjBIwRjPgpxSJiA07OM=");
_c = ProductSelectionProvider;
function useProductSelection() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(ProductSelectionContext);
    if (context === undefined) {
        throw new Error("useProductSelection must be used within a ProductSelectionProvider");
    }
    return context;
}
_s1(useProductSelection, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "ProductSelectionProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/features/products/useAssets.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAssets",
    ()=>useAssets
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
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
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "assets",
            productId
        ],
        queryFn: {
            "useAssets.useQuery": ()=>fetchAssets(productId)
        }["useAssets.useQuery"],
        enabled: !!productId,
        staleTime: 1000 * 60 * 5
    });
}
_s(useAssets, "4ZpngI1uv+Uo3WQHEZmTQ5FNM+k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/packages/preview/src/preview.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "initPreviewPanel",
    ()=>initPreviewPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/node_modules/three/build/three.module.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/node_modules/three/examples/jsm/loaders/GLTFLoader.js [app-client] (ecmascript)");
;
;
function initPreviewPanel(options) {
    const { container, glbUrl, textureUrl, initialHeight = 170, minHeight = 150, maxHeight = 190, availableSizes = [
        "S",
        "M",
        "L"
    ], initialSize = "M", onHeightChange, onSizeChange, onMessageSend, onModelLoad, onModelError } = options;
    let currentSize = initialSize;
    const chatHistory = [];
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
    // コンテナのスタイルを設定
    const currentStyle = container.style.cssText || "";
    container.style.cssText = `
    ${currentStyle}
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: transparent !important;
    gap: 3px !important;
  `.trim();
    // サイズ選択エリア（上部）
    const sizeArea = document.createElement("div");
    sizeArea.style.cssText = `
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    gap: 12px;
  `;
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
    // タップで反転エフェクト
    prevButton.addEventListener("mousedown", ()=>{
        prevButton.style.background = "black";
        prevButton.style.color = "white";
    });
    prevButton.addEventListener("mouseup", ()=>{
        prevButton.style.background = "white";
        prevButton.style.color = "black";
    });
    prevButton.addEventListener("mouseleave", ()=>{
        prevButton.style.background = "white";
        prevButton.style.color = "black";
    });
    // タッチイベント用
    prevButton.addEventListener("touchstart", ()=>{
        prevButton.style.background = "black";
        prevButton.style.color = "white";
    });
    prevButton.addEventListener("touchend", ()=>{
        prevButton.style.background = "white";
        prevButton.style.color = "black";
    });
    prevButton.addEventListener("click", ()=>{
        const currentIndex = availableSizes.indexOf(currentSize);
        if (currentIndex > 0) {
            currentSize = availableSizes[currentIndex - 1];
            sizeLabel.textContent = currentSize;
            onSizeChange?.(currentSize);
        }
    });
    // サイズ表示（背景黒、文字白）
    const sizeLabel = document.createElement("div");
    sizeLabel.textContent = currentSize;
    sizeLabel.style.cssText = `
    background: black;
    color: white;
    font-size: 14px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 4px;
    width: 40px;
    height: 32px;
    text-align: center;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
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
    // タップで反転エフェクト
    nextButton.addEventListener("mousedown", ()=>{
        nextButton.style.background = "black";
        nextButton.style.color = "white";
    });
    nextButton.addEventListener("mouseup", ()=>{
        nextButton.style.background = "white";
        nextButton.style.color = "black";
    });
    nextButton.addEventListener("mouseleave", ()=>{
        nextButton.style.background = "white";
        nextButton.style.color = "black";
    });
    // タッチイベント用
    nextButton.addEventListener("touchstart", ()=>{
        nextButton.style.background = "black";
        nextButton.style.color = "white";
    });
    nextButton.addEventListener("touchend", ()=>{
        nextButton.style.background = "white";
        nextButton.style.color = "black";
    });
    nextButton.addEventListener("click", ()=>{
        const currentIndex = availableSizes.indexOf(currentSize);
        if (currentIndex < availableSizes.length - 1) {
            currentSize = availableSizes[currentIndex + 1];
            sizeLabel.textContent = currentSize;
            onSizeChange?.(currentSize);
        }
    });
    sizeArea.appendChild(prevButton);
    sizeArea.appendChild(sizeLabel);
    sizeArea.appendChild(nextButton);
    // 3Dモデルエリア（中央、広く取る）
    const viewerContainer = document.createElement("div");
    viewerContainer.style.cssText = `
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    transition: flex 0.3s ease;
  `;
    // チャット履歴エリア（3Dモデルの上にオーバーレイ）
    const chatHistoryArea = document.createElement("div");
    chatHistoryArea.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(4px);
    display: none;
    flex-direction: column;
    overflow-y: auto;
    z-index: 10;
    padding: 8px;
    gap: 8px;
    transition: opacity 0.3s ease;
  `;
    // チャット履歴のスクロールコンテナ
    const chatMessagesContainer = document.createElement("div");
    chatMessagesContainer.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    min-height: 0;
  `;
    // チャット履歴を閉じるボタン（キーボード表示時のみ表示）
    const closeChatButton = document.createElement("button");
    closeChatButton.innerHTML = "×";
    closeChatButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.1);
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    color: #000;
    z-index: 11;
  `;
    closeChatButton.addEventListener("click", ()=>{
        hideChatHistory();
        messageInput.blur(); // キーボードを閉じる
    });
    chatHistoryArea.appendChild(closeChatButton);
    chatHistoryArea.appendChild(chatMessagesContainer);
    viewerContainer.appendChild(chatHistoryArea);
    // チャット履歴を表示/非表示する関数
    const showChatHistory = (force = false)=>{
        // デバッグモードまたは強制表示の場合は、メッセージがなくても表示
        if (!force && chatHistory.length === 0) return;
        console.log("[Atelier Preview] showChatHistory called, force:", force, "chatHistory.length:", chatHistory.length);
        chatHistoryArea.style.display = "flex";
        chatHistoryArea.style.opacity = "1";
        if (isKeyboardVisible) {
            // キーボード表示時は3Dモデルを縮小
            viewerContainer.style.flex = "0.4";
            closeChatButton.style.display = "flex";
        } else {
            // キーボード非表示時は3Dモデルを少し縮小（チャット履歴を表示）
            viewerContainer.style.flex = "0.6";
            closeChatButton.style.display = "flex";
        }
        // 最新のメッセージにスクロール
        setTimeout(()=>{
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, 100);
    };
    const hideChatHistory = ()=>{
        chatHistoryArea.style.opacity = "0";
        setTimeout(()=>{
            if (!isKeyboardVisible) {
                chatHistoryArea.style.display = "none";
                viewerContainer.style.flex = "1"; // 3Dモデルを元のサイズに
                closeChatButton.style.display = "none";
            }
        }, 300);
    };
    // チャット履歴にメッセージを追加する関数
    const addChatMessage = (message)=>{
        console.log("[Atelier Preview] Adding chat message:", message.role, message.content.substring(0, 50));
        chatHistory.push(message);
        const messageDiv = document.createElement("div");
        messageDiv.style.cssText = `
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 80%;
      word-wrap: break-word;
      font-size: 12px;
      line-height: 1.4;
      ${message.role === "user" ? "background: #000; color: #fff; align-self: flex-end;" : "background: #f3f4f6; color: #000; align-self: flex-start;"}
    `;
        messageDiv.textContent = message.content;
        chatMessagesContainer.appendChild(messageDiv);
        // チャット履歴を強制的に表示（メッセージが追加されたら常に表示）
        console.log("[Atelier Preview] Showing chat history, chatHistory.length:", chatHistory.length);
        showChatHistory(true); // force = trueで強制表示
        // 最新のメッセージにスクロール
        setTimeout(()=>{
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, 100);
    };
    // 下部コントロールエリア（身長 + チャット）をグループ化
    const bottomControls = document.createElement("div");
    bottomControls.style.cssText = `
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  `;
    // スライダーエリア（身長調整）
    const sliderArea = document.createElement("div");
    sliderArea.style.cssText = `
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 12px;
  `;
    const sliderWrapper = document.createElement("div");
    sliderWrapper.style.cssText = `
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
    const sliderLabelRow = document.createElement("div");
    sliderLabelRow.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    line-height: 1.2;
    margin-bottom: 4px;
  `;
    const sliderLabel = document.createElement("label");
    sliderLabel.textContent = "身長";
    sliderLabel.style.cssText = `
    font-weight: 500;
    color: #000;
  `;
    const sliderValue = document.createElement("span");
    sliderValue.textContent = `${initialHeight}cm`;
    sliderValue.style.cssText = `
    color: #6b7280;
  `;
    sliderLabelRow.appendChild(sliderLabel);
    sliderLabelRow.appendChild(sliderValue);
    let sliderInstance = null;
    const slider = createHeightSlider(initialHeight, minHeight, maxHeight, (value)=>{
        sliderValue.textContent = `${value}cm`;
        onHeightChange?.(value);
    });
    sliderInstance = slider;
    sliderWrapper.appendChild(sliderLabelRow);
    sliderWrapper.appendChild(slider.element);
    sliderArea.appendChild(sliderWrapper);
    // 質問入力エリア（最下部）
    const messageArea = document.createElement("div");
    messageArea.style.cssText = `
    flex-shrink: 0;
    padding: 0 12px;
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
    const handleSend = async ()=>{
        const message = messageInput.value.trim();
        if (!message || !onMessageSend) return;
        // ユーザーメッセージを履歴に追加
        const userMessage = {
            role: "user",
            content: message,
            timestamp: Date.now()
        };
        addChatMessage(userMessage);
        messageInput.value = "";
        // 送信ボタンを無効化
        sendButton.disabled = true;
        sendButton.style.opacity = "0.5";
        sendButton.style.cursor = "not-allowed";
        try {
            // LLM APIを呼び出し
            const response = await onMessageSend(message);
            if (response) {
                // アシスタントのレスポンスを履歴に追加
                const assistantMessage = {
                    role: "assistant",
                    content: response,
                    timestamp: Date.now()
                };
                addChatMessage(assistantMessage);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            // エラーメッセージを表示
            const errorMessage = {
                role: "assistant",
                content: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
                timestamp: Date.now()
            };
            addChatMessage(errorMessage);
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
    // デバッグ用: Cmd+K (Mac) / Ctrl+K (Windows) でチャット履歴をトグル
    const handleDocumentKeyDown = (e)=>{
        // Cmd+K (Mac) または Ctrl+K (Windows/Linux)
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            if (chatHistoryArea.style.display === "flex" && chatHistoryArea.style.opacity === "1") {
                hideChatHistory();
            } else {
                showChatHistory(true); // 強制表示
            }
        }
    };
    document.addEventListener("keydown", handleDocumentKeyDown);
    messageForm.appendChild(messageInput);
    messageForm.appendChild(sendButton);
    messageArea.appendChild(messageForm);
    // キーボード表示検出（Visual Viewport API）
    let handleViewportChange = null;
    if (("TURBOPACK compile-time value", "object") !== "undefined" && window.visualViewport) {
        handleViewportChange = ()=>{
            const viewport = window.visualViewport;
            if (!viewport) return;
            // キーボードが表示されているか判定（ビューポートの高さが小さくなった場合）
            const keyboardHeight = window.innerHeight - viewport.height;
            const wasKeyboardVisible = isKeyboardVisible;
            isKeyboardVisible = keyboardHeight > 150; // 150px以上縮小したらキーボード表示と判定
            if (isKeyboardVisible && !wasKeyboardVisible) {
                // キーボードが表示された
                if (chatHistory.length > 0) {
                    showChatHistory();
                }
            } else if (!isKeyboardVisible && wasKeyboardVisible) {
                // キーボードが閉じられた
                // メッセージがある場合は表示を維持、ない場合は非表示
                if (chatHistory.length === 0) {
                    hideChatHistory();
                } else {
                    // レイアウトを調整（キーボード非表示時のサイズに）
                    viewerContainer.style.flex = "0.6";
                }
            }
        };
        window.visualViewport.addEventListener("resize", handleViewportChange);
        window.visualViewport.addEventListener("scroll", handleViewportChange);
        // フォーカスイベントでも検出（フォールバック）
        messageInput.addEventListener("focus", ()=>{
            setTimeout(()=>{
                if (window.visualViewport) {
                    const keyboardHeight = window.innerHeight - window.visualViewport.height;
                    if (keyboardHeight > 150) {
                        isKeyboardVisible = true;
                        if (chatHistory.length > 0) {
                            showChatHistory();
                        }
                    }
                }
            }, 300); // キーボード表示の遅延を考慮
        });
        messageInput.addEventListener("blur", ()=>{
            setTimeout(()=>{
                if (window.visualViewport) {
                    const keyboardHeight = window.innerHeight - window.visualViewport.height;
                    if (keyboardHeight < 100) {
                        isKeyboardVisible = false;
                        if (chatHistory.length === 0) {
                            hideChatHistory();
                        } else {
                            // メッセージがある場合は表示を維持
                            viewerContainer.style.flex = "0.6";
                        }
                    }
                }
            }, 300);
        });
    }
    // 下部コントロールに身長とチャットを追加
    bottomControls.appendChild(sliderArea);
    bottomControls.appendChild(messageArea);
    // 全要素を追加
    container.appendChild(sizeArea);
    container.appendChild(viewerContainer);
    container.appendChild(bottomControls);
    // 3Dビューアを初期化
    const viewerInstance = init3DViewer(viewerContainer, {
        glbUrl,
        textureUrl,
        onLoad: onModelLoad,
        onError: onModelError
    });
    // 作成した要素への参照を保持（destroy()で個別に削除するため）
    const createdElements = [
        sizeArea,
        viewerContainer,
        bottomControls
    ];
    return {
        updateGlbUrl (newGlbUrl) {
            viewerInstance.updateModel(newGlbUrl);
        },
        updateHeight (height) {
            if (sliderInstance) {
                sliderInstance.updateValue(height);
            }
            sliderValue.textContent = `${height}cm`;
        },
        updateSize (size) {
            currentSize = size;
            sizeLabel.textContent = size;
        },
        addChatMessage (message) {
            addChatMessage(message);
        },
        showChatHistory () {
            showChatHistory(true); // 強制表示
        },
        hideChatHistory () {
            hideChatHistory();
        },
        destroy () {
            // イベントリスナーを削除
            try {
                document.removeEventListener("keydown", handleDocumentKeyDown);
            } catch (error) {
                console.error("[Atelier Preview] Error removing document keydown listener:", error);
            }
            // Visual Viewport APIのイベントリスナーを削除
            try {
                if (("TURBOPACK compile-time value", "object") !== "undefined" && window.visualViewport && handleViewportChange) {
                    window.visualViewport.removeEventListener("resize", handleViewportChange);
                    window.visualViewport.removeEventListener("scroll", handleViewportChange);
                }
            } catch (error) {
                console.error("[Atelier Preview] Error removing viewport listeners:", error);
            }
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
/**
 * PreviewPanelのSliderThinと同じデザインのスライダー
 */ function createHeightSlider(initialValue, min, max, onChange) {
    let currentValue = Math.max(min, Math.min(max, initialValue));
    const sliderContainer = document.createElement("div");
    sliderContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
    touch-action: none;
  `;
    // Track（PreviewPanelのSliderThinと同じ: h-1 bg-secondary）
    const track = document.createElement("div");
    track.style.cssText = `
    position: relative;
    width: 100%;
    height: 1px;
    background: #e5e7eb;
    border-radius: 9999px;
    overflow: visible;
  `;
    // Range（PreviewPanelのSliderThinと同じ: bg-foreground）
    const range = document.createElement("div");
    range.style.cssText = `
    position: absolute;
    height: 100%;
    background: #000;
    left: 0;
    width: ${(currentValue - min) / (max - min) * 100}%;
    transition: width 0.1s;
  `;
    // Thumb（PreviewPanelのSliderThinと同じ: h-3 w-3 border-2 border-black bg-black）
    const thumb = document.createElement("div");
    thumb.style.cssText = `
    position: absolute;
    width: 12px;
    height: 12px;
    background: #000;
    border: 2px solid #000;
    border-radius: 50%;
    left: ${(currentValue - min) / (max - min) * 100}%;
    transform: translate(-50%, -50%);
    top: 50%;
    cursor: grab;
    transition: left 0.1s;
    z-index: 1;
    box-sizing: border-box;
  `;
    const updateSlider = (value, triggerCallback = true)=>{
        currentValue = Math.max(min, Math.min(max, value));
        const percent = (currentValue - min) / (max - min) * 100;
        range.style.width = `${percent}%`;
        thumb.style.left = `${percent}%`;
        if (triggerCallback) {
            onChange(currentValue);
        }
    };
    // マウスイベント
    thumb.addEventListener("mousedown", (e)=>{
        e.preventDefault();
        thumb.style.cursor = "grabbing";
        const handleMove = (e)=>{
            const rect = track.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const percent = x / rect.width;
            const newValue = Math.round(min + percent * (max - min));
            updateSlider(newValue);
        };
        const handleUp = ()=>{
            thumb.style.cursor = "grab";
            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("mouseup", handleUp);
        };
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
    });
    // タッチイベント
    thumb.addEventListener("touchstart", (e)=>{
        e.preventDefault();
        const touch = e.touches[0];
        const handleMove = (e)=>{
            const rect = track.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.touches[0].clientX - rect.left));
            const percent = x / rect.width;
            const newValue = Math.round(min + percent * (max - min));
            updateSlider(newValue);
        };
        const handleEnd = ()=>{
            document.removeEventListener("touchmove", handleMove);
            document.removeEventListener("touchend", handleEnd);
        };
        document.addEventListener("touchmove", handleMove);
        document.addEventListener("touchend", handleEnd);
    });
    track.appendChild(range);
    track.appendChild(thumb);
    sliderContainer.appendChild(track);
    return {
        updateValue (value) {
            updateSlider(value, false); // 外部からの更新時はコールバックを呼ばない
        },
        element: sliderContainer
    };
}
function init3DViewer(container, options) {
    const { glbUrl, textureUrl, onLoad, onError } = options;
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
    // Scene setup（背景なし、透明）
    const scene = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Scene"]();
    scene.background = null; // 背景なし（透明）
    // Camera（PreviewPanelのModelViewerと同じ: position: [0, 0, 5], fov: 50）
    const camera = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PerspectiveCamera"](50, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    // Renderer（背景透明）
    const renderer = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WebGLRenderer"]({
        antialias: true,
        alpha: true
    });
    renderer.setSize(initialWidth, initialHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0); // 背景を透明にする
    const canvasElement = renderer.domElement;
    canvasElement.style.touchAction = "none"; // タッチイベントを有効化
    container.appendChild(canvasElement);
    // Lights（PreviewPanelのModelViewerと同じ）
    const ambientLight = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AmbientLight"](0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight1 = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DirectionalLight"](0xffffff, 1.5);
    directionalLight1.position.set(10, 10, 5);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);
    const directionalLight2 = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DirectionalLight"](0xffffff, 0.8);
    directionalLight2.position.set(-10, -10, -5);
    scene.add(directionalLight2);
    const directionalLight3 = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DirectionalLight"](0xffffff, 0.5);
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
        // Rotate camera around the model（OrbitControlsと同じロジック）
        const spherical = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Spherical"]();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi -= deltaY * 0.01; // 上にドラッグ→カメラが下を向く（phiを増やす）= モデルが上に見える
        // minPolarAngle, maxPolarAngleの制約を適用
        spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));
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
        const spherical = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Spherical"]();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi -= deltaY * 0.01; // 上にドラッグ→カメラが下を向く（phiを増やす）= モデルが上に見える
        spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));
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
    // Load model
    let currentModel = null;
    const loader = new __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GLTFLoader"]();
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
        loader.load(url, (gltf)=>{
            console.log("[Atelier Preview] 3D model loaded successfully:", url);
            currentModel = gltf.scene;
            // PreviewPanelのModelViewerと同じ: scale: [3.5, 3.5, 3.5], rotation: [0, -Math.PI / 2, 0]
            currentModel.scale.set(3.5, 3.5, 3.5);
            currentModel.rotation.y = -Math.PI / 2;
            scene.add(currentModel);
            // 成功したらメッセージを削除（安全な方法）
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
            onLoad?.();
        }, undefined, (error)=>{
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
        });
    }
    // Load initial model
    loadModel(glbUrl);
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
        updateModel (newGlbUrl) {
            loadModel(newGlbUrl);
        },
        destroy () {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
            if (currentModel) {
                scene.remove(currentModel);
            }
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/packages/preview/src/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Preview panel exports
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$preview$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/preview.ts [app-client] (ecmascript)");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authenticatedFetch",
    ()=>authenticatedFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/supabase/client.ts [app-client] (ecmascript)");
"use client";
;
async function authenticatedFetch(url, options = {}) {
    try {
        console.log("[authenticatedFetch] Starting, url:", url);
        console.log("[authenticatedFetch] Getting session...");
        const { data: { session }, error: sessionError } = await __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PreviewPanel",
    ()=>PreviewPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/atelier/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/ProductSelectionContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$products$2f$useAssets$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/features/products/useAssets.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$preview$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/packages/preview/src/preview.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/lib/auth/api-client.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
function PreviewPanel({ selectedProduct, selectedSize }) {
    _s();
    const { togglePreview } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductSelection"])();
    const { shopId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [height, setHeight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(170);
    const [currentSize, setCurrentSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(selectedSize || "M");
    const { data: assets = [] } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$products$2f$useAssets$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssets"])(selectedProduct?.id);
    const previewContainerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const previewInstanceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [isSendingMessage, setIsSendingMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const conversationIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const sessionIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    // 選択されたサイズに応じたアセットの最新バージョンを取得
    const selectedAsset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PreviewPanel.useMemo[selectedAsset]": ()=>{
            if (assets.length === 0) {
                // アセットがない場合はnullを返す（モックデータは使用しない）
                return null;
            }
            // 現在選択されているサイズのアセットをフィルタ
            const sizeAssets = assets.filter({
                "PreviewPanel.useMemo[selectedAsset].sizeAssets": (asset)=>asset.size === currentSize && asset.isActive !== false
            }["PreviewPanel.useMemo[selectedAsset].sizeAssets"]).sort({
                "PreviewPanel.useMemo[selectedAsset].sizeAssets": (a, b)=>b.version - a.version
            }["PreviewPanel.useMemo[selectedAsset].sizeAssets"]);
            // 該当サイズのアセットがない場合、他のサイズから最新のものを取得
            if (sizeAssets.length === 0) {
                const allAssets = assets.filter({
                    "PreviewPanel.useMemo[selectedAsset].allAssets": (asset)=>asset.isActive !== false
                }["PreviewPanel.useMemo[selectedAsset].allAssets"]).sort({
                    "PreviewPanel.useMemo[selectedAsset].allAssets": (a, b)=>b.version - a.version
                }["PreviewPanel.useMemo[selectedAsset].allAssets"]);
                return allAssets.length > 0 ? allAssets[0] : null;
            }
            return sizeAssets[0];
        }
    }["PreviewPanel.useMemo[selectedAsset]"], [
        assets,
        currentSize
    ]);
    // 利用可能なサイズを取得（アセットから動的に取得）
    const availableSizes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PreviewPanel.useMemo[availableSizes]": ()=>{
            const sizes = new Set();
            assets.forEach({
                "PreviewPanel.useMemo[availableSizes]": (asset)=>{
                    if (asset.isActive !== false) {
                        sizes.add(asset.size);
                    }
                }
            }["PreviewPanel.useMemo[availableSizes]"]);
            // アセットがない場合はデフォルトサイズを返す
            return sizes.size > 0 ? Array.from(sizes).sort() : [
                "S",
                "M",
                "L"
            ];
        }
    }["PreviewPanel.useMemo[availableSizes]"], [
        assets
    ]);
    // Vanilla JSのプレビューパネルを初期化
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PreviewPanel.useEffect": ()=>{
            if (!previewContainerRef.current) return;
            console.log("[PreviewPanel] Initializing preview panel:", {
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
            if (!selectedAsset?.glbUrl) {
                console.warn("[PreviewPanel] No asset available, skipping initialization");
                return;
            }
            // 新しいインスタンスを初期化
            const instance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$packages$2f$preview$2f$src$2f$preview$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initPreviewPanel"])({
                container: previewContainerRef.current,
                glbUrl: selectedAsset.glbUrl,
                textureUrl: selectedProduct?.previewImageUrl,
                initialHeight: height,
                minHeight: 150,
                maxHeight: 190,
                availableSizes: availableSizes,
                initialSize: currentSize,
                onSizeChange: {
                    "PreviewPanel.useEffect.instance": (newSize)=>{
                        setCurrentSize(newSize);
                    }
                }["PreviewPanel.useEffect.instance"],
                onHeightChange: {
                    "PreviewPanel.useEffect.instance": (newHeight)=>{
                        setHeight(newHeight);
                    }
                }["PreviewPanel.useEffect.instance"],
                onMessageSend: {
                    "PreviewPanel.useEffect.instance": async (message)=>{
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
                            const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$lib$2f$auth$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authenticatedFetch"])("/api/chat", {
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
                    }
                }["PreviewPanel.useEffect.instance"],
                onModelLoad: {
                    "PreviewPanel.useEffect.instance": ()=>{
                        console.log("[PreviewPanel] 3D model loaded:", selectedAsset.glbUrl);
                    }
                }["PreviewPanel.useEffect.instance"],
                onModelError: {
                    "PreviewPanel.useEffect.instance": (error)=>{
                        console.error("[PreviewPanel] Failed to load 3D model:", error, selectedAsset.glbUrl);
                    }
                }["PreviewPanel.useEffect.instance"]
            });
            previewInstanceRef.current = instance;
            // クリーンアップ
            return ({
                "PreviewPanel.useEffect": ()=>{
                    if (previewInstanceRef.current) {
                        try {
                            previewInstanceRef.current.destroy();
                        } catch (error) {
                            console.error("[PreviewPanel] Error destroying preview instance:", error);
                        } finally{
                            previewInstanceRef.current = null;
                        }
                    }
                }
            })["PreviewPanel.useEffect"];
        // 依存配列を最小限に（isSendingMessageは削除 - コールバック内で最新の値を取得）
        // availableSizesはuseMemoでメモ化されているので、参照が変わったときだけ再初期化される
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["PreviewPanel.useEffect"], [
        selectedAsset?.glbUrl,
        selectedProduct?.previewImageUrl,
        availableSizes,
        currentSize,
        height
    ]);
    // サイズが変更されたときに、対応するアセットのGLB URLを更新
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PreviewPanel.useEffect": ()=>{
            if (previewInstanceRef.current && selectedAsset?.glbUrl) {
                previewInstanceRef.current.updateGlbUrl(selectedAsset.glbUrl);
            }
        }
    }["PreviewPanel.useEffect"], [
        selectedAsset?.glbUrl,
        currentSize
    ]);
    // 身長が変更されたときに更新
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PreviewPanel.useEffect": ()=>{
            if (previewInstanceRef.current) {
                previewInstanceRef.current.updateHeight(height);
            }
        }
    }["PreviewPanel.useEffect"], [
        height
    ]);
    // Enterキーでモーダルが閉じるのを防ぐ（ネイティブイベントリスナー）
    const rootRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PreviewPanel.useEffect": ()=>{
            const handleKeyDown = {
                "PreviewPanel.useEffect.handleKeyDown": (e)=>{
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
                }
            }["PreviewPanel.useEffect.handleKeyDown"];
            const rootElement = rootRef.current;
            if (rootElement) {
                // captureフェーズとbubbleフェーズの両方でイベントをキャッチ
                rootElement.addEventListener("keydown", handleKeyDown, true);
                rootElement.addEventListener("keydown", handleKeyDown, false);
            }
            return ({
                "PreviewPanel.useEffect": ()=>{
                    if (rootElement) {
                        rootElement.removeEventListener("keydown", handleKeyDown, true);
                        rootElement.removeEventListener("keydown", handleKeyDown, false);
                    }
                }
            })["PreviewPanel.useEffect"];
        }
    }["PreviewPanel.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-6 pt-6 pb-4 flex items-center justify-between border-b bg-white",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-semibold",
                        children: "プレビュー"
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                        lineNumber: 297,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: togglePreview,
                        className: "rounded-lg p-1.5 hover:bg-gray-100 transition-colors",
                        "aria-label": "プレビューを閉じる",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                            lineNumber: 303,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                        lineNumber: 298,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 296,
                columnNumber: 7
            }, this),
            selectedProduct && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-6 py-3 text-sm text-gray-600 border-b bg-gray-50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "font-medium",
                    children: selectedProduct.name
                }, void 0, false, {
                    fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                    lineNumber: 310,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 309,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex items-center justify-center p-6 bg-gray-100 overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col relative overflow-hidden",
                    style: {
                        width: '300px',
                        height: '600px',
                        border: '3px solid black',
                        borderRadius: '16px',
                        background: 'white'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 flex flex-col relative overflow-hidden",
                        style: {
                            padding: '24px 4px',
                            boxSizing: 'border-box'
                        },
                        children: selectedAsset?.glbUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: previewContainerRef,
                            className: "flex-1 flex flex-col overflow-hidden",
                            style: {
                                minHeight: 0
                            }
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                            lineNumber: 339,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 flex items-center justify-center text-gray-400",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-medium mb-1",
                                        children: "アセットがありません"
                                    }, void 0, false, {
                                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                                        lineNumber: 349,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs",
                                        children: "アセット管理から3Dモデルを追加してください"
                                    }, void 0, false, {
                                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                                        lineNumber: 350,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                                lineNumber: 348,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                            lineNumber: 347,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                        lineNumber: 330,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                    lineNumber: 319,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
                lineNumber: 315,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx",
        lineNumber: 272,
        columnNumber: 5
    }, this);
}
_s(PreviewPanel, "nKF8w0qfjlc032EPF72XiPdNOU0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductSelection"],
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$products$2f$useAssets$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssets"]
    ];
});
_c = PreviewPanel;
var _c;
__turbopack_context__.k.register(_c, "PreviewPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/atelier/apps/console/src/app/database/layout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DatabaseLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$components$2f$sidebar$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/components/sidebar/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/contexts/ProductSelectionContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$preview$2f$PreviewPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/atelier/apps/console/src/features/preview/PreviewPanel.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function DatabaseLayoutContent({ children }) {
    _s();
    const { isPreviewOpen, selectedProduct, selectedSize } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductSelection"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-screen overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$components$2f$sidebar$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: `overflow-y-auto bg-gray-50 p-6 transition-all duration-300 ease-in-out ${isPreviewOpen ? "flex-1 mr-96" : "flex-1"}`,
                children: children
            }, void 0, false, {
                fileName: "[project]/atelier/apps/console/src/app/database/layout.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `fixed right-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out ${isPreviewOpen ? "translate-x-0" : "translate-x-full"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$features$2f$preview$2f$PreviewPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PreviewPanel"], {
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
_s(DatabaseLayoutContent, "rrND56V9b8DIzlTiOnCf4fIrKpI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductSelection"]
    ];
});
_c = DatabaseLayoutContent;
function DatabaseLayout({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$apps$2f$console$2f$src$2f$contexts$2f$ProductSelectionContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProductSelectionProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$atelier$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DatabaseLayoutContent, {
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
_c1 = DatabaseLayout;
var _c, _c1;
__turbopack_context__.k.register(_c, "DatabaseLayoutContent");
__turbopack_context__.k.register(_c1, "DatabaseLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=atelier_1e6eae0b._.js.map