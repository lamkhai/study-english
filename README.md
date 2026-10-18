# Từ vựng: app thẻ học tiếng Anh dùng offline

Web app cài lên màn hình chính iPhone và Android. Từ vựng nằm trong Google Sheet. Lúc học không cần mạng, chỉ khi bấm nút ↻ để đồng bộ mới cần.

Cấu trúc repo:
- `index.html`, `sw.js`, `manifest.webmanifest` và 3 file icon: đây là app, GitHub Pages chạy thẳng từ thư mục gốc.
- `apps-script/Code.gs`: script đồng bộ, dán vào Google Sheet (không chạy trên GitHub).

Thiết lập lần đầu mất khoảng 15 phút, gồm 4 bước dưới đây.

## Bước 1. Tạo Google Sheet

1. Tạo một file Google Sheet mới, chỉ dùng cho từ vựng. Ai có link script đều đọc được file này, nên đừng để chung dữ liệu khác.
2. App dùng tab đầu tiên. Nếu file có nhiều tab, đặt tên tab từ vựng là `Vocab`.
3. Hàng 1 ghi 4 tiêu đề. Mỗi dòng bên dưới là một từ hoặc một cấu trúc ngữ pháp:

| term | meaning | example | type |
|---|---|---|---|
| in conjunction with | kết hợp với | `hooks, states, props, Redux *in conjunction with* React components` | vocab |

- Bọc cụm cần in đậm bằng dấu `*`. Một câu có mấy cụm cũng được.
- Muốn nhiều ví dụ thì xuống dòng trong cùng ô bằng Ctrl+Enter (trên Mac: ⌘+Enter).
- Cột `type` ghi `vocab` hoặc `grammar`, bỏ trống cũng được.
- Bạn không cần tạo cột `last_seen`, `mastered`, `id`. Lần đồng bộ đầu tiên, script tự thêm 3 cột này vào cuối.
- Cột `mastered` là ô tick. Muốn học lại một từ đã đánh dấu nắm rõ, bỏ tick rồi đồng bộ.
- Cột `id` giúp app nhận ra từng dòng kể cả khi bạn sửa chữ hay sắp xếp lại Sheet. Đừng sửa cột này.

## Bước 2. Gắn script đồng bộ

1. Trong Sheet, mở **Extensions → Apps Script** (giao diện tiếng Việt: Tiện ích mở rộng → Apps Script).
2. Xoá code mẫu, dán toàn bộ nội dung `apps-script/Code.gs`.
3. Ngay trong trình soạn thảo Apps Script, đổi dòng `SECRET` thành mã riêng của bạn, ví dụ `'ca-phe-sua-da-2026'`, rồi bấm Lưu.
4. Bấm **Deploy → New deployment**. Ở *Select type* chọn **Web app**, rồi đặt:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**

   Sau đó bấm **Deploy**.
5. Google hỏi cấp quyền: chọn tài khoản → **Advanced** → **Go to … (unsafe)** → **Allow**. Cảnh báo này hiện vì script do chính bạn tạo, chưa qua kiểm duyệt của Google.
6. Copy **Web app URL** (đuôi `/exec`). Mở thử link này trên trình duyệt, thấy `"ok":true` là script đã chạy.

> Sau này sửa script thì phải vào **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. Link giữ nguyên, nhưng nếu bỏ qua bước này thì link vẫn chạy code cũ.

## Bước 3. Đưa lên GitHub và bật Pages

Trên github.com, tạo repo mới tên `tu-vung`, chọn **Public** (GitHub Pages miễn phí cần repo public) và không tick thêm README. Sau đó đẩy code lên:

```bash
cd tu-vung
git init
git add .
git commit -m "App thẻ từ vựng offline"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/tu-vung.git
git push -u origin main
```

Nếu không dùng git, trong repo trống bấm **uploading an existing file**, kéo thả toàn bộ nội dung thư mục `tu-vung` (cả thư mục `apps-script`) rồi bấm **Commit changes**.

Cuối cùng vào **Settings → Pages**, mục *Branch* chọn `main` và `/ (root)` → **Save**. Đợi 1–2 phút, link app có dạng `https://<tên-tài-khoản>.github.io/tu-vung/`.

> Repo công khai nên ai cũng đọc được code. Code không chứa từ vựng hay mã bí mật nào. Khi commit, giữ nguyên dòng `SECRET` mẫu trong `apps-script/Code.gs`; mã thật chỉ đổi trong trình soạn thảo Apps Script và nhập trong app.

## Bước 4. Cài lên điện thoại

- **iPhone**: mở link bằng Safari → nút Chia sẻ → **Thêm vào MH chính**.
- **Samsung**: mở link bằng Chrome → menu ⋮ → **Thêm vào màn hình chính** (hoặc **Cài đặt ứng dụng**).

Sau đó mở app **từ icon vừa tạo**, lúc đang có mạng → bấm ⚙ → dán link `/exec` và mã bí mật → **Lưu và đồng bộ**.

> Trên iPhone, app mở từ icon có bộ nhớ riêng, tách khỏi Safari. Vì vậy phải nhập cài đặt trong app mở từ icon, không phải trong tab Safari.

## Dùng hằng ngày

- Vuốt trái hoặc phải để sang thẻ khác. Thẻ vừa xem được ghi lại `last seen`.
- Thẻ tiếp theo được chọn ngẫu nhiên, ưu tiên thẻ chưa xem hoặc lâu chưa xem. Thẻ vừa xem hầu như không lặp lại ngay.
- Bấm **Đã nắm rõ** thì thẻ không hiện nữa. Bấm nhầm thì chọn **Hoàn tác** trên thông báo.
- Không có mạng vẫn học bình thường. Con số trên nút ↻ là số thay đổi chưa đồng bộ.
- Thêm từ mới: nhập vào Sheet, rồi bấm ↻ trong app lúc có mạng.
- Sửa code app rồi push lên GitHub: điện thoại tự tải bản mới khi mở app có mạng, và bản mới hiện từ lần mở kế tiếp.

## Khi gặp lỗi

| App báo | Cách xử lý |
|---|---|
| Sheet báo lỗi: sai mã bí mật | Mã trong ⚙ phải giống hệt dòng `SECRET` trong Apps Script. |
| Link chưa đúng… | Dùng link đuôi `/exec`, quyền *Anyone*, và Deploy bản mới nhất (xem lưu ý ở Bước 2). |
| Sheet báo lỗi: không thấy cột "term"… | Hàng 1 của tab từ vựng thiếu tiêu đề `term`. |
| Không gọi được script | Kiểm tra mạng, hoặc dán lại link trong ⚙. |
