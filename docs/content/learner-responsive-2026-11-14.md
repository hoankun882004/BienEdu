# BienEdu — Global learner responsive layout & roadmap navigation

Ngày 2026-11-14. Local UI-only change; no content activation, commit, push or deployment.

**Trạng thái: UI implementation/automated layout verification completed; overall project QA PARTIAL.** Không còn lỗi UI mới đã xác nhận trong ma trận đã chạy. Active mathematical defects và historical release-baseline incompatibility vẫn được báo FAIL đúng phạm vi bên dưới.

## Baseline và nguyên nhân

Working tree đầu nhiệm vụ sạch; Git HEAD và SHA-256 của toàn bộ tracked files được lưu tại `.audit/learner-ui/initial.json`. Không có AGENTS.md áp dụng trong checkout hoặc thư mục cha được kiểm tra. Đã đọc báo cáo stabilization V2; các lỗi toán học active được giữ tách biệt khỏi việc sửa UI.

Khung cũ có nhiều tầng giới hạn độc lập: workspace tối đa 100rem, PDF reading 68rem, nội dung paragraph 74ch, example 66rem, method 54rem, practice card 58rem. Hai tầng padding cộng thêm khoảng trống. Desktop ngoài Knowledge còn giữ `height:100dvh`, `overflow:hidden` và các reader có overflow-y riêng; footer cố định/sticky không phù hợp tài liệu dài. Rules rải ở styles.css và override Knowledge-only trong pdf-knowledge.css tạo scroll ownership khác nhau theo section.

Đo bằng Chromium/Playwright ở browser scale 1 (CSS px, không phải screenshot suy đoán):

| CD28 / 28.1 | Trước: main | Trước: reading | Trước: paragraph | Sau: main/reading | Sau: paragraph |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1024px | 1009 | 1009 | 760.36 | 1009 | 935.34 |
| 1366px | 1119 | 1088 | 819.89 | 1127 | 1029.41 |
| 1920px | 1368 | 1088 | 864.41 | 1376 | 1268.41 |
| 390px | 375 | 375 | 323.41 | 375 | 323.41 |

15px khác viewport là scrollbar document thật, không phải cột bị mất. Sidebar desktop 14rem (224px); dưới 1121px dùng phase navigation sẵn có. Workspace giữ trần sẵn có 100rem/1600px để không kéo bài học vô hạn trên màn hình lớn. Không giảm font, CSS zoom hay transform scaling.

Nút “Trước” hiện hữu dùng history theo yêu cầu UX cũ; không phải đường về catalog. Topic detail có link roadmap nhưng lesson header không có. Vì thế direct URL/reload/external entry thiếu một action về lộ trình độc lập.

## Sửa đổi

- Shared `roadmapLinkMarkup()` trong curriculum.js, dùng chính `routeUrl()` và currentGradeId. Destination là `documents.html?grade=12` cho learner lớp 12, bỏ topic/type/section/item/exam/question, không gọi history.back. Link semantic, 44px target, màu BienEdu blue, focus ring; có ở Knowledge cấp topic, workspace mọi section, final exam, topic detail và unavailable lesson. Nút Trước/Về chuyên đề không bị thay.
- `learning-v6.css`: shared document layout cho Knowledge, methods, examples/solutions, practice và exam. Main `min-width:0`, width fluid, padding clamp; footer ở normal flow sau nội dung. Không ép lesson vào một màn hình. Menu lock vẫn giữ; sidebar sticky khi đủ rộng, ẩn đúng breakpoint cũ trên mobile/tablet; phase controls vẫn dùng được.
- `pdf-knowledge.css`: bỏ Knowledge-only document shell, chuyển ownership sang shared CSS; reading dùng 100% main, bỏ trần 74ch với các đoạn toán hỗn hợp. Không đụng canonical nodes/LaTeX/source renderer logic.
- Canonical display wrapper giữ local horizontal overflow; inner wrapper không làm scroll owner thứ hai. Tables giữ local scroll/focus sẵn có. Arrow navigation loại trừ vùng math/table/graph/geometry tương tác, không nhảy lesson khi đang thao tác chúng.
- `prepareLessonScrollRegions()` chỉ bổ sung tabindex/role/label cho các scroll regions trong stage vừa render, không parse lại toán, không gọi lại KaTeX hay quét cả trang. Các vùng PDF đã có `data-math-scroll` được giữ nguyên, nested wrappers không nhận focus trùng.
- Visual inspection phát hiện selector numbered-step grid đang áp nhầm lên bullet Phân tích trong lời giải mở rộng. Override scoped trả bullet về block prose; font phân tích 15px, chú giải bước 14px, công thức 16.8px. Assertion mới kiểm tra bullet không bị chia vào cột 1.7rem, không chỉ kiểm tra scrollbar toàn trang.
- JSXGraph ResizeObserver sẵn có đã được kiểm tra, không tạo engine khác hay sửa graph/geometry specs. Không thêm ảnh crop hoặc thư viện.

