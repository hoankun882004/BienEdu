# Biển Edu — Master Quality Recovery — 2026-11-14

## Status: PARTIAL

Đã sửa trực tiếp lỗi đọc Knowledge trên desktop, bố trí công thức theo ranh giới canonical có sẵn và sửa chủ sở hữu cuộn ngang bằng bàn phím. Không thu nhỏ font, thay kiến thức hoặc dựng lại frontend. Chưa chứng nhận toàn bộ kho tài liệu đúng nguồn; không tự apply, commit, push hoặc deploy.

Working tree đầu vào đã có Conversion Recovery. Các thay đổi đó được giữ lại, không reset/clean. Báo cáo Conversion Recovery trước đây là bản ghi lịch sử, không bị viết lại để biến kết quả cũ thành chứng nhận mới.

## 1. Lỗi CD01 và sửa thực tế

Route tái hiện: `/documents.html?grade=12&topic=CD01&section=knowledge&item=1`.

Ở 1366×768, trước sửa, `html/body`, app shell và `.lesson-content` cùng bị khóa chiều cao/`overflow:hidden`; nội dung có scrollHeight lớn hơn clientHeight nhưng không có chủ sở hữu cuộn dọc hoạt động. Wheel và End vẫn để `window.scrollY = 0`. Đoạn nguồn cuối vượt vùng đọc và navigation. Đây là lỗi khung slide cố định, không phải người dùng đặt zoom sai.

Sửa trong `assets/pdf-knowledge.css`, chỉ scope Knowledge:

- Một chủ sở hữu cuộn dọc là document, không phải các khung lồng nhau.
- Bỏ ràng buộc height và overflow của các ancestor Knowledge, trả navigation về document flow.
- Giới hạn article 68rem; prose 74ch, giữ nguyên font/font-size đang có.
- Nút hai phía cân bằng; giữ safe-area ở cuối trang; menu mobile vẫn khóa cuộn khi mở.
- Sidebar desktop có thể sticky, không ép phần bài đọc vào chiều cao viewport.

Trong PDF Knowledge renderer, chỉ những block gồm math nodes và whitespace mới được trình bày thành nhóm dòng công thức. Không tách theo dấu phẩy, không sửa LaTeX hoặc di chuyển điều kiện. Năm dòng nguồn CD01 vẫn là năm canonical expressions; collection gốc gồm nhiều đẳng thức bên trong một expression không bị đoán/tách thêm.

Common Math Renderer vẫn là renderer duy nhất. Display mode giúp phân số đọc rõ hơn; dữ liệu lưu trữ không đổi. Công thức dài có một scroll owner nhận focus và nhãn trợ năng. Một regression mới phát hiện inner `.math-markdown__display` giữ overflow trong khi outer span nhận focus; đã bỏ inner scroll để ArrowRight cuộn đúng outer. Router chỉ bổ sung `[data-math-scroll]` vào vùng không bắt phím chuyển bài.

Ở lượt xác minh cuối CD01:

- 1366×768: scrollY 558; đoạn cuối bottom 640,78px, navigation top 699,14px.
- 1920×1080: đoạn cuối bottom 949,22px, navigation top 1011,02px.
- 390×844: đoạn cuối bottom 738,48px, navigation top 771,48px.
- Wheel, Home, End, PageDown đều được kiểm tra ở 100% mặc định; mọi 26 MathML annotations giữ nguyên.

Các test này đã thất bại trước sửa. Không hạ assertion để làm xanh.

## 2. Chứng cứ nguồn và phạm vi toán học

