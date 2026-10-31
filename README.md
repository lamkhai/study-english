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

Chưa cần nhập gì. Ở lần đồng bộ đầu tiên (Bước 3), script tự tạo bốn tab:
- `english`: tab từ vựng, có sẵn hàng tiêu đề.
- `types`: các loại từ để app gợi ý khi bạn thêm từ.
- `log`: số lượt xem thẻ mỗi ngày, cho phần Thống kê.
- `config`: chứa mã bí mật ở ô B1. Ai có cả link Sheet lẫn mã này là đọc và sửa được từ vựng qua script.

Script chỉ làm việc với bốn tab này, không bao giờ đọc hay sửa tab nào khác của bạn.
- Sheet mới thì tab trống có sẵn được đổi tên thành `english`, nên file chỉ có đúng bốn tab.
- Nếu đã có tab tên `english`, `types`, `log` hay `config` chứa dữ liệu, script tạo tab mới tên `english2`, `types2`, `log2`, `config2`… Tab trống trùng tên thì được dùng luôn.
- Script nhận ra bốn tab của mình bằng một thẻ ẩn, nên bạn đổi tên tab thoải mái.
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

| term | phonetic | meaning | example | type | synonyms | antonyms | related |
|---|---|---|---|---|---|---|---|
| inevitable | /ɪnˈevɪtəbl/ | không thể tránh khỏi | `Change is *inevitable*.` | adjective | unavoidable | avoidable | inevitably, inevitability |

- Mỗi từ một dòng. App nhận ra từng từ theo chữ ở cột `term`, không phân biệt hoa thường.
  - Hai dòng cùng một từ thì app chỉ dùng dòng trên cùng, và mỗi lần đồng bộ đều nhắc bạn gộp lại.
  - Sửa chữ ở cột `term` thì app coi đó là một từ khác. Ngày thêm, `last_seen` và nắm rõ vẫn giữ vì nằm cùng dòng. Nên đồng bộ trước khi sửa chữ: thay đổi của từ đó chưa gửi lên sẽ không ghi được vào dòng đã đổi chữ.
- Cột `phonetic` ghi phiên âm. App hiện đúng như bạn gõ, ngay dưới từ. Bỏ trống cũng được. Sheet dựng từ bản trước thì lần đồng bộ đầu tiên với script mới sẽ chèn cột này ngay sau cột `term`.
- Bọc cụm cần in đậm bằng dấu `*`. Một câu có mấy cụm cũng được.
- Muốn nhiều ví dụ thì xuống dòng trong cùng ô bằng Ctrl+Enter (trên Mac: ⌘+Enter).
- Cột `type` ghi loại từ như `noun`, `verb`, `adjective`, `phrasal verb`, hoặc `grammar` cho cấu trúc ngữ pháp. Nhiều loại thì cách nhau bằng dấu phẩy: `noun, verb`. Bỏ trống cũng được.
- Từ có nhiều loại thì ô `meaning` ghi mỗi nghĩa một dòng, mở đầu bằng loại viết tắt: `(n) cuộc chạy`, `(v) chạy`.
- Tab `types` liệt kê các loại để app gợi ý. Loại nào dùng ở cột `type` mà tab chưa có thì script tự thêm vào cuối tab.
  - Loại không dùng nữa thì xoá dòng đó. Loại vẫn còn từ dùng thì sẽ được thêm lại.
  - Cột `abbr` là chữ viết tắt đặt trước nghĩa, ví dụ `n` trong `(n) cuộc chạy`. Bỏ trống thì `noun` là `n`, `verb` là `v`, `adjective` là `adj`, `adverb` là `adv`…; loại khác dùng nguyên tên.
  - Lỡ xoá tab `types` thì lần đồng bộ sau script tạo lại, với các loại đang dùng.
- Ba cột từ liên kết, mỗi ô ghi các từ cách nhau bằng dấu phẩy. Bỏ trống cũng được.
  - `synonyms`: từ đồng nghĩa, như `unavoidable, inescapable`.
  - `antonyms`: từ trái nghĩa, như `avoidable`.
  - `related`: từ liên quan, như các từ cùng họ: dòng `study` ghi `student, studious`.
  - Chỉ cần ghi ở một từ: dòng `inevitable` ghi `unavoidable` ở cột `synonyms` thì thẻ `unavoidable` trong app cũng hiện `inevitable`.
- Sheet dựng từ bản trước: lần đồng bộ đầu tiên với script mới chèn những cột từ liên kết còn thiếu ngay sau các cột bạn nhập (thường là sau cột `type`), và xoá cột `id` nếu còn (không cần nữa).
- Ba cột `added`, `last_seen`, `mastered` do script tự tạo và quản lý.
- Cột `added` là ngày thêm từ, dùng cho phần Thống kê.
  - Từ thêm trong app thì lấy lúc bấm **Thêm**. Từ nhập thẳng vào Sheet thì lấy lúc đồng bộ kế tiếp.
  - Sheet dựng từ bản trước thì cột này được thêm vào cuối, và để trống ở các từ đã có, vì không ai biết chúng được thêm ngày nào. Muốn các từ đó vào thống kê thì tự điền ngày tháng vào ô.