Skill redesign-existing-projects được dùng cho audit-first và targeted changes theo stack hiện tại; các gợi ý đổi font/motion/decorations không áp dụng vì người dùng yêu cầu giữ identity. Sites chỉ dùng local QA trên checkout hiện hữu, không đăng ký Site mới.

## Route inventory và phạm vi

Discovery chạy trong browser qua đúng import map, getters, registry, createLessonSlides và seed `PRACTICE_V15` như runtime:

- 39 topic overview routes CD01–CD39.
- 167 actual Knowledge slide routes.
- 173 method/how-to routes.
- 2293 example routes (lời giải mở khi có).
- 322 practice routes: **85 câu thực hành thực tế và 237 unavailable states** runtime có hỗ trợ; không gọi chúng là 322 bộ bài tập đã xuất bản.
- Tổng **2994 unique URLs**, thuộc 28 chuyên đề có nội dung học cùng 39 topic overviews. 98 exercise types không có learner reading/approved content/examples được ghi unavailable, không tự tạo nội dung. CD23–CD27 và CD34–CD39 chỉ có topic overview hiện hữu, không có learner lesson trong dataset hiện tại.

Inventory chi tiết: `.audit/learner-ui/routes.json`. Native Geometry được kiểm tra theo 30 existing source-mapped records; semantic variation renderer có sẵn nhưng `graphActivation` đang null, không bịa một active variation route. PDF knowledge tables có learner routes thật và được kiểm tra.

## Verification

Không coi candidate pass là active pass; guard lịch sử không bị chỉnh để chạy trên baseline khác.

| Suite | Node tests | Pass | Fail | Exit | Route/viewport scope |
| --- | ---: | ---: | ---: | ---: | --- |
| `node --test --test-concurrency=1 tests/learner-responsive-browser.test.mjs` | 4 | 4 | 0 | 0 | 2994 URLs × 1366×844 và 390×844 = 5988 states; 8 representative routes × 16 sizes = 128 states; exam CD20 × 6 sizes; independent navigation/progress/score tests |
| `npm.cmd run check` | — | — | — | 0 | Source check: 71 runtime JS, 7 HTML entries |
| `npm.cmd run verify` | 0 executed | — | — | 1 | Historical publication guard stops before child suites: `Unknown target bytes: package.json` |
| `npm.cmd run qa:current` | 155 technical | 155 | 0 technical | 1 overall | All 11 technical gates pass; actual active data still contains 4 pre-existing radical-index conversion defects |
| `npm.cmd run qa:candidate` | 155 | 155 | 0 | 0 | Fresh read-only candidate QA on current UI; input fingerprint covers 656 files |
| `npm.cmd run qa:historical` | 253 | 243 | 10 | 1 | Isolated replay at current HEAD encounters historical canonical dependency mismatch; no active writes |
| `git diff --check` | — | — | — | 0 | Reviewable local diff, no whitespace errors |

