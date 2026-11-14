---
name: tu-moi
description: Phân tích một từ tiếng Anh trong câu người dùng gặp, dựa trên trang từ điển Cambridge họ dán vào from-dictionary.md. Tìm loại từ và mục nghĩa khớp (như establish verb [T] (PROVE)), rồi trả phiên âm, loại từ, nghĩa Việt/Anh, ví dụ, từ đồng nghĩa, trái nghĩa, từ liên quan, mỗi ô một khối để copy vào bảng Thêm từ mới của app. Dùng khi người dùng gõ /tu-moi, hoặc nhờ phân tích, tra nghĩa hay thêm một từ trong một câu, đoạn văn.
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
- Tìm từ trong câu, kể cả dạng chia (established, establishing) và phrasal verb bị tách (set it up).
- Dừng và nói rõ lý do khi:
  - từ cần phân tích không phải từ trong file, cũng không phải dạng chia hay từ cùng họ của nó (file là establish mà hỏi maintain): có thể người dùng chưa dán trang mới. Hỏi established hay establishment khi file là establish thì không dừng mà làm tiếp Bước 2;
  - câu không có từ đó;
  - không có câu: liệt kê các mục nghĩa trong file, mỗi mục một dòng gồm link tới dòng của mục (như ở Bước 3), tiêu đề và nghĩa tiếng Việt ngắn, rồi hỏi câu có chứa từ, hoặc số mục muốn lưu. Người dùng trả lời bằng số mục thì trả kết quả của mục đó theo Bước 3 nhưng bỏ dòng **Vì sao**: ô Nghĩa dịch theo định nghĩa, ô Ví dụ lấy 1–2 ví dụ của mục đó trong file.

## Bước 2. Chọn mục nghĩa

1. Xác định loại từ theo vai trò của từ trong câu (động từ có tân ngữ, danh từ sau mạo từ, tính từ đứng trước danh từ…).
2. Xét mọi mục nghĩa đúng loại từ đó trong file. File thường gồm nhiều từ điển, có mục trùng nghĩa nhau:
   - Cambridge Advanced Learner's: tiêu đề dạng `establish verb (START)`. Một tiêu đề có thể có nhiều nghĩa con, mỗi nghĩa con mở đầu bằng một dòng cấp độ (dưới `establish verb (START)` có `B2 [ T often passive ]`, rồi `C1 [ T ]`). Xét mỗi nghĩa con như một mục riêng.
   - Anh Mỹ / Học thuật: tiêu đề dạng `establish verb [T] (PROVE)`
   - Tiếng Anh Thương Mại: thường không có tiêu đề nghĩa, chỉ có nhãn như `[ T ]`
3. Chọn mục có định nghĩa khớp nhất với nghĩa trong câu. Câu dùng đúng một cụm có trong file (như `establish yourself`) thì lấy cụm đó làm từ, loại từ theo nhãn của file (`phrase`, `phrasal verb`, `idiom`).
4. Không mục nào khớp hẳn: lấy mục gần nhất, và nói rõ trong câu này từ mang sắc thái gì.
5. File không có loại từ mà câu dùng (câu dùng danh từ mà file chỉ có động từ; `established` trong "an established company" là tính từ, có mục riêng trên Cambridge): vẫn trả kết quả theo hiểu biết của bạn. Dòng đầu ghi "(không có trong from-dictionary.md)" thay cho link. Dòng **Vì sao** nói rõ điều đó và gợi ý dán thêm mục ấy.

## Bước 3. Trả kết quả

Viết bằng tiếng Việt, theo đúng mẫu ở cuối file, không thêm phần nào khác.

**Dòng đầu**: **từ** · loại từ (NHÃN NGHĨA) · link tới dòng tiêu đề của mục nghĩa đã chọn, dạng `[from-dictionary.md:66](.claude/skills/tu-moi/from-dictionary.md#L66)` (đường dẫn tính từ thư mục gốc repo), kèm nguyên văn dòng đó trong dấu backtick.
- Mục không có nhãn nghĩa thì bỏ phần (NHÃN NGHĨA).
- Chọn nghĩa con thứ hai trở đi của một tiêu đề thì link tới dòng cấp độ của nghĩa con đó (như `C1 [ T ]`), vẫn chép nguyên văn dòng tiêu đề.
- Mục không có dòng tiêu đề thì link tới dòng định nghĩa, không chép nguyên văn, vì dòng `>` ngay dưới đã có định nghĩa.