- 8 PDF độc lập, 394 trang; 2 TEX độc lập. Hash nguồn được đọc/kiểm tra lại, không sửa tài liệu gốc.
- 370 source records có cached glyphs được so với glyph thực trong PDF theo ký tự, origin, right edge, font và size. Glyph presence **không chứng minh** bản phiên dịch toán học đúng.
- Inventory cũ được dùng lại: 25.866 node occurrences thuộc các projection đã liệt kê; 18.925 qua cú pháp KaTeX, 6.941 unresolved. Không gọi occurrences là số công thức duy nhất.
- Projection kiểm tra mới có 8.426 record/location keys. 6.941 unresolved candidates còn lại thuộc staging/lịch sử; không phải 6.941 lỗi hiện trên website.
- 7.525 stored nodes thuộc các payload active: 26 CD01 được đối chiếu độc lập; 7.499 chưa được chứng nhận fidelity đầy đủ. Có metadata không render trong con số stored nodes này.
- Fixture độc lập `tests/fixtures/cd01-source-knowledge.json`: 26 biểu thức trong 6 source blocks, một bài Knowledge CD01, trang 4; hash nguồn và block/glyph hash đều kiểm tra lại. Trang nguồn đầy đủ đã được xem trực tiếp. Không tạo badge duyệt biên tập.
- SymPy 1.14.0: 17 identities CD01, trên miền áp dụng đã nêu. Không tuyên bố chứng minh định nghĩa giới hạn hoặc tính khả vi ngoài miền nguồn.
- 3 renderer/layout defects được sửa trong lượt này: ancestor clipping, collection whitespace collapse, nested horizontal scroll/focus mismatch.

Phân loại per-node nằm trong `.audit/quality-recovery/node-audit.json`, lấy từ inventory hiện hữu, không tạo hàng đợi kiểm duyệt thứ hai. Giữ dataset/state, source/hash, location, canonical expression, JSON pointer và error. Bổ sung source glyph hash/route khi ánh xạ trực tiếp được. Những trường chưa có bằng chứng không được tự điền bằng suy đoán. `SOURCE_MATCHED`, `SOURCE_AMBIGUOUS`, `NOT_YET_CHECKED` tách biệt; danh mục còn có conversion/renderer/mapping error và unsupported structure. Không dùng syntax pass để gán source-matched.

Các sửa parser Conversion Recovery trước đó được replay và bảo vệ, không áp dụng lại mù quáng:

- 39 PDF blocks / 64 glyph differential `d`: font prose làm tách `d` khỏi math variable; sửa ownership bằng vị trí glyph và ngữ cảnh tích phân, không broad replacement. Payload candidate chứa `\mathrm{d}` đúng ranh giới. Không chứng nhận toàn bộ công thức xung quanh chỉ vì sửa `d`.
- 7 TEX records: giữ mọi bold formula theo thứ tự, gỡ wrapper `ensuremath`, giữ chỉ số/phép giao trong math, giữ quy tắc tiếng Việt thuần lời ở text. Khôi phục 5 bold items bị bỏ qua; native math 62 → 68, unresolved 4 → 0 trong nguồn CD20–CD23. TEX vẫn độc lập với PDF và còn staged, không nằm trong batch activate PDF.
- Canonical delimiter trong comment không kết thúc công thức sớm. Đây là regression kỹ thuật, không phải một bài học mới.

## 3. Ví dụ fidelity thực tế

Các mẫu CD01 sau **giữ nguyên toán học**, chỉ đổi bố trí:

| Nhóm | Chứng cứ / kết quả |
| --- | --- |
| Phân số | Quy tắc thương giữ `\frac{u'v-uv'}{v^2}`; display mode, không đổi tử/mẫu. |
| Căn | Đạo hàm căn giữ `u'/(2\sqrt{u})` và điều kiện `u>0`. |
| Số mũ | Giữ `(x^n)'=nx^{n-1}` và lũy thừa hàm hợp. |
| Chỉ số / giới hạn | Giữ `x_0`, `h\to0`, hiệu thương; không thay định nghĩa bằng một công thức đơn giản hơn. |
| Điều kiện | Giữ `a>0`, `a≠1`, `u>0`, `u≠0` và chú ý biên của căn. |
| Tiếng Việt + toán | Đoạn cuối về miền căn, `ln|u|`, đạo hàm cấp hai vẫn đủ và theo đúng thứ tự nguồn. |
| Tích phân | Batch trước/sau có bằng chứng glyph riêng: `d` prose tách khỏi `x` hoặc `t` → `\mathrm{d}x` hoặc `\mathrm{d}t` trong đúng math node. |
| Bảng toán | CD15/15.1: semantic HTML, 5 hàng × 6 cột, MathML từng ô và thứ tự đối chiếu payload nguồn. Chưa gọi đây là chứng nhận phiên dịch độc lập mọi ô. |
| Vector | CD28/28.1 và CD32/32.5 được kiểm tra DOM/source association/glyph evidence; không sửa hoặc suy đoán tọa độ từ hình. Chưa cấp blanket source-matched cho toàn bộ vector content. |

