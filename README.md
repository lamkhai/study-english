# Từ vựng: app thẻ học tiếng Anh dùng offline

Web app cài lên màn hình chính iPhone và Android. Từ vựng nằm trong Google Sheet. Lúc học không cần mạng, chỉ khi bấm nút ↻ để đồng bộ mới cần.

Cấu trúc repo:
- `index.html`, `sw.js`, `manifest.webmanifest` và 3 file icon: đây là app, GitHub Pages chạy thẳng từ thư mục gốc.
- `apps-script/Code.gs`: script đồng bộ, chạy trên Apps Script của Google (không chạy trên GitHub). Một script dùng được cho nhiều Sheet.

README có hai phần: **Dùng app** cho người học, và **Quản lý app** cho người đưa app lên GitHub và dựng script chung.

## Bản đang chạy

- **Link app:** https://lamkhai.github.io/study-english/
- **Email bot:** người quản lý app gửi riêng cho bạn. Chia sẻ Sheet của bạn cho email này ở Bước 2, Cách A.
- **Script chung:** https://script.google.com/macros/s/AKfycbwcHehzUPC07oMh4-PqGRxwX5AvZzLPS4Y2Fb6GkvJ1RX3TENTF9T-_weUpoA5bk2yI/exec. Link này đã ghi sẵn trong app, người dùng không cần nhập.

## Dùng app

Thiết lập lần đầu gồm 3 bước dưới đây.

### Bước 1. Chuẩn bị Google Sheet

Dùng một file Google Sheet mới hay một file có sẵn đều được. Nên dùng file riêng cho từ vựng: nếu dùng script chung, tài khoản bot sẽ có quyền với cả file.

Chưa cần nhập gì. Ở lần đồng bộ đầu tiên (Bước 3), script tự tạo hai tab:
- `english`: tab từ vựng, có sẵn hàng tiêu đề.
- `config`: chứa mã bí mật ở ô B1. Ai có cả link Sheet lẫn mã này là đọc và sửa được từ vựng qua script.

Script chỉ làm việc với hai tab này, không bao giờ đọc hay sửa tab nào khác của bạn.
- Sheet mới thì tab trống có sẵn được đổi tên thành `english`, nên file chỉ có đúng hai tab.
- Nếu đã có tab tên `english` hay `config` chứa dữ liệu, script tạo tab mới tên `english2`, `config2`… Tab trống trùng tên thì được dùng luôn.
- Script nhận ra hai tab của mình bằng một thẻ ẩn, nên bạn đổi tên tab thoải mái.
- Muốn học những từ đã có ở tab khác, hãy copy chúng sang tab `english`.

### Bước 2. Cho script đọc Sheet

Chọn một trong hai cách.

**Cách A: dùng script chung (dễ nhất).** Trong Sheet, bấm **Share** (Chia sẻ), thêm email bot mà người quản lý app gửi cho bạn, chọn quyền **Editor** (Người chỉnh sửa), rồi bấm Gửi. Xong bước này.

> Đừng chọn "Bất kỳ ai có đường liên kết" (*Anyone with the link*) thay cho bước chia sẻ cho bot. Làm vậy thì ai có link cũng mở thẳng được Sheet, sửa hay xoá được từ, và đọc được mã ở tab `config`. Chia sẻ cho email bot thì Sheet vẫn ở chế độ Bị hạn chế (*Restricted*): chỉ bạn và bot mở được.

> Tài khoản bot do người quản lý app giữ, đọc và sửa được toàn bộ Sheet này. Muốn thôi dùng thì bỏ chia sẻ cho bot, bot mất quyền ngay.

**Cách B: tự dựng script riêng.** Dùng khi bạn không muốn chia sẻ Sheet cho ai, hoặc khi người quản lý app chưa dựng script chung.

1. Trong Sheet, mở **Extensions → Apps Script** (giao diện tiếng Việt: Tiện ích mở rộng → Apps Script).
2. Xoá code mẫu, dán toàn bộ nội dung `apps-script/Code.gs`, rồi bấm Lưu. Không cần sửa gì trong code.
3. Bấm **Deploy → New deployment**. Ở *Select type* chọn **Web app**, rồi đặt:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**

   Sau đó bấm **Deploy**.
4. Google hỏi cấp quyền: chọn tài khoản → **Advanced** → **Go to … (unsafe)** → **Allow**. Cảnh báo này hiện vì script do chính bạn tạo, chưa qua kiểm duyệt của Google.
5. Copy **Web app URL** (đuôi `/exec`). Mở thử link này trên trình duyệt, thấy `"ok":true` là script đã chạy.

> Sau này sửa script thì phải vào **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. Link giữ nguyên, nhưng nếu bỏ qua bước này thì link vẫn chạy code cũ.

### Bước 3. Cài lên điện thoại