Tiếp theo:
- một dòng `>` chép định nghĩa tiếng Anh của mục đó;
- một dòng **Vì sao:** 1–2 câu ngắn: nghĩa của từ trong câu, và vì sao không phải mục dễ nhầm nhất.

Sau đó là các ô, đúng thứ tự trong bảng Thêm từ mới. Mỗi ô: nhãn in đậm, rồi một khối ```text để người dùng bấm copy. Ô để trống thì ghi "để trống" ngay sau nhãn, không có khối.

| Ô | Cách ghi |
|---|---|
| Từ | Dạng gốc của từ ở loại đã chọn, chữ thường: "was established in 1822" (động từ) ghi establish; "established coding conventions" (tính từ, có mục riêng) ghi established. Cụm thì ghi cả cụm. |
| Phiên âm | Chép phiên âm của đúng loại từ đã chọn trong file. UK và US giống nhau thì ghi một; khác thì `UK /…/, US /…/`. Cụm thì ghi phiên âm cả cụm, như thẻ mẫu của app (make up for → /meɪk ʌp fɔːr/): phần có trong file thì chép, các chữ còn lại theo hiểu biết của bạn, như `UK /ɪˈstæb.lɪʃ jɔːˈself/, US /ɪˈstæb.lɪʃ jʊrˈself/`. |
| Loại từ | Chỉ tên loại tiếng Anh, chữ thường: noun, verb, adjective, adverb, phrasal verb, phrase, idiom… Không ghi nhãn nghĩa hay [T]: app dùng ô này để gợi ý loại và tự gắn (v) trước nghĩa, ghi thêm sẽ tạo ra loại mới. |
| Nghĩa | Một dòng: nghĩa tiếng Việt theo câu (2–6 chữ, có thể hai cách dịch cách nhau bằng dấu phẩy), rồi ` — `, rồi nghĩa tiếng Anh rút gọn từ định nghĩa (khoảng 10 chữ trở xuống). Không ghi (v) ở đầu: app tự gắn. |
| Ví dụ | 1–2 dòng. Dòng 1: câu của người dùng rút còn 6–15 chữ quanh từ, giữ nguyên chữ, bọc từ (đúng dạng trong câu) bằng `*…*`. Dòng 2: một ví dụ ngắn, dễ hiểu của đúng mục nghĩa đó trong file, cùng sắc thái với câu của người dùng, cũng bọc `*…*`; không có ví dụ cùng sắc thái thì bỏ dòng 2. Khi chép ví dụ, bỏ nhãn hay cụm mẫu dính ở đầu câu (`[ + question word ]`, `establish yourself as something`); chỗ có `/` hay `(…)` thì chọn một cách viết (the facts/truth → the facts). |
| Từ đồng nghĩa | 2–4 từ hay cụm, cách nhau bằng dấu phẩy, đúng nghĩa đã chọn. Ưu tiên từ thay được vào câu, và từ trong phần "Từ điển từ đồng nghĩa" của file nếu phần đó thuộc đúng mục nghĩa. |
| Từ trái nghĩa | 0–3 từ, cách nhau bằng dấu phẩy, trái với nghĩa của từ trong câu: thay vào câu thì câu mang nghĩa ngược lại. Không có từ như vậy thì để trống: "establish what caused the outage" (tìm ra) không có, vì disprove chỉ trái với nghĩa "chứng minh". App hiện từ trái nghĩa trên cả hai thẻ, nên đừng ghi cho có. |
| Từ liên quan | 1–3 từ cùng họ hay gặp, cách nhau bằng dấu phẩy: establishment, established. Không có thì để trống. |

Lưu ý chung:
- Không ô nào mở đầu bằng `+`, `-` hay `=`: Sheet hiểu là công thức.
- Ô Nghĩa không mở đầu bằng dấu `(`: app hiểu `(…)` ở đầu dòng là loại từ.
- Chỉ ô Ví dụ dùng dấu `*`.

## Mẫu

Câu: "We need to address client-side performance issues before launch." (số dòng chỉ là ví dụ)

````markdown
**address** · verb (DEAL WITH) · [from-dictionary.md:31](.claude/skills/tu-moi/from-dictionary.md#L31) `address verb (DEAL WITH)`

> to give attention to or deal with a matter or problem

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