## 4. Desktop/mobile, stability và giới hạn

Ma trận Knowledge: 11 routes × 12 viewports = 132 states. CD01, CD08, CD12/12.1, CD13/13.3, CD14/14.8, CD15/15.1, CD17/17.1, CD20/20.1, CD21/21.8, CD28/28.1, CD32/32.5. Bao phủ đạo hàm, phân số, căn, giới hạn, tích phân, mũ/log, lượng giác, dãy số, vector/Oxyz và bảng.

Desktop: 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080. Mobile/tablet/landscape: 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 844×390.

Kiểm tra source edition/block, exact MathML annotations, table dimensions/cells, final meaningful content reachability, không raw LaTeX rò ra prose, không page overflow/JS/KaTeX errors. Các block cuối có Geometry được coi là meaningful content, không nhầm paragraph đứng trước hình là phần cuối.

Back/Forward khôi phục vị trí đọc; ArrowLeft/Right ngoài công thức vẫn chuyển bài; trong công thức cuộn ngang. Menu mobile mở/đóng bằng Escape; practice feedback và progress giữ nguyên qua reload. Reflow 125/150/200% chỉ dùng viewport tương đương, **không phải** true browser zoom certification. Chrome Playwright emulation, không phải chứng nhận thiết bị vật lý.

CLS đo bằng PerformanceObserver khi tải trang, không có scale override. Max initial CLS trong 132 states: **0,159508** ở CD32/1024px; CD12/320px 0,031914. Ba lượt cold-route chẩn đoán CD32 riêng cho 0,000398–0,000413; bốn lượt mô phỏng chuyển từ CD28 tới CD32 cho 0. Chưa tái hiện được spike lớn để có root-cause fix an toàn; còn limitation, không che số đo.

Tự mở tất cả `<details>` trong test tạo thêm layout growth tối đa 0,203804; ghi riêng `programmaticExpansionCLS`, không trộn vào unsolicited initial CLS. Không tuyên bố đạt CLS ≤0,1 mọi trường hợp hoặc production Core Web Vitals.

Ảnh trước/sau đã xem trực tiếp bằng image viewer; DOM assertions được dùng song song, không lấy screenshot similarity làm bằng chứng toán học:

- Before: `.audit/quality-recovery/before/CD01-1366x768.png`, `CD01-390x844.png`.
- After: `.audit/quality-recovery/after/CD01-1366x768-top.png`, `CD01-1366x768-end.png`, `CD01-1920x1080-top.png`, `CD01-390x844-end.png`.
- Small/landscape: `.audit/quality-recovery/matrix/CD01-320x568-end.png`, `CD15-844x390-end.png`.
- Original source full page: `.audit/quality-recovery/source-pages/CD01-p4.png`; chỉ là chứng cứ đọc nguồn, không đưa vào learner UI.

## 5. Bảo toàn và historical baseline

35/35 trường V5.5/V5.6 vẫn exact-match và render hợp lệ: 9 + 26. Thực tế V5.6 đã là `locally-applied-unreviewed` ở đầu công việc, không phải prepared. Không apply/rollback nó. Authorization lịch sử hiện stale; phải tạo preview mới trước thao tác tương lai.

Không sửa Geometry engine/specs, JSXGraph 1.14.2, progress IDs/keys, navigation model hoặc scoring. Candidate Geometry chỉ đổi `knowledgeParent` để khớp exact Knowledge child hash; mọi 30 construction/spec/source identity giữ nguyên.

Geometry compatibility trên learner routes của read-only candidate: **30 hình (10 hình 2D, 20 hình 3D) × 8 viewports = 240 states, exit 0**. 61 source-spec property checks JavaScript đều hợp lệ; kiểm tra source identity, điểm trong khung, nhãn không clipping, responsive size, rotate button thay camera azimuth, zoom/reset và ba lần dispose/remount không tạo duplicate boards. Không gọi 61 kiểm tra này là SymPy; không tuyên bố physical-device hoặc mới chứng nhận touch rotation.

Historical build + verify + `npm.cmd test` chạy trong disposable fixture: **253 pass / 0 fail, exit 0**. Giữ nguyên assertions, phục hồi đúng pre-task source/UI trong bản sao và source-check Git blob đã khớp immutable manifest. Không sửa checker thật/historical manifest/hash/backup/journal. Đây là chứng nhận baseline lịch sử, không thay thế kiểm tra runtime hiện tại.

