import urllib.request
import json

url = "https://tgsjxkleioivufbozfgw.supabase.co/rest/v1/expenses?amount_twd=in.(687,210,84,520)&select=*&order=created_at.desc"
req = urllib.request.Request(url, headers={
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnc2p4a2xlaW9pdnVmYm96Zmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODQ2NTksImV4cCI6MjA5MTU2MDY1OX0.i3YOmWXHNAQ1zkeHpdy7TZUPwTwj-O1jzKueDTMOu0s',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnc2p4a2xlaW9pdnVmYm96Zmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODQ2NTksImV4cCI6MjA5MTU2MDY1OX0.i3YOmWXHNAQ1zkeHpdy7TZUPwTwj-O1jzKueDTMOu0s'
})

try:
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    for row in data:
        print(f"[{row['id']}] {row['note']} - {row['amount_twd']} - raw created_at: {row['created_at']}")
except Exception as e:
    print(e)
