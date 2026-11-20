import { supabase, isSupabaseConfigured } from "./supabase";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]);

export async function extractDocumentText(file) {
  if (!file || file.size > MAX_FILE_BYTES) throw new Error("Choose a file smaller than 15 MB.");
  if (!ACCEPTED.has(file.type) && !/\.(pdf|docx|txt)$/i.test(file.name)) throw new Error("Supported formats: PDF, DOCX and TXT.");
  if (/\.txt$/i.test(file.name) || file.type === "text/plain") return file.text();
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => item.str).join(" "));
    }
    return pages.join("\n\n");
  }
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

export async function uploadPrivateDocument(file) {
  if (!isSupabaseConfigured) throw new Error("Connect Supabase before uploading to cloud storage.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in before uploading.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Maximum file size is 15 MB.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { data, error } = await supabase.storage.from("user-documents").upload(path, file, { upsert: false });
  if (error) throw error;
  return data;
}

export async function exportPdf(title, content) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text(title, 48, 56);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(content, 500);
  let y = 82;
  for (const line of lines) { if (y > 790) { pdf.addPage(); y = 48; } pdf.text(line, 48, y); y += 14; }
  pdf.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g,"-") || "academia-document"}.pdf`);
}

export async function exportDocx(title, content) {
  const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    ...content.split("\n").map(line => new Paragraph(line)),
    new Paragraph({ text: "Created & Developed By Sirajul Islam" }),
  ] }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = "academia-studio-document.docx"; a.click(); URL.revokeObjectURL(url);
}

export async function exportPptx(title, content) {
  const pptxgen = (await import("pptxgenjs")).default;
  const pptx = new pptxgen(); pptx.layout = "LAYOUT_WIDE"; pptx.author = "Sirajul Islam";
  const chunks = content.split(/\n(?=Slide\s+\d+\s*[—-])/i).filter(Boolean);
  for (let i=0; i<Math.max(1,chunks.length); i++) {
    const slide = pptx.addSlide();
    if (i===0) { slide.addText(title,{x:.7,y:.55,w:11.5,h:.8,fontSize:28,bold:true,color:"1B2A4A"}); slide.addText("Created & Developed By Sirajul Islam",{x:.75,y:1.45,w:10,h:.3,fontSize:10,color:"68748C"}); }
    const body = chunks[i] || content;
    slide.addText(body,{x:.8,y:i===0?2:0.8,w:11.2,h:5.7,fontSize:18,breakLine:false,bullet:{indent:18},color:"273653",fit:"shrink"});
  }
  await pptx.writeFile({ fileName: "academia-studio-presentation.pptx" });
}