Root wrappers lịch sử bị ràng buộc byte `package.json`; không tự sửa manifest để làm xanh. Xem bảng kết quả cuối và logs để phân biệt guard refusal với test runtime thực sự được chạy.

Không thấy credential-pattern trong 67 generated report files được quét; không in secret values, không tuyên bố thu hồi token.

## 6. Files

Những file existing mới sửa/tiếp tục trong lượt này:

- `.gitignore`
- `package.json`
- `assets/pdf-knowledge.css`
- `assets/js/components/canonical-math-renderer.js`
- `assets/js/components/pdf-knowledge-renderer.js`
- `assets/js/curriculum.js`
- `scripts/source-first/conversion-recovery.mjs` — bind thêm CSS/Geometry runtime dependencies.
- `scripts/source-first/conversion-release.mjs` — fresh Knowledge + full Geometry QA gates.
- `scripts/source-first/conversion-historical.mjs` — phục hồi UI baseline trong disposable copy.

Thêm:

- `scripts/source-first/knowledge-diagnose.mjs`
- `scripts/source-first/knowledge-qa.mjs`
- `scripts/source-first/knowledge-source-proof.py`
- `scripts/source-first/knowledge-symbolic.py`
- `scripts/source-first/quality-content-audit.mjs`
- `tests/fixtures/cd01-source-knowledge.json`
- `tests/knowledge-presentation.test.mjs`
- `tests/knowledge-quality-browser.test.mjs`
- `tests/knowledge-matrix-browser.test.mjs`
- `tests/knowledge-navigation-browser.test.mjs`
- `tests/knowledge-geometry-browser.test.mjs`
- Báo cáo này.

Các file Conversion Recovery đầu vào vẫn được giữ, không ghi đè thay đổi hợp lệ:

- `assets/js/components/canonical-math.js`
- `scripts/latex-pilot/parser.mjs`
- `scripts/source-first/canonical-adapters.mjs`
- `scripts/source-first/layout-v62.py`
- `scripts/source-first/conversion-recovery.py`
- `scripts/source-first/conversion-preview.mjs`
- `scripts/source-first/conversion-qa.mjs`
- `scripts/source-first/conversion-symbolic.py`
- `tests/conversion-preview.test.mjs`
- `tests/conversion-real-release.test.mjs`
- `tests/conversion-recovery-browser.test.mjs`
- `tests/conversion-recovery.test.mjs`
- `tests/conversion-release.test.mjs`
- `docs/content/conversion-recovery-2026-11-14.md`
- `assets/content/pdf-knowledge/B07C393393BE093FA11B9DA118C5F291FB7DD65C259B6061DBE393E025CCAA62.json`
- `assets/content/geometry/1C355ACC7499307093512953182C9C5DAFEB9C5EDEB413477CBF88C39BE726B2.json`

Audit/log/screenshot artifacts mới nằm trong ignored `.audit/quality-recovery/` và mutable `.audit/conversion-recovery/`. Fresh immutable plan/backup được tạo ở folder nêu bên dưới; lịch sử cũ không bị sửa. `git status --short --untracked-files=all` liệt kê toàn bộ các file chưa commit.

Không sửa trang marketing/registration, tài liệu PDF/TEX gốc hoặc source mathematical values để vừa khung. Redesign-existing-projects skill chỉ được dùng để audit reading width, spacing, focus và document scroll; Sites local-preview hướng dẫn việc kiểm tra và teardown, không tạo/publish Site mới.

## 7. Trạng thái release và kiểm thử cuối

Lượt cuối chạy **tuần tự các suite**, ghi đầy đủ log/actual exit code ở `.audit/quality-recovery/gates.json`, `wrapper-npm.json` và `.audit/conversion-recovery/checks.json`. Các file test trong cùng Node invocation có thể chạy đồng thời nhưng không ghi chung fixture/state. Runtime hashes không thay đổi trong từng gate. Lượt Geometry chẩn đoán trước đó bị từ chối receipt khi CSS đổi giữa chừng; không dùng lượt stale đó làm kết quả cuối. Lượt 240-state cuối đã chạy lại và khớp snapshot.

