import nodemailer from 'nodemailer'

interface InvestorPayload {
  id: string
  name: string
  email: string | null
  percentage: number | null
  amount: number | null
  pay_deadline: string | null
  round: number | string
  contractUrl?: string
}

function buildHtml(inv: InvestorPayload, contractUrl: string, storeName: string): string {
  const pct = inv.percentage != null ? inv.percentage.toFixed(2) + '%' : '—'
  const amt = inv.amount != null ? 'NT$ ' + Math.round(inv.amount).toLocaleString() : '—'
  const deadline = inv.pay_deadline ?? '—'

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'PingFang TC','Noto Sans TC',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 36px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">【${storeName}】認股合約通知</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">請查閱您的認股合約書並完成簽署</p>
    </div>
    <div style="padding:32px 36px;">
      <p style="margin:0 0 20px;color:#333;font-size:15px;">親愛的 <strong>${inv.name}</strong>，</p>
      <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.7;">
        感謝您參與 ${storeName} 的認股計畫。以下是您的認股資訊，請詳閱合約書後完成簽署手續。
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px;">
        <tr style="background:#f8f7ff;">
          <td style="padding:12px 16px;border:1px solid #e5e4f5;font-weight:600;color:#4f46e5;width:40%;">認股輪次</td>
          <td style="padding:12px 16px;border:1px solid #e5e4f5;color:#333;">第 ${inv.round} 輪</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border:1px solid #e5e4f5;font-weight:600;color:#4f46e5;">認股比例</td>
          <td style="padding:12px 16px;border:1px solid #e5e4f5;color:#333;">${pct}</td>
        </tr>
        <tr style="background:#f8f7ff;">
          <td style="padding:12px 16px;border:1px solid #e5e4f5;font-weight:600;color:#4f46e5;">認股金額</td>
          <td style="padding:12px 16px;border:1px solid #e5e4f5;color:#333;font-weight:700;">${amt}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border:1px solid #e5e4f5;font-weight:600;color:#4f46e5;">繳款期限</td>
          <td style="padding:12px 16px;border:1px solid #e5e4f5;color:#e11d48;font-weight:600;">${deadline}</td>
        </tr>
      </table>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${contractUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          查看並下載合約書
        </a>
      </div>
      <p style="margin:0;color:#888;font-size:13px;line-height:1.7;border-top:1px solid #eee;padding-top:20px;">
        如有任何問題，請與我們聯繫。<br>
        此為系統自動發送，請勿直接回覆此信件。
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (!gmailUser || !gmailPass) {
    return Response.json({ error: 'GMAIL_USER or GMAIL_APP_PASSWORD not set' }, { status: 500 })
  }

  const { investors, contractUrl, storeName, replyTo } = await request.json() as {
    investors: InvestorPayload[]
    contractUrl: string
    storeName: string
    replyTo?: string
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  const results: { id: string; name: string; success: boolean; reason?: string }[] = []

  for (const inv of investors) {
    if (!inv.email) {
      results.push({ id: inv.id, name: inv.name, success: false, reason: '未填寫 Email' })
      continue
    }
    const url = inv.contractUrl || contractUrl
    if (!url) {
      results.push({ id: inv.id, name: inv.name, success: false, reason: '未上傳合約' })
      continue
    }
    try {
      await transporter.sendMail({
        from: `"${storeName}" <${gmailUser}>`,
        ...(replyTo ? { replyTo } : {}),
        to: inv.email,
        subject: `【${storeName}】認股合約書 — ${inv.name}`,
        html: buildHtml(inv, url, storeName),
      })
      results.push({ id: inv.id, name: inv.name, success: true })
    } catch (err) {
      results.push({ id: inv.id, name: inv.name, success: false, reason: String(err) })
    }
  }

  return Response.json({ results })
}
