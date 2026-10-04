FROM python:3.11-slim

WORKDIR /app

# 安裝基本依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY . .

# 設定環境變數
ENV PYTHONUNBUFFERED=1

# 啟動命令（純 Python 進程）
CMD ["python", "bot.py"]
