**Thêm 1 mode no math nhưng không thay đổi logic cũ của Math (Game type = 0)**

**Must:**
- Đọc từ Param: gameType (check lower/upper case) = 1 (no math), 0 (math) (default = 0)
- Do not change any logic with gameType!=1
- Không gọi bất kì API nào ngoài lấy Question.

**Requirement**
Trong NO_MATH mode, thì: Modify game (vẫn giữ logic cũ nếu như gameTyp = 0),
Trong chế NO_MATH thì phải bắt đủ 5 con cá hoặc mất 3 mạng mới hoàn thành game.

**Additional Requirements**
- Không thay đổi logic cũ của Math (Game type = 0)
- Thêm logic để chơi khi game type = 1
    - Thay vì show Quiz scene thì show mini game scene bằng frame là sprite sheet chạy từ 1 tới 4 và repeat: 
        - assets\ui_fishing_minigame\mini_game_0001.png
        - assets\ui_fishing_minigame\mini_game_0002.png
        - assets\ui_fishing_minigame\mini_game_0003.png
        - assets\ui_fishing_minigame\mini_game_0004.png
    - Show cá này có thể di chuyển đầu tới cuối thanh trượt (đây là asset cá trong mini game):
        - assets\ui_fishing_minigame\mini_game_fish.png
    - Tạo 1 thanh trượt để điều khiển theo trục ngang vị trí của cá (có 3 level easy, medium, hard): điệu khiển bằng nút space
        - ![alt text](assets/ui_fishing_minigame/fish_bar_easy.png)
        - ![alt text](assets/ui_fishing_minigame/fish_bar_hard.png)
        - ![alt text](assets/ui_fishing_minigame/fish_bar_medium.png)
    - Thanh Progress bar từ 0 tới full, đặt chồng lên (vì đã layout position rồi) (số từ 0001 tới 0074):
        - assets\ui_fishing_minigame\progress\progres_bar_0001.png
        - Làm thanh chạy từ 0001 tới 0074 trong vòng 3 giây khi giữ thanh trượt ở vị trí cá
    - Hoàn thành khi progress chạy tới full là câu xong. trong vòng 10 giây thì phải hoàn thành, không thì sẽ không câu được, và cá sẽ chạy (Fish was escaped)
