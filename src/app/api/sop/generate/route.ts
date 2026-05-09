import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })

  const { scheduleData, logData, expenseData, vendorData } = await request.json()

  const prompt = `你是一個開店建置顧問。以下是一間雞肉飯店的建置資料，請分析並產出 3-5 筆 SOP 知識卡片，每筆都要是具體實用的建置經驗。

資料：
建置排程：${JSON.stringify(scheduleData)}
施工異常記錄：${JSON.stringify(logData)}
費用記錄：${JSON.stringify(expenseData)}
廠商資料：${JSON.stringify(vendorData)}

請用以下 JSON 格式回應，只回 JSON 不要其他文字：
[
  {
    "title": "知識標題",
    "trade": "plumbing|carpentry|masonry|equipment|admin|painting|signage|general",
    "type": "spec|flow|pit|vendor|admin|other",
    "tags": ["標籤1", "標籤2"],
    "content": "內容（可用【小標題】和- 清單格式）"
  }
]

規則：
- pit（踩坑）：從異常日誌找實際踩過的坑和解法
- vendor（廠商）：從廠商資料整理付款和配合注意事項
- flow（流程）：從排程整理工程順序重要注意事項
- 每筆內容具體實用，不要泛泛而談
- 繁體中文`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const clean = text.replace(/```json|```/g, '').trim()
    const cards = JSON.parse(clean)
    return Response.json({ cards })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
