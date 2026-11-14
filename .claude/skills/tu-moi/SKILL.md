---
name: tu-moi
description: Phân tích một từ tiếng Anh trong câu người dùng gặp, dựa trên trang từ điển Cambridge họ dán vào from-dictionary.md. Tự suy ra dạng của từ trong câu (bị động, số nhiều, V-ing…) và dạng gốc, tìm loại từ và mục nghĩa khớp (như establish verb [T] (PROVE)), rồi trả phiên âm, loại từ, nghĩa Việt/Anh, ví dụ, từ đồng nghĩa, trái nghĩa, từ liên quan, mỗi ô một khối để copy vào bảng Thêm từ mới của app. Dùng khi người dùng gõ /tu-moi, hoặc nhờ phân tích, tra nghĩa hay thêm một từ trong một câu, đoạn văn.
argument-hint: "[từ] | <câu có chứa từ>"
allowed-tools: Read, Grep
---

# Thêm từ mới từ trang Cambridge

Người dùng copy trang Cambridge của một từ, dán vào `from-dictionary.md` (cùng thư mục với file này: `.claude/skills/tu-moi/`), rồi đưa câu có chứa từ đó. Bạn xác định từ trong câu là loại từ gì, ứng với mục nghĩa nào trong file, rồi trả kết quả để họ dán từng ô vào bảng **Thêm từ mới** của app (nút **+**). App lưu từ vào Google Sheet của họ.

Chỉ đọc và trả lời trong khung chat, không tạo hay sửa file nào.

Đầu vào: $ARGUMENTS
(Trống thì lấy từ và câu trong tin nhắn của người dùng.)

## Bước 1. Đọc đầu vào

- Đọc `.claude/skills/tu-moi/from-dictionary.md` kèm số dòng. Không có file hoặc file trống: nhắn "Hãy dán trang Cambridge của từ vào from-dictionary.md rồi gọi lại.", với from-dictionary.md là link `[from-dictionary.md](.claude/skills/tu-moi/from-dictionary.md)`, và dừng.
- **Từ cần phân tích**: chữ người dùng ghi trước dấu `|`, hoặc chữ X trong "phân tích chữ X…". Không ghi thì lấy từ ở dòng đầu file.
- **Câu**: phần sau `|`, phần trong ngoặc kép, hoặc câu tiếng Anh trong tin nhắn.
- Tìm từ trong câu, kể cả dạng chia (established, establishing) và phrasal verb bị tách (set it up). Người dùng gõ dạng gốc (reinforce) hay đúng dạng trong câu (reinforced) thì kết quả như nhau: dạng và loại từ luôn suy ra từ câu (Bước 2), không theo chữ họ gõ.
- Dừng và nói rõ lý do khi:
  - từ cần phân tích không phải từ trong file, cũng không phải dạng chia hay từ cùng họ của nó (file là establish mà hỏi maintain): có thể người dùng chưa dán trang mới. Từ cùng họ thì không dừng mà làm tiếp Bước 2, theo cả hai chiều (file là establish, hỏi established hay establishment; file là reinforced, hỏi reinforce), kể cả khi file vẫn y như lần gọi trước;
  - câu không có từ đó;
  - không có câu: liệt kê các mục nghĩa trong file, mỗi mục một dòng gồm link tới dòng của mục (như ở Bước 3), tiêu đề và nghĩa tiếng Việt ngắn, rồi hỏi câu có chứa từ, hoặc số mục muốn lưu. Người dùng trả lời bằng số mục thì trả kết quả của mục đó theo Bước 3 nhưng bỏ dòng **Dạng trong câu** và **Vì sao**: ô Nghĩa dịch theo định nghĩa, ô Ví dụ lấy 1–2 ví dụ của mục đó trong file.

## Bước 2. Chọn mục nghĩa

