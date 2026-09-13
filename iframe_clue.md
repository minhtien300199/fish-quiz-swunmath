## Giá trị thực tế


| Viewport                      | iframe (W × H) |
| ----------------------------- | -------------- |
| 1920 × 1080                   | 1588 × 810     |
| 1920 × 969 (Chrome maximized) | 1588 × 711     |
| 1600 × 900                    | 1270 × 650     |
| 1366 × 768                    | 1038 × 532     |
| 1280 × 720                    | 953 × 490      |


Kích thước này gồm cả `border: 1px` mỗi bên (box-sizing border-box), vùng vẽ thật bên trong nhỏ hơn 2px mỗi chiều.

## Hai điểm đáng lưu ý

`#iframe-wrap` dùng `height: 100%`, mà percentage height tính theo chiều cao content của cha, không trừ phần header "Game Challenge" (32px + `mb-6` 24px). Nên iframe **tràn khỏi** `game-root` **56px**. Cộng với `height: 89%`, khung game mất khoảng 11% chiều cao mà không dùng vào việc gì.

Hệ quả: khi viewport height dưới ~625px, khung ngoài (`overflow-auto`) sẽ xuất hiện scrollbar dọc.