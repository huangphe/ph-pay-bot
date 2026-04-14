FROM python:3.11-slim

WORKDIR /app

# 安裝基本依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY . .

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

# 啟動命令
CMD ["uvicorn", "bot:app", "--host", "0.0.0.0", "--port", "10000"]
