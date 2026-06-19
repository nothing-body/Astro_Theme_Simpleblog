---
title: 'Zig：一門拒絕藏東西的系統程式語言'
pubDate: 2026-05-15
description: 'Zig 是一門以「誠實」為核心設計哲學的系統程式語言，沒有隱藏的控制流、沒有隱藏的記憶體分配，更沒有預處理器。'
category: '軟體'
tags: ['Zig', '程式語言']
---

在系統程式語言的世界裡，C 語言稱霸了半個世紀。C++ 試圖在其之上加入更多抽象，Rust 則用嚴格的型別系統強制記憶體安全。而 **Zig**，選擇了一條截然不同的路——它不加東西，而是把不必要的東西拿掉。

## Zig 是什麼？

[Zig](https://ziglang.org/) 是由 **Andrew Kelley** 於 2015 年創建的開源系統程式語言。它的目標是成為 C 語言的現代替代品，提供同等的效能與底層控制能力，同時消除 C 語言中那些讓人頭痛的隱性行為與未定義行為（Undefined Behavior）。

截至 2026 年，Zig 仍是 pre-1.0 的狀態，由 [Zig Software Foundation](https://ziglang.org/zsf/) 推動開發，並持續朝向穩定的 1.0 版本邁進。

## 核心設計哲學：沒有藏東西

Zig 的哲學可以用一句話概括：**「如果程式碼看起來沒做某件事，那它就真的沒做。」**

這意味著：

- **沒有隱藏的控制流（No hidden control flow）**：Zig 沒有例外（exceptions）、沒有運算子重載（operator overloading）、沒有隱藏的解構函式（destructors）。函式就是函式，呼叫就是呼叫。
- **沒有隱藏的記憶體分配（No hidden allocations）**：標準函式庫中任何需要配置記憶體的函式，都需要你明確傳入一個 `Allocator`。你永遠清楚記憶體從哪裡來。
- **沒有預處理器（No preprocessor）**：C 的 `#define`、`#ifdef` 這類預處理器巨集（macro）在 Zig 中不存在。Zig 用一個更強大的機制取代它——`comptime`。

## 核心特性深度解析

### comptime：比巨集更強大的編譯期執行

`comptime` 是 Zig 最具代表性的特性之一。它允許你在**編譯期執行普通的 Zig 程式碼**，用來實現泛型（generics）、元程式設計（metaprogramming）和程式碼生成，完全不需要一套獨立的巨集語言。

```zig
// 一個在編譯期就能計算出正確型別的泛型函式
fn max(comptime T: type, a: T, b: T) T {
    return if (a > b) a else b;
}

pub fn main() void {
    // 編譯器在編譯期就確定了 T = i32
    const result = max(i32, 10, 20);
    _ = result;
}
```

這種方式比 C++ 的模板（templates）更直覺，也比 Rust 的巨集更容易理解。

### 明確的記憶體管理

Zig 沒有垃圾回收器（GC），記憶體由程式設計師全權掌控。但與 C 不同的是，Zig 透過 **Allocator 介面**讓這一切變得更明確與可測試。

```zig
const std = @import("std");

pub fn main() !void {
    // 明確選擇使用哪種分配器
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit(); // 確保離開時自動清理並偵測記憶體洩漏

    const allocator = gpa.allocator();

    // 分配記憶體
    const buf = try allocator.alloc(u8, 100);
    defer allocator.free(buf); // 明確釋放

    std.debug.print("已配置 {} 個位元組\n", .{buf.len});
}
```

`GeneralPurposeAllocator` 甚至內建記憶體洩漏偵測功能，在開發期間非常實用。

### 無縫的 C 語言互通

Zig 可以直接 `@import` C 語言的標頭檔，無需任何 FFI 綁定，也可以直接編譯 C 程式碼。這讓 Zig 成為**漸進式替換老舊 C 程式碼**的理想工具。

```zig
const c = @cImport({
    @cInclude("stdio.h");
});

pub fn main() void {
    // 直接呼叫 C 標準函式庫的 printf
    _ = c.printf("Hello from C, called via Zig!\n");
}
```

### 一流的交叉編譯（Cross-compilation）

Zig 的編譯器內建了對幾乎所有主流目標平台的交叉編譯支援，不需要額外安裝工具鏈。這不只是 Zig 程式碼的優勢——Zig 本身也可以作為一個 **C/C++ 編譯器**使用（`zig cc`），讓許多現有的 C 專案也能受益。

```bash
# 在 macOS 上交叉編譯給 Linux x86_64 的二進位檔
zig build-exe main.zig -target x86_64-linux-musl
```

### 錯誤處理：可聯集的錯誤型別

Zig 沒有例外機制，而是用**錯誤聯集型別（Error Union Types）**來處理錯誤。這讓錯誤處理變得明確且不可忽略。

```zig
const MyError = error{
    FileNotFound,
    PermissionDenied,
};

// 回傳型別 !u8 表示「可能是 MyError，也可能是 u8」
fn readByte(path: []const u8) MyError!u8 {
    if (path.len == 0) return MyError.FileNotFound;
    return 42;
}
```

`try` 關鍵字等同於 `catch |err| return err`，讓錯誤自動向上傳遞，簡潔又明確。

## Zig 適合誰？

| 情境                     | 適合度     |
| ------------------------ | ---------- |
| 取代 C 的系統工具開發    | ⭐⭐⭐⭐⭐ |
| 嵌入式系統與韌體         | ⭐⭐⭐⭐⭐ |
| 漸進式替換 C 舊程式碼    | ⭐⭐⭐⭐⭐ |
| 需要精細控制效能的場景   | ⭐⭐⭐⭐⭐ |
| 一般應用程式開發         | ⭐⭐       |
| 需要成熟生態系的商業專案 | ⭐⭐       |

## 2026 年的 Zig 現狀

2026 年 4 月釋出的 **Zig 0.16** 帶來了重大改進，包括重新設計的 `std.Io` 介面，支援執行緒式與事件驅動（如 `io_uring`）兩種後端，有效解決了非同步程式設計中的「函式顏色問題」（function coloring）。

Zig 仍是 pre-1.0 語言，這意味著**每個版本都可能有破壞性變更**。如果你打算將 Zig 用於重要的商業專案，必須將此納入維護成本的考量。

## 小結

Zig 不是一門試圖讓你「寫起來更爽」的語言，它是一門試圖讓你**對程式碼發生的事情瞭若指掌**的語言。它的誠實哲學在業界獨樹一幟：沒有魔法、沒有隱藏成本、沒有「方便但危險」的快捷方式。