1. Suy ra dạng của từ trong câu theo ngữ pháp, rồi dạng gốc và loại từ theo vai trò của từ (động từ có tân ngữ, danh từ sau mạo từ, tính từ đứng trước danh từ…):
   - danh từ: số ít hay số nhiều (skills → skill);
   - động từ: nguyên mẫu (to establish), ngôi 3 số ít (establishes), quá khứ, V-ing, V3;
   - bị động: be + V3 (was established), hoặc V3 đứng sau danh từ, nhất là khi có by + tác nhân ("videos, reinforced by hands-on labs" là videos that are reinforced by…). Đây vẫn là động từ;
   - V3 hay V-ing đứng trước danh từ, chỉ tính chất của nó (an established company, existing developers), là tính từ; Cambridge thường có mục riêng;
   - so sánh hơn, so sánh nhất (further là so sánh hơn của far).
2. Xét mọi mục nghĩa đúng loại từ đó trong file. File thường gồm nhiều từ điển, có mục trùng nghĩa nhau:
   - Cambridge Advanced Learner's: tiêu đề dạng `establish verb (START)`. Một tiêu đề có thể có nhiều nghĩa con, mỗi nghĩa con mở đầu bằng một dòng cấp độ (dưới `establish verb (START)` có `B2 [ T often passive ]`, rồi `C1 [ T ]`). Xét mỗi nghĩa con như một mục riêng.
   - Anh Mỹ / Học thuật: tiêu đề dạng `establish verb [T] (PROVE)`
   - Tiếng Anh Thương Mại: thường không có tiêu đề nghĩa, chỉ có nhãn như `[ T ]`
3. Chọn mục có định nghĩa khớp nhất với nghĩa trong câu. Câu dùng đúng một cụm có trong file (như `establish yourself`) thì lấy cụm đó làm từ, loại từ theo nhãn của file (`phrase`, `phrasal verb`, `idiom`).
4. Không mục nào khớp hẳn: lấy mục gần nhất, và nói rõ trong câu này từ mang sắc thái gì.
5. File không có loại từ mà câu dùng (câu dùng danh từ mà file chỉ có động từ; `established` trong "an established company" là tính từ, có mục riêng trên Cambridge; file là trang reinforced (tính từ) mà câu dùng động từ reinforce ở bị động): vẫn trả đủ kết quả theo hiểu biết của bạn, không dừng. Dòng đầu thay link bằng trang đang có trong file và link Cambridge của đúng trang (xem Bước 3). Dòng **Vì sao** nói vì sao không dùng mục có trong file.

## Bước 3. Trả kết quả

Viết bằng tiếng Việt, theo đúng các mẫu ở cuối file, không thêm phần nào khác.

**Dòng đầu**: **từ** · loại từ (NHÃN NGHĨA) · link tới dòng tiêu đề của mục nghĩa đã chọn, dạng `[from-dictionary.md:66](.claude/skills/tu-moi/from-dictionary.md#L66)` (đường dẫn tính từ thư mục gốc repo), kèm nguyên văn dòng đó trong dấu backtick.
- Mục không có nhãn nghĩa thì bỏ phần (NHÃN NGHĨA).
- Chọn nghĩa con thứ hai trở đi của một tiêu đề thì link tới dòng cấp độ của nghĩa con đó (như `C1 [ T ]`), vẫn chép nguyên văn dòng tiêu đề.
- Mục không có dòng tiêu đề thì link tới dòng định nghĩa, không chép nguyên văn, vì dòng `>` ngay dưới đã có định nghĩa.
- File không có mục khớp (Bước 2, mục 5): thay link và nguyên văn bằng tên trang đang có trong file kèm loại của trang ấy, rồi link Cambridge của đúng trang, như mẫu thứ hai ở cuối file. Link là `https://dictionary.cambridge.org/vi/dictionary/english/` nối với chữ ở ô Từ; cụm thì thay dấu cách bằng `-` (set up → set-up).

