**Thêm 1 mode no math nhưng không thay đổi logic cũ của Math (Game type = 0)**

**Must:**
- Đọc từ Param: gameType (check lower/upper case) = 1 (no math), 0 (math) (default = 0)
- Do not change any logic with gameType!=1
- Không gọi bất kì API nào ngoài lấy Question.

**Requirement**
Trong NO_MATH mode, thì: Modify game (vẫn giữ logic cũ nếu như gameTyp = 0),

Game có 5 level
2 Easy levels
1 Medium level
2 Hard levels
Change bằng cách Spawn thêm Rắn và di chuyển nhanh hơn.