Mở link app https://lamkhai.github.io/study-english/:
- **iPhone**: mở link bằng Safari → nút Chia sẻ → **Thêm vào MH chính**.
- **Samsung**: mở link bằng Chrome → menu ⋮ → **Thêm vào màn hình chính** (hoặc **Cài đặt ứng dụng**).

Sau đó mở app **từ icon vừa tạo**, lúc đang có mạng → bấm ⚙ → dán link Sheet → **Lưu và đồng bộ**. Dùng Cách B thì dán thêm link `/exec` vào ô Link Apps Script.
- **Sheet mới:** để trống ô Mã bí mật. App báo "Đã thiết lập Sheet, mã bí mật là …". Mã này nằm trong ⚙ và ở ô B1 của tab `config`.
- **Máy thứ hai trở đi:** dán link Sheet và nhập mã đó.
- **Muốn đổi mã:** sửa ô B1 của tab `config`, rồi nhập mã mới vào ⚙ trên từng máy.

> Trên iPhone, app mở từ icon có bộ nhớ riêng, tách khỏi Safari. Vì vậy phải nhập cài đặt trong app mở từ icon, không phải trong tab Safari.

> Lần đồng bộ đầu tiên vào một Sheet chưa thiết lập sẽ nhận Sheet đó. Tab có sẵn của bạn vẫn không bị đọc, nhưng hãy kết nối ngay sau khi chia sẻ cho bot, và đừng gửi link Sheet cho ai trước lúc đó. Nếu app báo Sheet đã có mã mà bạn chưa kết nối lần nào, hãy sửa ô B1 của tab `config` thành mã mới rồi nhập mã đó vào ⚙. Mã cũ sẽ hết tác dụng.

> Đừng xoá tab `config`. Lỡ xoá thì mở app trên máy đã kết nối và đồng bộ: script tạo lại tab `config` với mã đang lưu trong máy đó.

### Nhập từ vào Sheet

Mỗi dòng trong tab `english` (tab từ vựng app đã tạo) là một từ hoặc một cấu trúc ngữ pháp:

| term | meaning | example | type |
|---|---|---|---|
| in conjunction with | kết hợp với | `hooks, states, props, Redux *in conjunction with* React components` | vocab |

- Bọc cụm cần in đậm bằng dấu `*`. Một câu có mấy cụm cũng được.
- Muốn nhiều ví dụ thì xuống dòng trong cùng ô bằng Ctrl+Enter (trên Mac: ⌘+Enter).
- Cột `type` ghi `vocab` hoặc `grammar`, bỏ trống cũng được.
- Ba cột `last_seen`, `mastered`, `id` do script tự tạo và quản lý.
- Cột `mastered` là ô tick. Muốn học lại một từ đã đánh dấu nắm rõ, bỏ tick rồi đồng bộ.
- Cột `id` giúp app nhận ra từng dòng kể cả khi bạn sửa chữ hay sắp xếp lại Sheet. Đừng sửa cột này.

## Dùng hằng ngày

- Vuốt trái hoặc phải, hoặc bấm **Thẻ tiếp**, để sang thẻ khác. Thẻ vừa xem được ghi lại `last seen`.
- Thẻ tiếp theo được chọn ngẫu nhiên, ưu tiên thẻ chưa xem hoặc lâu chưa xem. Thẻ vừa xem hầu như không lặp lại ngay.
- Bấm **Đã nắm rõ** thì thẻ không hiện nữa. Bấm nhầm thì chọn **Hoàn tác** trên thông báo.
- Không có mạng vẫn học bình thường. Con số trên nút ↻ là số thay đổi chưa đồng bộ.
- Thêm từ mới: nhập vào Sheet, rồi bấm ↻ trong app lúc có mạng.

## Khi gặp lỗi

| App báo | Cách xử lý |
|---|---|
| Link Sheet cần có dạng… | Dán link của file Sheet, dạng `https://docs.google.com/spreadsheets/d/…`. |
| Sheet báo lỗi: không mở được Sheet… | Kiểm tra lại link Sheet. Dùng Cách A thì kiểm tra đã chia sẻ Sheet cho email bot chưa. |
| Sheet báo lỗi: Sheet đã có mã bí mật, hãy nhập mã… | Nhập vào ô Mã bí mật trong ⚙ mã ở ô B1 của tab `config` (câu báo ghi đúng tên tab), hoặc mã trong ⚙ của máy đã kết nối. |
| Sheet báo lỗi: Sheet vừa được máy khác thiết lập… | Hai máy kết nối cùng lúc. Lấy mã ở ô B1 của tab `config` rồi nhập vào ⚙. |
| Sheet báo lỗi: mã bí mật cần ít nhất 8 ký tự | Sheet mới: để trống ô mã cho app tự tạo, hoặc nhập mã dài hơn. |
| Sheet báo lỗi: mã bí mật ở ô B1 của tab config cần ít nhất 8 ký tự | Đổi mã ở ô B1 cho dài hơn, rồi nhập lại vào ⚙. |
| Sheet báo lỗi: sai mã bí mật | Mã trong ⚙ phải giống hệt ô B1 của tab `config`. |
| Sheet báo lỗi: script mới có quyền xem Sheet… | Chia sẻ lại cho bot với quyền **Editor** (Người chỉnh sửa), không phải Viewer. |
| Sheet báo lỗi: script đang bận… | Nhiều người đang đồng bộ cùng lúc. Đợi vài giây rồi bấm ↻. |
| Sheet báo lỗi: không thấy cột "term"… | Hàng 1 của tab `english` thiếu tiêu đề `term`. Gõ lại tiêu đề `term` vào hàng 1. |
| Link chưa đúng… | (Cách B) Dùng link đuôi `/exec`, quyền *Anyone*, và Deploy bản mới nhất (xem lưu ý ở Bước 2). |
| Script chung đang trục trặc… | Báo người quản lý app. Trong lúc chờ vẫn học offline bình thường. |
| Không gọi được script | Kiểm tra mạng, hoặc dán lại link trong ⚙. |

