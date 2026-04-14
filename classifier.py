"""
分類引擎 — 關鍵字比對，無需 AI API
"""

# 類別定義：关键字列表（全小寫）
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "食": [
        "食", "飲食", "食物", "吃飯", "餐",
        "早餐", "午餐", "晚餐", "消夜", "宵夜", "早午餐", "下午茶",
        "便當", "便利商店", "超商", "7-11", "711", "全家", "萊爾富", "ok",
        "全聯", "美廉社", "家樂福", "超市", "grocery", "groceries", "買菜", "菜市場",
        "飲料", "咖啡", "奶茶", "珍奶", "手搖",
        "餐廳", "火鍋", "燒烤", "麵", "飯", "點心", "零食",
        "外送", "foodpanda", "ubereats", "food",
        "牛排", "壽司", "拉麵", "義大利", "速食", "麥當勞", "肯德基",
        "漢堡", "pizza", "炸雞", "滷肉", "涼麵", "豆漿", "饅頭",
        "蛋糕", "餅乾", "糖果", "巧克力", "冰淇淋", "shaker",
        "starbucks", "星巴克", "cama", "85度c", "路易莎",
        "茶葉蛋", "蛋", "水煮蛋",
    ],
    "衣": [
        "衣", "衣服", "褲子", "裙子", "上衣", "下著", "外套", "大衣", "羽絨",
        "鞋子", "鞋", "球鞋", "高跟鞋", "涼鞋", "拖鞋",
        "包包", "包", "皮包", "後背包", "側背包",
        "帽子", "圍巾", "手套", "配件", "飾品", "項鍊", "手環", "耳環",
        "手錶", "眼鏡", "太陽眼鏡",
        "zara", "uniqlo", "h&m", "gap", "lv", "gucci", "nike", "adidas",
        "puma", "new balance", "converse",
    ],
    "住": [
        "住", "房租", "租金", "月租", "押金",
        "水費", "電費", "瓦斯", "天然氣", "網路", "寬頻",
        "電話費", "手機費", "門號", "訂閱",
        "管理費", "停車費", "停車場", "車位",
        "修繕", "維修", "裝潢", "油漆",
        "家具", "ikea", "桌子", "椅子", "床", "沙發", "冰箱", "洗衣機",
        "日用品", "清潔劑", "洗碗精", "洗衣粉", "洗髮", "沐浴",
        "衛生紙", "紙巾", "保養品",
        "好市多", "costco", "大賣場", "家樂福",
    ],
    "行": [
        "行", "交通", "油錢", "加油", "汽油", "油費",
        "捷運", "mrt", "悠遊卡", "一卡通", "icash",
        "公車", "公交", "bus",
        "計程車", "uber", "taxi", "滴滴",
        "高鐵", "台鐵", "火車", "客運",
        "機票", "飛機", "航空", "機場",
        "停車", "過路費", "etag", "高速公路", "國道",
        "保險", "車險", "汽車保養", "車牌", "驗車",
        "gogoro", "電動車", "scooter",
    ],
    "育": [
        "育", "書", "書籍", "雜誌", "漫畫",
        "課程", "補習", "學費", "教育", "培訓", "學習",
        "考試", "報名費", "證照",
        "文具", "參考書", "筆記本", "文具用品",
        "udemy", "coursera", "skillshare",
        "幼兒園", "托嬰", "安親班",
    ],
    "樂": [
        "樂", "電影", "電影票", "cinema", "威秀", "國賓",
        "遊戲", "game", "steam", "nintendo", "ps5",
        "旅遊", "旅行", "旅費", "住宿", "飯店", "民宿", "airbnb",
        "景點", "門票", "樂園", "博物館",
        "ktv", "karaoke",
        "netflix", "disney+", "apple tv", "youtube premium",
        "spotify", "kkbox", "apple music",
        "gym", "健身", "健身房", "重訓", "瑜伽",
        "娛樂", "玩具", "模型",
        "禮物", "生日", "紀念", "賀禮",
        "唱片", "演唱會", "音樂祭", "展覽",
        "按摩", "spa", "美甲", "美髮",
    ],
}

CATEGORY_ICONS = {
    "食": "🍜", "衣": "👗", "住": "🏠",
    "行": "🚗", "育": "📚", "樂": "🎮", "其他": "💰",
}

DEFAULT_CATEGORY = "其他"
VALID_CATEGORIES = list(CATEGORY_KEYWORDS.keys()) + [DEFAULT_CATEGORY]


def classify(text: str) -> str:
    """根據備註文字自動分類"""
    text_lower = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return category
    return DEFAULT_CATEGORY


def is_valid_category(cat: str) -> bool:
    return cat in VALID_CATEGORIES


def get_icon(category: str) -> str:
    return CATEGORY_ICONS.get(category, "💰")