| Lệnh / suite thực thi | Pass / fail hoặc kết quả | Exit |
| --- | --- | --- |
| `npm.cmd run check` | Source check passed | 0 |
| `npm.cmd run test:conversion` | 15 / 0 | 0 |
| `npm.cmd run test:conversion:browser` / cùng Node entry trong sequential runner | 2 / 0; 264 route/viewport states, 312 corrected-block MathML comparisons | 0 |
| `npm.cmd run test:hosting` | 8 / 0 | 0 |
| `npm.cmd run check:hosting` | Hosting dependency closure passed | 0 |
| Canonical pure tests, explicit name filter | 21 / 0 | 0 |
| LaTeX/pilot/progress/workspace/practice tests | 41 / 0 | 0 |
| Geometry source/property tests, explicit historical-guard exclusions | 51 / 0 | 0 |
| New Knowledge presentation + exact CD01 + matrix + navigation/reflow tests | 7 / 0; 132 matrix states plus exact-route cases | 0 |
| New Geometry compatibility test | 1 / 0; 240 states / 30 figures | 0 |
| Actual fresh-plan interrupted apply/resume/idempotence/rollback + read-only preview | 3 / 0 | 0 |
| CD01 independent fixture + original glyph/hash checks | 26 nodes / 6 blocks; 370 source records | 0 |
| SymPy, isolated environment | 17 CD01 + 4 calculus checks / 0 failed | 0 |
| Disposable historical build + verify + `npm.cmd test` | 253 / 0, assertions unchanged | 0 |
| Root `npm.cmd run verify` | Refused before suite: `Unknown target bytes: package.json` | 1 |
| Root `npm.cmd run test:source-first` | Same immutable-baseline guard | 1 |
| Root `npm.cmd run test:canonical` | Same immutable-baseline guard | 1 |
| Root `npm.cmd run test:mobile` | Same immutable-baseline guard | 1 |
| `git diff --check` | No whitespace errors | 0 |

Current standalone runtime groups total **149 tests passed / 0 failed**, separate from the 253 historical-baseline tests. Không cộng hai baseline thành một chứng nhận. `npm.cmd run test:knowledge:quality` kết thúc **exit 1** vì bốn historical guard refusals vẫn được ghi nhận là lỗi, không bị biến thành success. Những guard refusals không phải số test đã chạy/thất bại; suite đó chưa bắt đầu.

Pure canonical filter và ba Geometry guard exclusions có scope rõ trong `scripts/source-first/conversion-qa.mjs`; không sửa/xóa assertions. Các guard Geometry cũ yêu cầu pre-activation state/dependency bytes, không đúng active release hiện tại. Runtime thật được kiểm tra riêng bằng ma trận, nguồn, DOM, camera/lifecycle và practice. Không tuyên bố đã chạy xanh full legacy browser/mobile suite tại root.

Các lệnh focused có thể chạy lại:

```powershell
npm.cmd run test:knowledge:quality
node scripts/source-first/conversion-qa.mjs
node scripts/source-first/conversion-historical.mjs --restore-source-check
```

Lệnh đầu rebuild preview/gates và **prepare**, không apply. Chạy lại receipt có thể làm plan cũ stale; dùng plan/hash mới trả về, không sửa hash cũ.

## 8. Active state, local preview và fresh plan

Active pointers không đổi:

- Knowledge: `803050D0CEAC942E1C172C48FCCD7FFBB5D21C05407D5001C7110E7FE46B2826`.
- Geometry: `F77647AA90230356DBD52E94CC75BABACDA22FAD0C8B10FF5EEFF872AAF76ECD`.
- Learning overlay: `976076AF726183443F57716EF2D92C50BC4C5AA006BAE2DF034DF494F894C55E`.

Fresh plan: **EBBCB5798F85B5851F32B6307BB218846B0AFF73B37E5FDD0E5BE61344C967CB**, trạng thái **PREPARED_NOT_APPLIED**. Chỉ có hai target: `pdf-knowledge-release.js`, `geometry-activation.js`, đều còn BEFORE. Geometry loader ràng buộc exact Knowledge parent nên không thể đổi Knowledge pointer độc lập mà giữ Geometry child cũ; vì vậy fresh combined plan yêu cầu đủ gate 240 geometry states.

