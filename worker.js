export default {
    async fetch(request, env) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        };

        // 處理 CORS Preflight 要求
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        // 只允許 POST 請求
        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        try {
            // 讀取傳進來的 body (預計格式: { text: "你好", dialect: "四縣腔" })
            const requestBody = await request.clone().json();
            const sourceText = requestBody.text || "";
            const dialect = requestBody.dialect || "四縣腔"; // 決定取哪一種拼音

            if (!sourceText.trim()) {
                return new Response(JSON.stringify({ result: "" }), {
                    status: 200,
                    headers: new Headers({
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json"
                    })
                });
            }

            let translated = "";
            const chars = Array.from(sourceText);

            // 由於多數免費 API 不支援整段語意翻譯，
            // 這裡使用萌典 (moedict) 的客家語 API 進行逐字/詞查詢。
            for (let i = 0; i < chars.length; i++) {
                let char = chars[i];

                // 跳過標點符號不翻譯
                if (/[，。！？、\s]/.test(char)) {
                    translated += char;
                    continue;
                }

                try {
                    // 向萌典客語辭泉發出請求
                    const moedictUrl = "https://www.moedict.tw/h/" + encodeURIComponent(char) + ".json";
                    const moedictRes = await fetch(moedictUrl);

                    if (moedictRes.ok) {
                        const data = await moedictRes.json();
                        // 解析客語拼音 (p 欄位中包含四縣與海陸)
                        // 資料結構為： data.h[0].p ("四⃞tien²⁴ 海⃞tien⁵³")
                        if (data && data.h && data.h.length > 0 && data.h[0].p) {
                            const pinyinStr = data.h[0].p;
                            // 簡易擷取對應腔調的拼音
                            let matchPinyin = "";
                            if (dialect.includes("四縣") || dialect.includes("sixian")) {
                                const match = pinyinStr.match(/四⃞([^ ]+)/);
                                if (match) matchPinyin = match[1];
                            } else {
                                const match = pinyinStr.match(/海⃞([^ ]+)/);
                                if (match) matchPinyin = match[1];
                            }

                            if (matchPinyin) {
                                // 格式化為：漢字拼音 (不加括號)
                                translated += char + matchPinyin + " ";
                            } else {
                                // 若無拼音資料則保留原字並加空白
                                translated += char + " ";
                            }
                        } else {
                            // 若無資料則保留原字並加空白
                            translated += char + " ";
                        }
                    } else {
                        translated += char + " ";
                    }
                } catch (e) {
                    translated += char + " ";
                }
            }

            const responseData = JSON.stringify({ result: sourceText + "\n" + translated.trim() });

            // 建構帶有正確 CORS 標頭的回傳
            const newHeaders = new Headers(corsHeaders);
            newHeaders.set("Content-Type", "application/json");

            return new Response(responseData, {
                status: 200,
                headers: newHeaders,
            });
        } catch (error) {
            const errorHeaders = new Headers(corsHeaders);
            errorHeaders.set("Content-Type", "application/json");

            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: errorHeaders
            });
        }
    }
};
