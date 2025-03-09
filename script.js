function sortBibliography() {
    let inputText = document.getElementById("input").value;
    let type = document.getElementById("typeSelect").value;
    
    let entries = inputText.split("\n\n").map(block => block.split(" / ").map(part => part.trim()));
    
    let parsedEntries = entries.map(parseEntry);
    
    parsedEntries.sort((a, b) => {
        let yearA = a.year || "0000"; // ใส่ค่าเริ่มต้น ถ้าไม่มีปี
        let yearB = b.year || "0000";
        return (
            yearB.localeCompare(yearA, 'th', { numeric: true }) ||
            a.author.localeCompare(b.author, 'th') ||
            a.title.localeCompare(b.title, 'th')
        );
    });
    
    let formattedEntries = parsedEntries.map(e => formatEntry(e, type));
    
    document.getElementById("output").innerHTML = formattedEntries.join("<br>\n");
}

function parseEntry(parts) {
    let entry = {
        author: (isNaN(parts[0]) && !parts[0].includes("สำนักพิมพ์")) ? parts[0] : "",  // ✅ ห้ามใส่ "สำนักพิมพ์" เป็นผู้แต่ง
        year: !isNaN(parts[1]) ? parts[1] : "",   // ✅ ต้องเป็นตัวเลขเท่านั้น
        title: parts.find((p, i) => i > 1 && !p.includes("มหาวิทยาลัย")) || "", // ✅ กันไม่ให้ชื่อมหาวิทยาลัยไปอยู่ใน title
        journal: parts[3] || "",  // ✅ ชื่อวารสาร
        pages: parts[4] || "",
        volume: parts.find(p => /ฉบับที่/.test(p)) || "",   // ✅ ฉบับที่volume: parts.find(p => /ฉบับที่/.test(p)) || "",
        issue: parts[7] || "",    // ✅ เลขที่
        url: parts.find(p => p.startsWith("http") || p.includes("www.")) || "", // ✅ ดึง URL หรือเว็บไซต์
        editor: "",
        bookTitle: "",
        edition: parts.find(p => /^ครั้งที่ \d+$/.test(p)) || "",
        publisher: parts.find(p => /สำนักพิมพ์/.test(p)) || "",
        university: parts.find(p => p.includes("มหาวิทยาลัย")) || "",
        thesisType: parts[9] || "",
        website: parts.find(p => p.startsWith("http") || p.includes("www.")) || "", // ✅ ดึงเว็บไซต์
        place: parts.find(p => isProvince(p)) || ""
    };

    console.log("Parsed Entry:", entry); // ✅ Debugging
    
    // ✅ เพิ่ม: ตรวจจับชื่อบรรณาธิการและชื่อหนังสือ (ถ้ามี "(บ.ก.)")
    let editorIndex = parts.findIndex(p => p.includes("(บ.ก.)"));
    if (editorIndex !== -1 && editorIndex + 1 < parts.length) {
        entry.editor = parts[editorIndex].replace("(บ.ก.)", "").trim();
        entry.bookTitle = parts[editorIndex + 1].trim();
    }

    // ✅ เพิ่ม: ตรวจหาหมายเลขหน้า "(น./xx-xxx)"
    let pagesIndex = parts.findIndex(p => /\(น\.\d+[-–]\d+\)/.test(p));
    if (pagesIndex !== -1) {
        entry.pages = parts[pagesIndex];
    }

    // ✅ เพิ่ม: ตรวจหาสำนักพิมพ์ (ต้องไม่ใช่หมายเลขหน้า)
    let publisherIndex = parts.findIndex(p => /สำนักพิมพ์/.test(p) && p !== entry.pages);
    if (publisherIndex !== -1) {
        entry.publisher = parts[publisherIndex];
        
    }

    return entry;
}

function formatEntry(e, type) {
    let formatted = "";
    switch (type) {
        case "book":
            return `${e.author ? e.author + ". " : ""}(${e.year}). <i>${e.title}</i>${e.edition ? " (" + e.edition + ")" : ""}. ${e.publisher}.`;
        case "articleInBook":
            return `${e.author}. (${e.year}). ${e.title}. ใน ${e.editor} (บ.ก.), <i>${e.bookTitle}</i> ${e.pages}. ${e.publisher}.`;
        case "thesis":
            return `${e.author}. (${e.year}). ${e.title} [${e.university}]. ${e.website || e.url}`;
        case "website":
            return `${e.author}. (${e.year}). ${e.title}. ${e.website || e.url}`;
        case "journalOnline":
            return `${e.author}. (${e.year}). ${e.title}. <i>${e.journal || "❌ ไม่มีชื่อวารสาร"}</i>, ${e.volume || "❌ ไม่มีฉบับที่"}, ${e.pages}. สืบค้นจาก ${e.url || "❌ ไม่มี URL"}`;
        default:
            return `${e.author}. (${e.year}). ${e.title}.`;
    }
    console.log("📌 Formatted Entry:", formatted); // ✅ Debugging ตรวจสอบค่าหลังจัดรูปแบบ
    return formatted;
}

function isProvince(text) {
    let provinces = ["กรุงเทพฯ", "เชียงใหม่", "นนทบุรี", "ขอนแก่น", "ภูเก็ต", "ระยอง", "ชลบุรี", "นครราชสีมา"];
    return provinces.includes(text.replace(/\s+/g, ""));
}

function normalizeText(text) {
    return text.replace(/(\d{4})\s*$/gm, "$1 /")
               .replace(/ส\s*านักพิมพ์/g, "สำนักพิมพ์")
               .replace(/ขั\s*้น/g, "ขั้น")
               .replace(/ครั\s*้ง/g, "ครั้ง")
               .replace(/มหาวิทยาล\s*ยั/g, "มหาวิทยาลัย")
               .replace(/เรียนร\s*ู้/g, "เรียนรู้")
               .trim();
}

function processPDF(event) {
    let file = event.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = function () {
            let typedarray = new Uint8Array(reader.result);
            pdfjsLib.getDocument(typedarray).promise.then(async function (pdf) {
                let pagesText = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    let page = await pdf.getPage(i);
                    let textContent = await page.getTextContent();
                    let items = textContent.items.map(item => item.str.trim());
                    let pageText = normalizeText(items.join("\n"));
                    pagesText.push(pageText);
                }
                document.getElementById("input").value = pagesText.join("\n\n");
            }).catch(error => {
                console.error("เกิดข้อผิดพลาดในการอ่าน PDF:", error);
            });
        };
    }
}

document.getElementById("pdfInput").addEventListener("change", processPDF);

function copyToClipboard() {
    let outputText = document.getElementById("output").innerText;
    navigator.clipboard.writeText(outputText).then(() => {
        alert("คัดลอกข้อมูลเรียบร้อย!");
    });
}