Candidate Knowledge: `B07C393393BE093FA11B9DA118C5F291FB7DD65C259B6061DBE393E025CCAA62`; candidate Geometry parent continuation: `1C355ACC7499307093512953182C9C5DAFEB9C5EDEB413477CBF88C39BE726B2`. Không thay graph/geometry specs và không đưa 7 TEX records staged vào batch PDF này.

Preview read-only đã được kiểm tra HTTP, actual learner math/geometry, private-path rejection và không ghi release pointers. Các server do kiểm thử sở hữu đã đóng. Khởi động lại:

```powershell
cd D:\BienEdu
node scripts/source-first/conversion-preview.mjs
```

- Consolidated preview: http://127.0.0.1:8767/
- Exact CD01 route: http://127.0.0.1:8767/documents.html?grade=12&topic=CD01&section=knowledge&item=1
- Differential candidate: http://127.0.0.1:8767/documents.html?grade=12&topic=CD12&type=12.1&section=knowledge&item=1 — mở source edition C12-CD13-CD14.pdf để đọc nguồn độc lập cũ.

Để xem CSS mới với active data hiện tại, không override release:

```powershell
cd D:\BienEdu
python -m http.server 8000
```

http://localhost:8000/documents.html?grade=12&topic=CD01&section=knowledge&item=1

**Chỉ khi người dùng chủ động chọn áp dụng batch local đã kiểm tra:**

```powershell
node scripts/source-first/conversion-release.mjs apply --authorize EBBCB5798F85B5851F32B6307BB218846B0AFF73B37E5FDD0E5BE61344C967CB --execute
```

Rollback đúng cùng plan:

```powershell
node scripts/source-first/conversion-release.mjs rollback --authorize EBBCB5798F85B5851F32B6307BB218846B0AFF73B37E5FDD0E5BE61344C967CB --execute
```

Backup/immutable manifest: `.content-work/conversion-recovery/EBBCB5798F85B5851F32B6307BB218846B0AFF73B37E5FDD0E5BE61344C967CB/` (`manifest.json`, `before-0.txt`, `before-1.txt`). Journal khi thực thi: `.audit/conversion-recovery/operations.jsonl`; operation lock chỉ tồn tại trong giao dịch. Có dependency/CAS checks, stale-plan rejection, dead-owner lock recovery, partial-state detection, idempotence và reverse-order rollback. Apply/rollback đã được chạy **chỉ trong disposable fixture**; active runtime writes bằng 0.

Final integrity check: 55/55 manifest dependency hashes khớp, hai active pointers còn BEFORE, JSXGraph installed version 1.14.2. Receipt: `.audit/quality-recovery/final-integrity.json`.

Rollback này chỉ phục hồi hai content pointers, không tự hoàn tác CSS/JS của working tree. Source/candidate payload cũ được giữ để phục hồi. Plan cũ `4EAF804C…` vẫn còn nguyên manifest/backup và hash hợp lệ nhưng không còn được dùng sau thay đổi runtime. Không sửa manifest cũ để ép chạy.

## 9. Còn lại / release limitations

1. Chưa đối chiếu độc lập toàn bộ 18.925 syntax-valid occurrences; chỉ 26 CD01 nodes được gắn SOURCE_MATCHED độc lập trong pass này. Các source ambiguities, unsupported extraction và legacy plain-text/graph-label scopes chưa có toàn bộ proof.
2. 6.941 staging/historical unresolved candidates vẫn cách ly. Không tự đoán công thức, fraction bar, radicand, coordinate hoặc source-solution pairing bị thiếu. Chín calculus answer conflicts từng ghi nhận không bị tự sửa để làm xanh.
3. TEX parser candidates cần continuation/mapping riêng nếu sau này muốn activate; không dùng TEX thay nguồn PDF.
4. Spike initial CLS 0,159508 chưa tìm được nguyên nhân tái hiện ổn định; chưa đạt ≤0,1 mọi trường hợp. Không tuyên bố Core Web Vitals hay true browser zoom/physical-device certification.
5. Bốn root historical wrappers vẫn bị immutable-baseline guard chặn; không bỏ guard hoặc cập nhật hash để né. V5.6 authorization cũ stale, cần preview mới nếu thực hiện thao tác khác với fresh conversion plan ở trên.
6. Không có auto-activation hoặc production publication. Kiến thức active chỉ đổi khi người dùng tự chạy lệnh apply đúng plan. Không commit, push hay deploy.