## Quản lý app

### Chạy thử ở máy

App chỉ gồm các file tĩnh, không cần cài thư viện hay build. Mở terminal ở thư mục gốc repo rồi chạy một trong hai lệnh:

```bash
python3 -m http.server 8000   # Windows: py -m http.server 8000
npx serve .                   # cần Node
```

Sau đó mở http://localhost:8000, hoặc link mà `npx serve` in ra.

- Đừng mở thẳng file `index.html` bằng trình duyệt. Service worker chỉ chạy qua http(s) hoặc localhost, nên mở kiểu đó thì app không dùng được offline.
- App luôn mở bản đã lưu trong máy trước, nên sửa code xong phải tải lại trang 2 lần mới thấy thay đổi. Muốn lần nào cũng thấy bản mới: F12 → **Application** → **Service workers** → tick **Bypass for network**.
- Trên máy tính, kéo thẻ bằng chuột hoặc bấm phím ← → để chuyển thẻ.
- Lần đầu mở, app hiện vài thẻ mẫu. Cài đặt ở localhost tách riêng với bản trên GitHub Pages, nên muốn đồng bộ thì nhập lại link Sheet và mã bí mật trong ⚙.

> Đồng bộ từ localhost vẫn ghi vào Sheet thật. Muốn thử thoải mái thì dùng một Sheet riêng để test.

### Đưa app lên GitHub Pages

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

Sửa code app rồi push lên GitHub: điện thoại tự tải bản mới khi mở app có mạng, và bản mới hiện từ lần mở kế tiếp.

> Repo công khai nên ai cũng đọc được code. Code không chứa từ vựng hay mã bí mật nào: mã của từng người nằm trong tab `config` của Sheet họ. Link script chung trong `index.html` (và email bot, nếu bạn điền `BOT_EMAIL`) thì ai cũng thấy, không sao, vì mỗi Sheet có mã riêng.

### Dựng script chung bằng Gmail bot

Không bắt buộc. Nếu bỏ qua, người dùng chỉ dùng được Cách B.

Script đang dùng được ghi ở mục **Bản đang chạy**. Nếu đổi bot hoặc tạo bản deploy mới thì link `/exec` sẽ đổi. Khi đó phải sửa cả `SHARED_URL` trong `index.html` lẫn mục đó.

1. Tạo một Gmail mới chỉ để chạy script, ví dụ `tuvung.bot@gmail.com`. Bật xác minh 2 bước và không dùng tài khoản này vào việc khác: ai vào được tài khoản bot là đọc được Sheet của mọi người dùng.
2. Đăng nhập Gmail bot, mở [script.google.com](https://script.google.com) → **New project**. Xoá code mẫu, dán toàn bộ `apps-script/Code.gs`, đặt tên project rồi bấm Lưu.
3. Deploy giống mục 3–5 của Bước 2, Cách B (*Execute as*: **Me**, *Who has access*: **Anyone**), rồi copy **Web app URL**.
4. Trong `index.html`, điền link vừa copy vào `SHARED_URL`, rồi commit và push lên GitHub. `BOT_EMAIL` không bắt buộc:
   - Để trống thì email bot không lên GitHub. Bạn tự gửi email bot cho người dùng khi mời họ.
   - Điền vào thì ⚙ hiện sẵn email bot, nhưng email sẽ công khai trên GitHub.
5. Thử với một Sheet trống: chia sẻ cho bot, dán link vào app, để trống ô mã rồi đồng bộ.

Sửa `Code.gs` sau này thì dán lại vào project của bot và deploy **New version** (xem lưu ý ở Bước 2). Mọi người dùng chạy bản mới ngay, nên thử kỹ trước khi deploy. Lỗi khi chạy xem ở mục **Executions** trong Apps Script.

> Mọi người dùng đi chung một tài khoản bot: chung hạn mức Apps Script của Google, và các lần đồng bộ chạy lần lượt. Nhóm vài chục người thì ổn.