16 representative viewports: 1024×768, 1280×800, 1366×768, 1440×900, 1600×900, 1920×1080; 320×568, 360×800, 375×812, 390×844, 414×896, 430×932, 768×1024; viewport-based reflow 1092×614 / 910×512 / 683×384 (125/150/200% equivalent). All use `visualViewport.scale === 1`. Bulk route scanning uses responsive CSS viewports; a separate 390px test uses mobile/touch emulation. No physical-device certification.

5988 route states have zero JS exceptions, KaTeX errors or failed HTTP asset responses. All require an accessible direct roadmap destination, content within the viewport, no unintended clipped content containers, no nested vertical reader, and footer after full content. Expanded examples additionally require prose-style analysis bullets. Roadmap click/Enter after direct entry/reload, Back/Forward, Next and practice state reload are exercised separately with the shared component; not falsely described as 5988 independent browser-history experiments.

Active QA separately reran 132 Knowledge states, 264 conversion states / 344 corrected-block MathML comparisons, 30 Geometry records × 8 sizes = 240 states (source association, point/label bounds, camera controls, zoom/reset, dispose/remount), public-only hosting and 12 controlled CLS runs. Some compatibility gates explicitly use the read-only candidate server, as in the existing QA architecture; the new 5988-state UI suite uses actual active learner routes. Candidate success must not be described as active data being fixed.

Candidate reran the same gates sequentially and passed. Repeated active/candidate runs are not counted as additional unique lessons. Focused groups retain the existing pure canonical tests and geometry-property filter; historical activation assumptions are not weakened to certify the current runtime. KaTeX syntax success is not mathematical source certification.

Practice/exam checks use disposable browser storage, not the user's existing profile. CD20 final exam is unlocked with actual stable unit IDs, answered using the existing engine's correct indices, scored 20/20, and remains 20/20 after reload. This is not a claim that every final-exam question bank has independent source certification.

32 representative screenshots (8 routes × desktop/mobile × top/end) plus baseline screenshots are stored locally. Actual inspected examples include CD01 end, CD28 vector desktop/mobile, a trigonometric table, an expanded CD13 solution and native 3D geometry. Screenshots supplement programmatic assertions, not mathematical proof.

Đã thực thi `npm.cmd run check` (exit 0); `npm.cmd run verify` (exit 1, `Unknown target bytes: package.json` tại immutable publication guard, chưa chạy test suite con). package.json không bị sửa bởi nhiệm vụ UI này.

Artifacts riêng của nhiệm vụ: `.audit/learner-ui/`. Các mutable QA receipts trước nhiệm vụ được sao giữ tại `previous-qa/` trước khi rerun; immutable manifests/backups/journals không bị sửa. Các phép đo “125/150/200%” là viewport reflow tương đương, không gọi là điều khiển zoom thật hoặc chứng nhận thiết bị vật lý.

Full logs/exits: `final-browser.log`, `qa-current.log`, `qa-candidate.log`, `qa-historical.log`, `check.log`, `verify.log`, `diff-check.log`, `exits.json`. Historical detailed output remains `.audit/conversion-recovery/historical-restored.log`; diagnosis `.audit/learner-ui/historical-diagnosis.json`. PowerShell runner exits and child-suite exits are recorded separately; a finished orchestration process is not itself a claim that every child passed.

### Remaining issues / scope limits