- Cột `mastered` là ô tick. Muốn học lại một từ đã đánh dấu nắm rõ, bỏ tick rồi đồng bộ.
- Tab `log` do script tự ghi, bạn không cần sửa. Mỗi dòng là số lượt xem thẻ của một máy (cột `device`) trong một ngày, nên dùng hai máy thì một ngày có hai dòng.

## Dùng hằng ngày

- Vuốt trái hoặc phải, hoặc bấm **Thẻ tiếp**, để sang thẻ khác. Thẻ vừa xem được ghi lại `last seen`.
- Thẻ tiếp theo được chọn ngẫu nhiên, ưu tiên thẻ chưa xem hoặc lâu chưa xem. Thẻ vừa xem hầu như không lặp lại ngay.
- Bấm **Đã nắm rõ** thì thẻ không hiện nữa. Bấm nhầm thì chọn **Hoàn tác** trên thông báo.
- Không có mạng vẫn học bình thường. Con số trên nút ↻ là số thay đổi chưa đồng bộ.
- Thêm từ mới: bấm **+**, gõ từ, phiên âm, loại từ, nghĩa, từ đồng nghĩa, từ trái nghĩa, từ liên quan, ví dụ rồi bấm **Thêm**. Chỉ ô Từ là bắt buộc. Không có mạng vẫn thêm được: từ mới vào bộ thẻ ngay, và được ghi vào cuối tab `english` ở lần đồng bộ kế tiếp.
- Ô **Loại từ** chọn được nhiều loại:
  - Chạm loại gợi ý bên dưới ô để chọn nhanh. Loại dùng nhiều đứng trước.
  - Gõ để lọc gợi ý. Chưa có loại đó thì bấm Enter, gõ dấu phẩy hoặc chạm **+ Thêm** để tạo loại mới.
  - Chạm × để bỏ một loại.
  - Loại mới được lưu cùng từ khi bấm **Thêm** hay **Cập nhật**, rồi vào tab `types` ở lần đồng bộ kế tiếp.
- Mỗi từ chỉ có một thẻ. Gõ một từ đã có (không phân biệt hoa thường) thì bảng chuyển sang **Sửa từ**, nạp sẵn mọi ô của thẻ đó; sửa xong bấm **Cập nhật**. Nút ✎ ở chân thẻ mở bảng sửa cho thẻ đang xem.
- Chọn loại từ thì app tự gắn loại viết tắt vào ô Nghĩa, kể cả khi chỉ chọn một loại: `(n) cuộc chạy`.
  - Từ có nhiều loại: chọn đủ các loại, app gắn `(n)`, `(v)`… mỗi loại một dòng để bạn ghi mỗi nghĩa một dòng.
  - Chỉ còn một loại mà bỏ đi thì app gỡ `(n)` của loại đó khỏi ô Nghĩa, nghĩa đã gõ vẫn giữ.
- Ba ô **Từ đồng nghĩa**, **Từ trái nghĩa** và **Từ liên quan** dùng giống ô Loại từ: gõ từ rồi bấm Enter hoặc gõ dấu phẩy, chạm × để bỏ. Gõ vài chữ thì app gợi ý các từ đã có trong bộ thẻ. Các từ này hiện trên thẻ ngay dưới nghĩa, mỗi loại một dòng: `syn.` là từ đồng nghĩa, `ant.` là từ trái nghĩa, `rel.` là từ liên quan.
  - Từ liên quan thường là các từ cùng họ, như `study` với `student`, `studious`. Từ nào đã có trong bộ thẻ thì hiện kèm loại từ của nó: `rel. student (n), studious (adj)`.
  - Chỉ cần ghi ở một bên: `inevitable` ghi `unavoidable` là từ đồng nghĩa thì thẻ `unavoidable` cũng hiện `inevitable`, kể cả khi bạn thêm `unavoidable` sau. Lúc thêm `unavoidable`, ô Từ đồng nghĩa đã điền sẵn `inevitable`. Từ trái nghĩa và từ liên quan cũng vậy.
  - Bỏ một từ ở bên nào thì cả hai thẻ đều thôi hiện nhau.
- Bản sửa được ghi vào Sheet ở lần đồng bộ kế tiếp. Nếu trong lúc đó ô ấy đã được sửa thẳng trong Sheet, app giữ bản trong Sheet và báo lại.
- Xoá từ: trong bảng **Sửa từ** bấm **Xoá**, rồi xác nhận. Thẻ mất khỏi bộ thẻ ngay, và dòng của từ đó trong Sheet bị xoá ở lần đồng bộ kế tiếp. Dòng đã bị sửa chữ ở cột `term` thì không còn khớp từ đó nên không bị xoá.
- Nhập từ thẳng vào Sheet rồi bấm ↻ cũng được. Sửa chữ của chính từ đó (cột `term`) thì làm trong Sheet.
- Từ vừa thêm trong app mà trước lần đồng bộ cũng được gõ thẳng vào Sheet: app giữ dòng trong Sheet, chỉ điền thêm những ô Sheet còn trống.

