import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "fs/promises";
import path from "path";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: subject } = await sb.from("subjects").select("id").eq("slug","math").maybeSingle();
if (!subject) { console.error("no math subject"); process.exit(1); }
console.log("math subject", subject.id);

const books = [
  { dir: "/tmp/pages1", pdf: "/tmp/book2.pdf", title: "Математика. 3 класс. Часть 1", author: "М. И. Моро и др.", sort: 1, key: "moro-3-p1" },
  { dir: "/tmp/pages2", pdf: "/tmp/book1.pdf", title: "Математика. 3 класс. Часть 2", author: "М. И. Моро и др.", sort: 2, key: "moro-3-p2" },
];

for (const b of books) {
  // upsert book by title+subject
  let { data: existing } = await sb.from("books").select("id").eq("subject_id", subject.id).eq("title", b.title).maybeSingle();
  let bookId = existing?.id;
  if (!bookId) {
    const ins = await sb.from("books").insert({
      subject_id: subject.id, title: b.title, author: b.author, type: "textbook", grade: 3, sort_order: b.sort, pages_count: 113
    }).select("id").single();
    if (ins.error) { console.error(ins.error); process.exit(1); }
    bookId = ins.data.id;
  } else {
    await sb.from("books").update({ pages_count: 113, author: b.author }).eq("id", bookId);
  }
  console.log("book", b.title, bookId);

  // upload PDF
  const pdfBuf = await readFile(b.pdf);
  await sb.storage.from("textbooks").upload(`${b.key}.pdf`, pdfBuf, { upsert: true, contentType: "application/pdf" });

  // upload jpgs + create book_pages rows
  const files = (await readdir(b.dir)).filter(f => f.endsWith(".jpg")).sort();
  console.log("uploading", files.length, "pages");
  const rows = [];
  let i = 0;
  for (const f of files) {
    i++;
    const pageNum = parseInt(f.match(/p-(\d+)\.jpg/)[1], 10);
    const buf = await readFile(path.join(b.dir, f));
    const key = `${bookId}/p-${String(pageNum).padStart(3,"0")}.jpg`;
    const up = await sb.storage.from("textbook-pages").upload(key, buf, { upsert: true, contentType: "image/jpeg" });
    if (up.error) { console.error("upload err", key, up.error.message); }
    const pub = sb.storage.from("textbook-pages").getPublicUrl(key).data.publicUrl;
    let ocrText = "";
    try { ocrText = (await readFile(path.join(b.dir, f.replace(".jpg",".txt")), "utf8")).trim().slice(0, 8000); } catch {}
    rows.push({ book_id: bookId, page_number: pageNum, image_url: pub, ocr_text: ocrText || null });
    if (i % 20 === 0) console.log(" ", i, "/", files.length);
  }
  // batch upsert
  for (let j = 0; j < rows.length; j += 50) {
    const slice = rows.slice(j, j+50);
    const { error } = await sb.from("book_pages").upsert(slice, { onConflict: "book_id,page_number" });
    if (error) { console.error("rows err", error.message); process.exit(1); }
  }
  console.log("✔ pages saved");

  // Create lessons: 1 lesson per 2-page spread starting from page 5 (skip cover + title pages)
  const startPage = 5;
  const lastPage = 113;
  const lessons = [];
  let lessonNum = 1;
  for (let p = startPage; p <= lastPage; p += 2) {
    const to = Math.min(p + 1, lastPage);
    // get short title from OCR of first page (first non-empty line under 80 chars)
    let title = `Урок ${lessonNum}`;
    try {
      const txt = (await readFile(path.join(b.dir, `p-${String(p).padStart(3,"0")}.txt`), "utf8"))
        .split("\n").map(s => s.trim()).filter(s => s && s.length < 80 && /[А-Яа-я]/.test(s));
      if (txt[0]) title = `${lessonNum}. ${txt[0].replace(/[®©*]/g,"").slice(0, 60)}`;
    } catch {}
    lessons.push({
      subject_id: subject.id, book_id: bookId, number: lessonNum,
      slug: `${b.key}-l${lessonNum}`, title,
      summary: `Страницы ${p}–${to} учебника`,
      page_from: p, page_to: to, sort_order: lessonNum,
    });
    lessonNum++;
  }
  // wipe old auto-lessons for this book then insert
  await sb.from("lessons").delete().eq("book_id", bookId);
  for (let j = 0; j < lessons.length; j += 50) {
    const { error } = await sb.from("lessons").insert(lessons.slice(j, j+50));
    if (error) { console.error("lessons err", error.message); process.exit(1); }
  }
  console.log("✔", lessons.length, "lessons created");
}
console.log("DONE");