1. Active data retains four confirmed radical-index blocks (five mathematical expressions) from stabilization V2. `qa:current` has all technical gates passing but must stay overall nonzero until a separately authorized mathematical release. No such operation is permitted or performed in this UI task.
2. `verify` fails its historical publication guard at package.json before running child suites. package.json has exactly its pre-task bytes; the guard was not bypassed.
3. `qa:historical` reports **243/253 pass, 10 fail**, not the old report's 253/253. Six failures are in content-v61, one graph-engine-v58 and three release-v6 tests. One parent status is CONFLICT instead of ACTIVE; the others report stale Canonical Math dependency or consequently do not reach their intended injected interruption/lock checks. V6/V6.1/V6.2 manifests expect `assets/js/components/canonical-math.js` SHA-256 `2913927182430534D4E423609B540E65E3E994070E83D08A9195CF35A768B433`; both **initial workspace** and final file hash are `52BFD25D649D0F74A904E556DB6BD64B233A58E1D9E5792EF5931E337ADDF1C8`. Thus this canonical mismatch existed before the UI edits. The historical runner restores current Git HEAD files, which now include the newer canonical implementation; it does not reconstruct that older dependency version. A version-pinned disposable baseline is needed for a faithful old-release replay. No assertions, old hashes, manifests, backups or Common Renderer were changed to force success. This is not evidence that the current UI failed its independent tests, but historical replay remains unresolved.
4. Eleven topics / 98 types have no learner content in the actual dataset. Their overview/unavailable states are reported honestly; no missing Knowledge/examples/practice was invented. Semantic variation-table activation is absent (`graphActivation=null`), so no active variation route is falsely claimed tested.
5. Browser verification uses installed Chrome/Chromium, not Safari/Firefox or physical mobile devices. Reflow is accurately labeled equivalent viewport testing. No source-wide mathematical certification is claimed. Historical CLS spike 0.1595084587 remains unresolved; current controlled 12-run maximum is 0.0090622372, not a field Core Web Vitals claim.

## Exact changed files

```text
.gitignore
assets/js/curriculum.js
assets/learning-v6.css
assets/pdf-knowledge.css
tests/helpers/learner-routes.mjs
tests/learner-responsive-browser.test.mjs
docs/content/learner-responsive-2026-11-14.md
```

Không có file runtime/content mới, không đổi package dependencies. Old authorization B1DE… và code rollback B8BF… không được tái sử dụng sau khi UI dependency hashes đổi. Không sửa old manifest/hash; muốn chạy content release sau này cần fresh QA/preview/authorization. Nhiệm vụ này không chuẩn bị hoặc apply batch toán học mới.

`.gitignore` chỉ thêm `.audit/learner-ui/` để log, before-code snapshots và browser screenshots không bị đưa vào Git; evidence vẫn có trên disk, không bị xóa.

Final protection check: 3493 initially tracked files unchanged byte-for-byte, only the four listed existing UI/ignore files changed. All 35 V5.5/V5.6 corrected fields remain exact-after through the learner loader. Candidate QA's 656 input hashes and runtime hashes match the current filesystem. The old B1DE… content manifest still has its original valid self-hash and `PREPARED_NOT_APPLIED` state, but its UI dependencies are now stale; no bypass or content operation was performed. Details: `.audit/learner-ui/protection.json`.

## Local preview

```powershell
cd D:\BienEdu
npm.cmd start
```

- <http://localhost:3000/documents.html?grade=12>
- <http://localhost:3000/documents.html?grade=12&topic=CD01&section=knowledge&item=1>
- <http://localhost:3000/documents.html?grade=12&topic=CD28&type=28.1&section=knowledge&item=1>
- <http://localhost:3000/documents.html?grade=12&topic=CD13&type=13.1&section=example&item=1>
- <http://localhost:3000/documents.html?grade=12&topic=CD20&type=20.1&section=practice&item=1>

Dùng cùng origin/port khi kiểm tra progress; không di chuyển storage giữa localhost/127.0.0.1/port khác. Để dùng Python như workflow cũ: `python -m http.server 8000 --bind 127.0.0.1`, rồi mở cùng paths tại port 8000.

Đã khởi động chính `npm.cmd start` và xác nhận HTTP 200 cho roadmap, CD28 Knowledge và runtime JS/CSS; bytes trả về khớp file mới trên disk. Receipt `.audit/learner-ui/preview.json`. Owned server đã được dừng sau QA theo quy trình local-only; chạy lại lệnh trên để mở preview.

## Final safety status

- Active content pointers and all existing content-addressed payloads unchanged.
- Mathematical candidate not applied; old authorization not reused.
- Student progress keys, stable IDs, answers and scoring implementation unchanged; regression checks pass in isolated browser storage.
- Original PDF/TEX files, V5.5/V5.6 fields and native Geometry specs unchanged.
- Historical immutable records preserved; failed assertions retained and failures reported.
- No Git reset, commit, push or production deployment. Only the seven listed files belong to this task's reviewable diff.