### Tất cả từ

Bấm nút ☰ ở thanh trên để xem mọi từ, kể cả từ đã nắm rõ.
- Gõ vào ô tìm để tìm theo từ hoặc nghĩa, không cần gõ dấu: `bu dap` vẫn ra `bù đắp`.
- Lọc **Đang học** hay **Đã nắm rõ**, và xếp theo **Mới thêm**, **A → Z** hoặc **Lâu chưa xem**.
- Chạm một từ để xem cả thẻ. Vuốt, bấm **Từ trước** / **Từ sau**, hoặc phím ← → để đi qua các từ trong danh sách. Nút ✎ trên thẻ để sửa từ đó.
- Xem ở đây không ghi `last seen` và không tính lượt xem, nên không làm đổi thứ tự thẻ khi học.

### Thống kê

Mở tab **Thống kê** cạnh **Tất cả từ**, hoặc chạm vào số thẻ ở góc trái thanh trên.
- Hai biểu đồ: **Từ mới** (số từ thêm vào) và **Lượt xem** (số thẻ đã học), xem **Theo ngày** (14 ngày gần nhất), **Theo tuần** (12 tuần, tuần bắt đầu từ thứ Hai) hoặc **Theo tháng** (12 tháng).
- Số to là của hôm nay, tuần này hay tháng này. Chạm một cột để xem số của khoảng đó. **Xem dạng bảng** liệt kê mọi con số.
- Từ mới đếm theo cột `added`. Từ đã xoá thì không tính. Những từ đã có trước khi có cột `added` thì không vào biểu đồ, app ghi rõ có bao nhiêu từ như vậy.
- Mỗi lần vuốt sang thẻ khác, bấm **Thẻ tiếp** hay **Đã nắm rõ** là một lượt xem. Lượt xem bắt đầu được đếm từ khi cập nhật app, và được gửi vào tab `log` khi đồng bộ.
- Dùng nhiều máy chung một Sheet thì Thống kê cộng lượt xem của mọi máy. Số của máy khác được cập nhật mỗi lần bạn đồng bộ.

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
| Script chưa được cập nhật nên chưa nhận thay đổi từ app… | Script đang chạy là bản cũ, chưa ghi được các cột app bản này cần (như `antonyms`, `related`). Dùng script chung thì báo người quản lý app. Tự dựng (Cách B) thì dán lại `Code.gs` mới rồi deploy **New version** (xem lưu ý ở Bước 2). Thay đổi vẫn nằm trong máy, cập nhật xong thì bấm ↻. |
| Sheet báo lỗi: app đang là bản cũ… | Script đã được cập nhật nhưng máy này vẫn mở app bản cũ. Đóng hẳn app rồi mở lại lúc có mạng (có khi phải mở lại hai lần), rồi bấm ↻. Thay đổi vẫn nằm trong máy. |
| Bản sửa “…” không được ghi vì từ này vừa đổi trong Sheet | Ô đó đã được sửa thẳng trong Sheet trước khi app kịp đồng bộ (hoặc chữ của từ ở cột `term` vừa bị đổi), nên app giữ bản trong Sheet. Thẻ trong app giờ là bản trong Sheet; muốn sửa tiếp thì bấm ✎. |
| “…” có ở nhiều dòng trong Sheet… | Tab `english` có nhiều dòng cùng một từ (không phân biệt hoa thường), app chỉ dùng dòng trên cùng. Gộp nội dung vào một dòng, xoá các dòng còn lại rồi bấm ↻. |
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

> Bản có từ trái nghĩa và từ liên quan cần script mới, nên deploy script trước rồi mới push app.
> - Script mới vẫn đồng bộ được với app bản ngay trước (bản có từ đồng nghĩa), app đó chỉ chưa hiện hai loại từ mới. App cũ hơn nữa (còn dùng cột `id`) thì bị báo "app đang là bản cũ…".
> - App mới gặp script cũ thì báo "Script chưa được cập nhật…".
> - Máy báo một trong hai câu trên cũng không mất gì: thay đổi nằm chờ trong máy, app và script cùng là bản mới thì bấm ↻ là gửi hết lên.
> - Lần đồng bộ đầu tiên với script mới, mỗi Sheet tự thêm các cột còn thiếu (`antonyms`, `related`, và `synonyms` nếu Sheet từ bản cũ hơn), và xoá cột `id` nếu còn.

> Mọi người dùng đi chung một tài khoản bot: chung hạn mức Apps Script của Google, và các lần đồng bộ chạy lần lượt. Nhóm vài chục người thì ổn.