Tiếp theo:
- một dòng `>` chép định nghĩa tiếng Anh của mục đó (file không có mục khớp thì viết theo hiểu biết của bạn);
- một dòng **Dạng trong câu:** chữ đúng như trong câu, trong ngoặc kép, rồi dạng của nó: "reinforced" là V3 của reinforce, bị động rút gọn (videos that are reinforced by hands-on labs); "skills" là danh từ số nhiều của skill; "manipulate" là động từ nguyên mẫu sau to;
- một dòng **Vì sao:** 1–2 câu ngắn: nghĩa của từ trong câu, và vì sao không phải mục dễ nhầm nhất.

Sau đó là các ô, đúng thứ tự trong bảng Thêm từ mới. Mỗi ô: nhãn in đậm, rồi một khối ```text để người dùng bấm copy. Ô để trống thì ghi "để trống" ngay sau nhãn, không có khối.

| Ô | Cách ghi |
|---|---|
| Từ | Dạng gốc của từ ở loại đã chọn, chữ thường: "was established in 1822" (động từ) ghi establish; "established coding conventions" (tính từ, có mục riêng) ghi established. Cụm thì ghi cả cụm. |
| Phiên âm | Chép phiên âm của đúng loại từ đã chọn trong file. UK và US giống nhau thì ghi một; khác thì `UK /…/, US /…/`. Cụm thì ghi phiên âm cả cụm, như thẻ mẫu của app (make up for → /meɪk ʌp fɔːr/): phần có trong file thì chép, các chữ còn lại theo hiểu biết của bạn, như `UK /ɪˈstæb.lɪʃ jɔːˈself/, US /ɪˈstæb.lɪʃ jʊrˈself/`. |
| Loại từ | Chỉ tên loại tiếng Anh, chữ thường: noun, verb, adjective, adverb, phrasal verb, phrase, idiom… Không ghi nhãn nghĩa hay [T]: app dùng ô này để gợi ý loại và tự gắn (v) trước nghĩa, ghi thêm sẽ tạo ra loại mới. |
| Nghĩa | Một dòng: nghĩa tiếng Việt theo câu (2–6 chữ, có thể hai cách dịch cách nhau bằng dấu phẩy), rồi ` — `, rồi nghĩa tiếng Anh rút gọn từ định nghĩa (khoảng 10 chữ trở xuống). Không ghi (v) ở đầu: app tự gắn. |
| Ví dụ | 1–2 dòng. Dòng 1: câu của người dùng rút còn 6–15 chữ quanh từ, giữ nguyên chữ, bọc từ (đúng dạng trong câu) bằng `*…*`. Dòng 2: một ví dụ ngắn, dễ hiểu của đúng mục nghĩa đó trong file, cùng sắc thái với câu của người dùng, cũng bọc `*…*`; không có ví dụ cùng sắc thái thì bỏ dòng 2. Khi chép ví dụ, bỏ nhãn hay cụm mẫu dính ở đầu câu (`[ + question word ]`, `establish yourself as something`); chỗ có `/` hay `(…)` thì chọn một cách viết (the facts/truth → the facts). |
| Từ đồng nghĩa | 2–4 từ hay cụm, cách nhau bằng dấu phẩy, đúng nghĩa và đúng loại từ đã chọn, ở dạng gốc (xem lưu ý dưới bảng). Ưu tiên từ thay được vào câu sau khi chia lại cho hợp (reinforced by labs → strengthen), và từ trong phần "Từ điển từ đồng nghĩa" của file nếu phần đó thuộc đúng mục nghĩa. |
| Từ trái nghĩa | 0–3 từ, cách nhau bằng dấu phẩy, trái với nghĩa của từ trong câu: thay vào câu thì câu mang nghĩa ngược lại. Không có từ như vậy thì để trống: "establish what caused the outage" (tìm ra) không có, vì disprove chỉ trái với nghĩa "chứng minh". App hiện từ trái nghĩa trên cả hai thẻ, nên đừng ghi cho có. |
| Từ liên quan | 1–3 từ cùng họ hay gặp, cách nhau bằng dấu phẩy, ở dạng gốc: establish có establishment, guidance có guide. Từ viết y hệt từ đang học nhưng khác loại thì vẫn ghi, kèm loại viết tắt trong ngoặc như app (n, v, adj, adv): fundamental (tính từ) có fundamental (n), dạng gốc của danh từ fundamentals; showcase (động từ) có showcase (n). Các từ khác không ghi loại: app tự hiện loại của từ đã có thẻ, còn ghi thêm thì app không nhận ra thẻ đó. Không có thì để trống. |

Lưu ý chung:
- Không ô nào mở đầu bằng `+`, `-` hay `=`: Sheet hiểu là công thức.
- Ô Nghĩa không mở đầu bằng dấu `(`: app hiểu `(…)` ở đầu dòng là loại từ.
- Chỉ ô Ví dụ dùng dấu `*`.
- Ba ô Từ đồng nghĩa, Từ trái nghĩa, Từ liên quan chỉ ghi dạng gốc như mục từ trong từ điển: danh từ số ít, động từ nguyên mẫu, tính từ và trạng từ không ở dạng so sánh. Gặp dạng chia (số nhiều, V3, V-ing, bị động, so sánh hơn, nhất) thì đưa về dạng gốc: fundamentals → fundamental (n), guided → guide, furthest → far. Về dạng gốc mà trùng từ đã ghi, hay trùng từ đang học và cùng loại (established → establish khi đang học establish), thì bỏ. App nối các thẻ theo đúng chữ, nên dạng chia không khớp thẻ nào.
- Từ đang học tự nó là tính từ dạng -ed hay -ing (reinforced, established): từ đồng nghĩa, trái nghĩa vẫn phải là tính từ, nên chọn tính từ thường cùng nghĩa (strong, sturdy; weak). Không có thì để trống, không đổi sang động từ như strengthen.

## Mẫu

Câu: "We need to address client-side performance issues before launch." (số dòng chỉ là ví dụ)

````markdown
**address** · verb (DEAL WITH) · [from-dictionary.md:31](.claude/skills/tu-moi/from-dictionary.md#L31) `address verb (DEAL WITH)`

> to give attention to or deal with a matter or problem

**Dạng trong câu:** "address" là động từ nguyên mẫu sau need to.

**Vì sao:** "address performance issues" là giải quyết vấn đề, không phải ghi địa chỉ lên thư (WRITE) hay nói với ai (SPEAK).

**Từ**
```text
address
```
**Phiên âm**
```text
/əˈdres/
```
**Loại từ**
```text
verb
```
**Nghĩa**
```text
giải quyết, xử lý (vấn đề) — to deal with a problem
```
**Ví dụ**
```text
We need to *address* client-side performance issues
The issue of funding will be *addressed* at the next meeting.
```
**Từ đồng nghĩa**
```text
tackle, deal with, handle
```
**Từ trái nghĩa**
```text
ignore, neglect
```
**Từ liên quan** để trống
````

Câu: "You will learn how to build client-side React applications through instructional videos, reinforced by hands-on labs", trong khi file là trang reinforced (tính từ). Phần đầu khác mẫu trên, các ô sau đó vẫn đủ như thường:

````markdown
**reinforce** · verb · file là trang reinforced (tính từ), dán trang [reinforce](https://dictionary.cambridge.org/vi/dictionary/english/reinforce) để có link và ví dụ Cambridge

> to make an existing idea, feeling or skill stronger

**Dạng trong câu:** "reinforced" là V3 của reinforce, bị động rút gọn (videos that are reinforced by hands-on labs).

**Vì sao:** "videos, reinforced by hands-on labs" là video được các bài thực hành củng cố thêm. Không phải tính từ reinforced trong file (a reinforced belief) vì có by hands-on labs chỉ tác nhân, nên đây là động từ ở bị động.
````
